export type InspectGatewayResult = {
  status: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  paymentRequired?: unknown;
  cardPayment?: unknown;
  /** Public challenge only; inspect does not issue tokens or authorize payment. */
  mppChallenge?: string;
  paymentParseError?: string;
};

export async function inspectGatewayUrl(
  url: string,
  method = "GET",
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<InspectGatewayResult> {
  const response = await fetchFn(url, { method });
  const bodyText = await response.text();
  let body: unknown = bodyText || null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    /* plain text */
  }

  const result: InspectGatewayResult = {
    status: response.status,
    url,
    method,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };

  if (response.status === 402) {
    const challenge = response.headers.get("WWW-Authenticate");
    if (challenge && /^Payment\s/i.test(challenge)) result.mppChallenge = challenge;
    const cardHeader = response.headers.get("Launa-Card-Payment");
    try {
      result.cardPayment = cardHeader ? JSON.parse(cardHeader) : undefined;
    } catch {
      /* preserve raw header */
    }
    if (
      !result.cardPayment &&
      body &&
      typeof body === "object" &&
      "card_payment" in body
    )
      result.cardPayment = body.card_payment;
    const hasX402 =
      response.headers.has("payment-required") ||
      Boolean(body && typeof body === "object" && "x402Version" in body);
    if (!hasX402) return result;
    try {
      const { x402Client, x402HTTPClient } = await import("@x402/fetch");
      const parser = new x402HTTPClient(new x402Client());
      result.paymentRequired = parser.getPaymentRequiredResponse(
        (name) => response.headers.get(name),
        body,
      );
    } catch {
      result.paymentParseError =
        "Unable to decode x402 requirements; inspect the raw response.";
    }
  }

  return result;
}

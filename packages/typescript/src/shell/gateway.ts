export type InspectGatewayResult = {
  status: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  paymentRequired?: unknown;
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
    const { x402Client, x402HTTPClient } = await import("@x402/fetch");
    const parser = new x402HTTPClient(new x402Client());
    result.paymentRequired = parser.getPaymentRequiredResponse(
      (name) => response.headers.get(name),
      body,
    );
  }

  return result;
}

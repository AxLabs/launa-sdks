import { describe, expect, it, vi } from "vitest";
import { inspectGatewayUrl } from "./gateway.js";
import { formatHumanOutput } from "./format-human.js";

describe("payment inspection", () => {
  const card = { enabled: true, currency: "usd", amount_minor: "100" };
  it("discovers a card-only 402 without attempting to pay or parse it as x402", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ card_payment: card }), {
          status: 402,
          headers: { "Launa-Card-Payment": JSON.stringify(card) },
        }),
      );
    const result = await inspectGatewayUrl(
      "https://example.com/get",
      "GET",
      fetcher,
    );
    expect(result.cardPayment).toEqual(card);
    expect(result.paymentRequired).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(formatHumanOutput(result, "x402", "inspect")).toContain(
      "Cards via Stripe Checkout",
    );
  });
  it("preserves unknown 402 responses", async () => {
    const result = await inspectGatewayUrl(
      "https://example.com/get",
      "GET",
      async () => new Response("payment needed", { status: 402 }),
    );
    expect(result.body).toBe("payment needed");
    expect(result.paymentRequired).toBeUndefined();
  });
  it("shows card terms alongside valid x402 requirements", async () => {
    const paymentRequired = {
      x402Version: 2,
      resource: {
        url: "https://example.com/get",
        description: "API",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          amount: "10000",
          asset: "0x0000000000000000000000000000000000000001",
          payTo: "0x0000000000000000000000000000000000000002",
          maxTimeoutSeconds: 60,
        },
      ],
    };
    const discovery = {
      error: "payment_required",
      message: "Choose cryptocurrency via x402 or card via Stripe Checkout.",
      payment_options: [
        { id: "crypto", protocol: "x402", requirements_header: "PAYMENT-REQUIRED" },
        { id: "card", protocol: "launa-checkout", flow_field: "card_payment_flow" },
      ],
      card_payment: card,
      card_payment_flow: {
        protocol: "launa-checkout",
        version: 1,
        operation_header: "Launa-Payment",
        token_header: "Launa-Payment-Token",
      },
    };
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(discovery), {
        status: 402,
        headers: {
          "payment-required": Buffer.from(
            JSON.stringify(paymentRequired),
          ).toString("base64"),
          "launa-card-payment": JSON.stringify(card),
        },
      }),
    );
    const result = await inspectGatewayUrl(
      "https://example.com/get",
      "GET",
      fetcher,
    );
    expect(result.paymentRequired).toEqual(paymentRequired);
    expect(result.cardPayment).toEqual(card);
    expect(result.body).toEqual(discovery);
    expect(result.paymentParseError).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

it("reports MPP separately without authorizing or retrying a payment", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 402,
    headers: { "WWW-Authenticate": 'Payment id="fixture", method="stripe", intent="charge"' } }));
  const result = await inspectGatewayUrl("https://example.com/get", "GET", fetcher);
  expect(result.mppChallenge).toContain('method="stripe"');
  expect(result.paymentRequired).toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(formatHumanOutput(result, "inspect", "url")).toContain("MPP payment challenge");
});

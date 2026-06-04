import { describe, expect, it, vi } from "vitest";
import { BuyerClient, createPaymentFetch, payAndFetch } from "./index.js";
import { BuyerDepsError } from "./types.js";

vi.mock("@x402/fetch", () => ({
  x402Client: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
  })),
  x402HTTPClient: vi.fn().mockImplementation(() => ({
    processResponse: vi.fn(async () => ({ kind: "success" })),
  })),
  wrapFetchWithPayment: vi.fn((_fetch, _client) => {
    return vi.fn(async (url: string, init?: RequestInit) => {
      return new Response(JSON.stringify({ url, method: init?.method ?? "GET" }), { status: 200 });
    });
  }),
}));

vi.mock("@x402/evm", () => ({
  ExactEvmScheme: vi.fn().mockImplementation((signer) => ({ signer, kind: "exact" })),
  BatchSettlementEvmScheme: vi.fn().mockImplementation((signer) => ({ signer, kind: "batch" })),
  toClientEvmSigner: vi.fn((signer) => signer),
}));

describe("BuyerClient", () => {
  it("registers ExactEvmScheme and wraps fetch", async () => {
    const { x402Client } = await import("@x402/fetch");
    const { ExactEvmScheme } = await import("@x402/evm");
    const signer = { address: "0x1" };
    const client = await BuyerClient.create(signer);
    const res = await client.fetch("https://gateway.test/v1/foo");
    expect(res.status).toBe(200);
    const x402 = vi.mocked(x402Client).mock.results[0]?.value;
    expect(x402.register).toHaveBeenCalledWith("eip155:*", expect.objectContaining({ kind: "exact" }));
    expect(ExactEvmScheme).toHaveBeenCalledWith(signer);
  });

  it("pay returns response and payment metadata", async () => {
    const client = await BuyerClient.create({ address: "0x1" });
    const result = await client.pay({ url: "https://gateway.test/v1/foo" });
    expect(result.response.status).toBe(200);
    expect(result.payment).toEqual({ kind: "success" });
  });

  it("createPaymentFetch returns wrapped fetch", async () => {
    const fetchWithPay = await createPaymentFetch({ address: "0x1" });
    const res = await fetchWithPay("https://gateway.test");
    expect(res.status).toBe(200);
  });

  it("payAndFetch convenience wrapper", async () => {
    const res = await payAndFetch({ address: "0x1" }, { url: "https://gateway.test" });
    expect(res.status).toBe(200);
  });

  it("registers BatchSettlementEvmScheme when batch options are set", async () => {
    const { x402Client } = await import("@x402/fetch");
    const { BatchSettlementEvmScheme } = await import("@x402/evm");
    const signer = { address: "0x1" };
    await BuyerClient.create(signer, { batch: { depositMultiplier: 5 } });
    const x402 = vi.mocked(x402Client).mock.results.at(-1)?.value;
    expect(x402.register).toHaveBeenCalledWith("eip155:*", expect.objectContaining({ kind: "batch" }));
    expect(BatchSettlementEvmScheme).toHaveBeenCalled();
  });
});

describe("BuyerDepsError", () => {
  it("has name BuyerDepsError", () => {
    expect(new BuyerDepsError("x").name).toBe("BuyerDepsError");
  });
});

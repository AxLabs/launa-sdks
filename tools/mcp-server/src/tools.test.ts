import { describe, expect, it, vi } from "vitest";
import { createToolHandlers } from "./tools.js";

describe("mcp tool handlers", () => {
  const mockClient = {
    apis: { list: vi.fn(async () => [{ id: "1" }]), create: vi.fn(async (b) => b) },
    endpoints: { create: vi.fn(async (_a, b) => b) },
    domains: {
      add: vi.fn(async () => ({ hostname: "x.example.com" })),
      verify: vi.fn(async () => ({ status: "verified" })),
      suggest: vi.fn(async () => ({ gateway_hostname: "x402.example.com" })),
    },
    stats: { overview: vi.fn(async () => ({ total_requests: 1 })) },
    auth: { supportedNetworks: vi.fn(async () => ({ kinds: [] })) },
    config: { platform: vi.fn(async () => ({ platform_domain: "localhost" })) },
  };

  const handlers = createToolHandlers(() => mockClient as never);

  it("lists apis", async () => {
    expect(await handlers.listApis()).toHaveLength(1);
  });

  it("pay url requires wallet without env key", async () => {
    const prev = process.env.AX402_EVM_PRIVATE_KEY;
    const prev2 = process.env.EVM_PRIVATE_KEY;
    delete process.env.AX402_EVM_PRIVATE_KEY;
    delete process.env.EVM_PRIVATE_KEY;
    const r = await handlers.payUrl("https://gw.test/v1");
    expect(r.status).toBe("wallet_required");
    if (prev) process.env.AX402_EVM_PRIVATE_KEY = prev;
    if (prev2) process.env.EVM_PRIVATE_KEY = prev2;
  });
});

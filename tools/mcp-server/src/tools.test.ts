import { beforeEach, describe, expect, it, vi } from "vitest";
import { createToolHandlers } from "./tools.js";

describe("mcp tool handlers", () => {
  const mockClient = {
    sandboxWallet: { get: vi.fn() },
    apis: {
      list: vi.fn(async () => [{ id: "1" }]),
      create: vi.fn(async (body) => body),
      update: vi.fn(async (_id, body) => body),
      delete: vi.fn(async () => undefined),
      listWebhookDeliveries: vi.fn(async () => []),
      batchOverview: vi.fn(async () => ({})),
      updateBatchSettings: vi.fn(async (_id, body) => body),
      getCors: vi.fn(async () => ({ origins: [] })),
      putCors: vi.fn(async (_id, origins) => ({ origins })),
      addCorsOrigin: vi.fn(async (_id, origin) => ({ origins: [origin] })),
      removeCorsOrigin: vi.fn(async () => ({ origins: [] })),
    },
    endpoints: {
      create: vi.fn(async (_id, body) => body),
      update: vi.fn(async (_apiId, _endpointId, body) => body),
      delete: vi.fn(async () => undefined),
    },
    domains: {
      add: vi.fn(async () => ({ hostname: "x.example.com" })),
      verify: vi.fn(async () => ({ status: "verified" })),
      suggest: vi.fn(async () => ({ gateway_hostname: "x402.example.com" })),
      delete: vi.fn(async () => undefined),
    },
    openapi: { parseSpec: vi.fn(async () => ({ operations: [] })) },
    settlements: {
      listBatch: vi.fn(async () => []),
      listHistory: vi.fn(async (query) => query),
    },
    income: {
      ledger: vi.fn(async (query) => query),
      payoutRequests: vi.fn(async () => []),
    },
    stats: { overview: vi.fn(async () => ({ total_requests: 1 })) },
    auth: { supportedNetworks: vi.fn(async () => ({ kinds: [] })) },
    config: { platform: vi.fn(async () => ({ platform_domain: "localhost" })) },
  };

  const handlers = createToolHandlers(() => mockClient as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires pricing instead of silently choosing a charge", async () => {
    await expect(handlers.addEndpoint("api", { method: "GET", path_pattern: "/get" }))
      .rejects.toThrow("endpoint pricing is required");
    await expect(handlers.addEndpoint("api", { price: "1", network: "eip155:1", asset: "token" }))
      .rejects.toThrow("decimals are required");
    expect(mockClient.endpoints.create).not.toHaveBeenCalled();
  });

  it("returns the prepared sandbox key only in Sandbox and strips unrelated fields", async () => {
    const wallet = { address: `0x${"1".repeat(40)}`, private_key: `0x${"2".repeat(64)}`,
      private_key_redacted: "redacted", environment: "development", network: "eip155:845320402" };
    mockClient.sandboxWallet.get.mockResolvedValue({ ...wallet, unrelated_secret: "must-not-return" });
    const live = createToolHandlers(() => mockClient as never, { sandbox: false });
    await expect(live.sandboxWallet()).rejects.toThrow("only available in Sandbox");
    expect(mockClient.sandboxWallet.get).not.toHaveBeenCalled();
    const sandbox = createToolHandlers(() => mockClient as never, { sandbox: true });
    expect(await sandbox.sandboxWallet()).toEqual(wallet);
    for (const invalid of [{ environment: "production" }, { network: "eip155:8453" }, { private_key: "invalid-secret" }]) {
      mockClient.sandboxWallet.get.mockResolvedValue({ ...wallet, ...invalid });
      await expect(sandbox.sandboxWallet()).rejects.toThrow(/^invalid sandbox wallet response$/);
    }
  });

  it("lists apis", async () => {
    expect(await handlers.listApis()).toHaveLength(1);
  });

  it("passes API updates and deletes to the SDK", async () => {
    await handlers.updateApi("api-1", {
      upstream_base_url: "https://api.example.com",
      proxy_unmatched: true,
    });
    await handlers.deleteApi("api-1");

    expect(mockClient.apis.update).toHaveBeenCalledWith("api-1", {
      upstream_base_url: "https://api.example.com",
      proxy_unmatched: true,
    });
    expect(mockClient.apis.delete).toHaveBeenCalledWith("api-1");
  });

  it("builds custom token endpoint pricing without hardcoded token constants", async () => {
    await handlers.addEndpoint("api-1", {
      method: "POST",
      path_pattern: "/search",
      price: "1.25",
      decimals: 8,
      network: "hedera:mainnet",
      asset: "0.0.123",
      request_schema: { type: "object" },
    });

    expect(mockClient.endpoints.create).toHaveBeenCalledWith("api-1", {
      method: "POST",
      path_pattern: "/search",
      accepts: [{
        scheme: "exact",
        network: "hedera:mainnet",
        asset: "0.0.123",
        amount: "125000000",
        max_timeout_seconds: 300,
      }],
      request_schema: { type: "object" },
    });
  });

  it("passes endpoint updates and deletes to the SDK", async () => {
    await handlers.updateEndpoint("api-1", "endpoint-1", {
      enabled: false,
      accepts: [{
        scheme: "exact",
        network: "eip155:1",
        asset: "0xtoken",
        amount: "100",
      }],
    });
    await handlers.deleteEndpoint("api-1", "endpoint-1");

    expect(mockClient.endpoints.update).toHaveBeenCalledWith("api-1", "endpoint-1", {
      enabled: false,
      accepts: [{
        scheme: "exact",
        network: "eip155:1",
        asset: "0xtoken",
        amount: "100",
      }],
    });
    expect(mockClient.endpoints.delete).toHaveBeenCalledWith("api-1", "endpoint-1");
  });

  it("maps CORS and batch settings to the SDK", async () => {
    await handlers.addCorsOrigin("api-1", "https://app.example.com");
    await handlers.updateBatchSettings("api-1", 900, 3600, 86400);

    expect(mockClient.apis.addCorsOrigin).toHaveBeenCalledWith(
      "api-1",
      "https://app.example.com",
    );
    expect(mockClient.apis.updateBatchSettings).toHaveBeenCalledWith("api-1", {
      claim_interval_secs: 900,
      settle_interval_secs: 3600,
      refund_interval_secs: 86400,
    });
  });

  it("passes OpenAPI and paginated read queries to the SDK", async () => {
    await handlers.parseOpenapi("openapi: 3.1.0");
    await handlers.settlementsHistory(7, 25, 50, "api-1");
    await handlers.incomeLedger(10, 20, "api-1", "eip155:8453");

    expect(mockClient.openapi.parseSpec).toHaveBeenCalledWith("openapi: 3.1.0");
    expect(mockClient.settlements.listHistory).toHaveBeenCalledWith({
      days: 7,
      limit: 25,
      offset: 50,
      apiId: "api-1",
    });
    expect(mockClient.income.ledger).toHaveBeenCalledWith({
      limit: 10,
      offset: 20,
      apiId: "api-1",
      network: "eip155:8453",
    });
  });

  it("pay url requires wallet without env key", async () => {
    const prev = process.env.LAUNA_EVM_PRIVATE_KEY;
    const prev2 = process.env.EVM_PRIVATE_KEY;
    const prevHAcc = process.env.HEDERA_ACCOUNT_ID;
    const prevHKey = process.env.HEDERA_PRIVATE_KEY;
    delete process.env.LAUNA_EVM_PRIVATE_KEY;
    delete process.env.EVM_PRIVATE_KEY;
    delete process.env.HEDERA_ACCOUNT_ID;
    delete process.env.HEDERA_PRIVATE_KEY;
    const r = await handlers.payUrl("https://gw.test/v1");
    expect(r.status).toBe("wallet_required");
    if (prev) process.env.LAUNA_EVM_PRIVATE_KEY = prev;
    if (prev2) process.env.EVM_PRIVATE_KEY = prev2;
    if (prevHAcc) process.env.HEDERA_ACCOUNT_ID = prevHAcc;
    if (prevHKey) process.env.HEDERA_PRIVATE_KEY = prevHKey;
  });
});

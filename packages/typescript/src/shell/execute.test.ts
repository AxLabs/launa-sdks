import { describe, expect, it, vi } from "vitest";
import { LaunaError } from "../http.js";
import { parseShellArgv } from "./parse.js";
import { runShellCommand } from "./execute.js";
import type { LaunaClient } from "../client.js";

function mockClient(overrides: Partial<LaunaClient> = {}): LaunaClient {
  return {
    apis: { list: vi.fn().mockResolvedValue([{ id: "1", name: "API" }]) },
    auth: { me: vi.fn().mockResolvedValue({ email: "a@b.com" }) },
    keys: { list: vi.fn().mockResolvedValue([]) },
    ...overrides,
  } as unknown as LaunaClient;
}

describe("runShellCommand", () => {
  it("returns help text", async () => {
    const result = await runShellCommand(parseShellArgv(["help"]), { client: mockClient() });
    expect(result.ok).toBe(true);
    if (result.ok) expect(String(result.data)).toContain("apis list");
  });

  it("lists apis", async () => {
    const client = mockClient();
    const result = await runShellCommand(parseShellArgv(["apis", "list"]), { client });
    expect(result.ok).toBe(true);
    expect(client.apis.list).toHaveBeenCalled();
  });

  it("apis update accepts positional id", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "6a5a069930cbab77aee99e9d",
      webhook_url: "https://app.example/hooks",
      webhook_configured: true,
    });
    const client = mockClient({ apis: { update } } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv([
        "apis",
        "update",
        "6a5a069930cbab77aee99e9d",
        "--webhook-url",
        "https://app.example/hooks",
        "--webhook-secret",
        "whsec_test",
      ]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("6a5a069930cbab77aee99e9d", {
      webhook_url: "https://app.example/hooks",
      webhook_secret: "whsec_test",
    });
  });

  it("returns usage for missing flags", async () => {
    const result = await runShellCommand(parseShellArgv(["apis", "create"]), { client: mockClient() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("usage");
  });

  it("maps LaunaError", async () => {
    const client = mockClient({
      apis: {
        list: vi.fn().mockRejectedValue(new LaunaError(403, "forbidden", { reason: "x" })),
      },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["apis", "list"]), { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.data).toEqual({ reason: "x" });
    }
  });

  it("auth me", async () => {
    const client = mockClient();
    const result = await runShellCommand(parseShellArgv(["auth", "me"]), { client });
    expect(result.ok).toBe(true);
    expect(client.auth.me).toHaveBeenCalled();
  });

  it("inspect url", async () => {
    const inspect = vi.fn().mockResolvedValue({ status: 402, paymentRequired: { accepts: [] } });
    const result = await runShellCommand(parseShellArgv(["inspect", "url", "--url", "https://x.test/foo"]), {
      client: mockClient(),
      runInspectUrl: inspect,
    });
    expect(result.ok).toBe(true);
    expect(inspect).toHaveBeenCalledWith("https://x.test/foo", "GET");
  });

  it("x402 inspect alias", async () => {
    const inspect = vi.fn().mockResolvedValue({ status: 402, paymentRequired: { accepts: [] } });
    const result = await runShellCommand(parseShellArgv(["x402", "inspect", "--url", "https://x.test/foo"]), {
      client: mockClient(),
      runInspectUrl: inspect,
    });
    expect(result.ok).toBe(true);
    expect(inspect).toHaveBeenCalledWith("https://x.test/foo", "GET");
  });

  it("apis slug-check", async () => {
    const client = mockClient({
      apis: { checkSlugAvailability: vi.fn().mockResolvedValue({ available: true }) },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["apis", "slug-check", "--slug", "my-api"]), { client });
    expect(result.ok).toBe(true);
    expect(client.apis.checkSlugAvailability).toHaveBeenCalledWith("my-api", undefined);
  });

  it("config billing without credentials", async () => {
    const billing = vi.fn().mockResolvedValue({ packages: [] });
    const client = mockClient({ config: { billing } } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["config", "billing"]), { client });
    expect(result.ok).toBe(true);
    expect(billing).toHaveBeenCalled();
  });

  it("endpoints create uses sandbox fork accepts with --sandbox", async () => {
    const create = vi.fn().mockResolvedValue({ id: "ep1" });
    const client = mockClient({
      endpoints: { create },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv(["--sandbox", "endpoints", "create", "--api-id", "api1", "--path", "/v1/*", "--price-usdc", "0.10"]),
      { client, sandbox: true },
    );
    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledWith(
      "api1",
      expect.objectContaining({
        accepts: [
          expect.objectContaining({
            network: "eip155:845320402",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            amount: "100000",
            scheme: "exact",
          }),
        ],
      }),
    );
  });

  it("sandbox-wallet get requires sandbox mode", async () => {
    const result = await runShellCommand(parseShellArgv(["sandbox-wallet", "get"]), {
      client: mockClient(),
      sandbox: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/--sandbox/);
  });

  it("sandbox-wallet get returns wallet with balances", async () => {
    const get = vi.fn().mockResolvedValue({
      address: "0xabc",
      private_key: "0xkey",
      private_key_redacted: "0x…key",
    });
    const devBalances = vi.fn().mockResolvedValue({ eth_wei: "0x1", usdc_base: "0x3e8" });
    const client = mockClient({
      sandboxWallet: { get, reset: vi.fn() },
      config: { localDev: vi.fn(), devBalances, devFaucet: vi.fn() },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["--sandbox", "sandbox-wallet", "get", "--no-wait"]), {
      client,
      sandbox: true,
    });
    expect(result.ok).toBe(true);
    expect(get).toHaveBeenCalled();
    if (result.ok) {
      expect(result.data).toMatchObject({
        address: "0xabc",
        funded: true,
        balances: { eth_wei: "0x1", usdc_base: "0x3e8" },
      });
    }
  });

  it("sandbox-wallet get --json does not poll for funding", async () => {
    const get = vi.fn().mockResolvedValue({
      address: "0xabc",
      private_key: "0xkey",
      private_key_redacted: "0x…key",
    });
    const devBalances = vi.fn().mockResolvedValue({ eth_wei: "0x0", usdc_base: "0x0" });
    const client = mockClient({
      sandboxWallet: { get, reset: vi.fn() },
      config: { localDev: vi.fn(), devBalances, devFaucet: vi.fn() },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv(["--json", "--sandbox", "sandbox-wallet", "get"]),
      { client, sandbox: true },
    );
    expect(result.ok).toBe(true);
    expect(devBalances).toHaveBeenCalledTimes(1);
  });

  it("endpoints update sets accepts from network/asset/price", async () => {
    const update = vi.fn().mockResolvedValue({ id: "ep1", accepts: [] });
    const client = mockClient({
      endpoints: { update },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv([
        "endpoints",
        "update",
        "--api-id",
        "6a2be9d4faa4332cab0de81c",
        "--endpoint-id",
        "6a2be9d5faa4332cab0de81d",
        "--network",
        "hedera:testnet",
        "--asset",
        "0.0.429274",
        "--price",
        "0.10",
        "--scheme",
        "exact",
      ]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("6a2be9d4faa4332cab0de81c", "6a2be9d5faa4332cab0de81d", {
      accepts: [
        {
          scheme: "exact",
          network: "hedera:testnet",
          asset: "0.0.429274",
          amount: "100000",
          max_timeout_seconds: 300,
        },
      ],
    });
  });

  it("endpoints update accepts JSON", async () => {
    const update = vi.fn().mockResolvedValue({ id: "ep1" });
    const client = mockClient({ endpoints: { update } } as Partial<LaunaClient>);
    const accepts = JSON.stringify([
      {
        scheme: "exact",
        network: "hedera:testnet",
        asset: "0.0.429274",
        amount: "100000",
        max_timeout_seconds: 300,
      },
    ]);
    const result = await runShellCommand(
      parseShellArgv([
        "endpoints",
        "update",
        "--api-id",
        "api1",
        "--endpoint-id",
        "ep1",
        "--accepts",
        accepts,
      ]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("api1", "ep1", {
      accepts: JSON.parse(accepts),
    });
  });

  it("apis create includes discovery fields", async () => {
    const create = vi.fn().mockResolvedValue({ id: "api1" });
    const client = mockClient({ apis: { create } } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv([
        "apis",
        "create",
        "--name",
        "Search",
        "--slug",
        "search",
        "--upstream",
        "https://upstream.example.com",
        "--discovery-guidance",
        "Use POST /search.",
        "--discovery-contact-email",
        "seller@example.com",
        "--openapi-version",
        "1.2.0",
      ]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledWith({
      name: "Search",
      slug: "search",
      upstream_base_url: "https://upstream.example.com",
      pay_to_mode: undefined,
      pay_to_address: undefined,
      pay_to_addresses: undefined,
      webhook_url: undefined,
      webhook_secret: undefined,
      discovery_guidance: "Use POST /search.",
      discovery_contact_email: "seller@example.com",
      openapi_version: "1.2.0",
    });
  });

  it("apis create includes pay_to_addresses", async () => {
    const create = vi.fn().mockResolvedValue({ id: "api1" });
    const client = mockClient({ apis: { create } } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv([
        "apis",
        "create",
        "--name",
        "Multi",
        "--slug",
        "multi",
        "--upstream",
        "https://upstream.example.com",
        "--pay-to",
        "0xAb5801a7D398351b8bE11C439e08FE5E090a7566",
        "--pay-to-addresses",
        "hedera:testnet=0.0.1234",
      ]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        pay_to_mode: "user_wallet",
        pay_to_address: "0xAb5801a7D398351b8bE11C439e08FE5E090a7566",
        pay_to_addresses: { "hedera:testnet": "0.0.1234" },
      }),
    );
  });

  it("apis discovery", async () => {
    const discovery = vi.fn().mockResolvedValue({
      primary_host: "api.example.com",
      openapi_url: "https://api.example.com/openapi.json",
      well_known_url: "https://api.example.com/.well-known/x402.json",
    });
    const client = mockClient({ apis: { discovery } } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["apis", "discovery", "--id", "api1"]), { client });
    expect(result.ok).toBe(true);
    expect(discovery).toHaveBeenCalledWith("api1");
  });

  it("discovery urls", async () => {
    const discovery = vi.fn().mockResolvedValue({ openapi_url: "https://x/openapi.json" });
    const client = mockClient({ apis: { discovery } } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["discovery", "urls", "--api-id", "api1"]), { client });
    expect(result.ok).toBe(true);
    expect(discovery).toHaveBeenCalledWith("api1");
  });

  it("apis update discovery fields", async () => {
    const update = vi.fn().mockResolvedValue({ id: "api1" });
    const client = mockClient({ apis: { update } } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv([
        "apis",
        "update",
        "api1",
        "--discovery-guidance",
        "Use POST /search.",
        "--discovery-contact-email",
        "seller@example.com",
      ]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("api1", {
      discovery_guidance: "Use POST /search.",
      discovery_contact_email: "seller@example.com",
    });
  });

  it("apis update can clear pay_to_addresses", async () => {
    const update = vi.fn().mockResolvedValue({ id: "api1" });
    const client = mockClient({ apis: { update } } as Partial<LaunaClient>);
    const result = await runShellCommand(
      parseShellArgv(["apis", "update", "api1", "--pay-to-addresses", "{}"]),
      { client },
    );
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("api1", { pay_to_addresses: {} });
  });

  it("billing overview", async () => {
    const client = mockClient({
      billing: { overview: vi.fn().mockResolvedValue({ model: "payg" }) },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["billing", "overview"]), { client });
    expect(result.ok).toBe(true);
    expect(client.billing.overview).toHaveBeenCalled();
  });
});

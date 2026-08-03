import { describe, expect, it, vi } from "vitest";
import { Ax402Error } from "../http.js";
import { parseShellArgv } from "./parse.js";
import { runShellCommand } from "./execute.js";
import type { Ax402Client } from "../client.js";

function mockClient(overrides: Partial<Ax402Client> = {}): Ax402Client {
  return {
    apis: { list: vi.fn().mockResolvedValue([{ id: "1", name: "API" }]) },
    auth: { me: vi.fn().mockResolvedValue({ email: "a@b.com" }) },
    keys: { list: vi.fn().mockResolvedValue([]) },
    ...overrides,
  } as unknown as Ax402Client;
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
    const client = mockClient({ apis: { update } } as Partial<Ax402Client>);
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

  it("maps Ax402Error", async () => {
    const client = mockClient({
      apis: {
        list: vi.fn().mockRejectedValue(new Ax402Error(403, "forbidden", { reason: "x" })),
      },
    } as Partial<Ax402Client>);
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
    } as Partial<Ax402Client>);
    const result = await runShellCommand(parseShellArgv(["apis", "slug-check", "--slug", "my-api"]), { client });
    expect(result.ok).toBe(true);
    expect(client.apis.checkSlugAvailability).toHaveBeenCalledWith("my-api", undefined);
  });

  it("config billing without credentials", async () => {
    const billing = vi.fn().mockResolvedValue({ packages: [] });
    const client = mockClient({ config: { billing } } as Partial<Ax402Client>);
    const result = await runShellCommand(parseShellArgv(["config", "billing"]), { client });
    expect(result.ok).toBe(true);
    expect(billing).toHaveBeenCalled();
  });

  it("endpoints update sets accepts from network/asset/price", async () => {
    const update = vi.fn().mockResolvedValue({ id: "ep1", accepts: [] });
    const client = mockClient({
      endpoints: { update },
    } as Partial<Ax402Client>);
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
    const client = mockClient({ endpoints: { update } } as Partial<Ax402Client>);
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

  it("billing overview", async () => {
    const client = mockClient({
      billing: { overview: vi.fn().mockResolvedValue({ model: "payg" }) },
    } as Partial<Ax402Client>);
    const result = await runShellCommand(parseShellArgv(["billing", "overview"]), { client });
    expect(result.ok).toBe(true);
    expect(client.billing.overview).toHaveBeenCalled();
  });
});

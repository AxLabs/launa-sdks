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

  it("billing overview", async () => {
    const client = mockClient({
      billing: { overview: vi.fn().mockResolvedValue({ model: "payg" }) },
    } as Partial<LaunaClient>);
    const result = await runShellCommand(parseShellArgv(["billing", "overview"]), { client });
    expect(result.ok).toBe(true);
    expect(client.billing.overview).toHaveBeenCalled();
  });
});

import { createServer, request as rawRequest, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../server.js";
import { createToolHandlers } from "../tools.js";
import { createHttpHandler } from "./http.js";
import { fixture, config } from "./test-helpers.js";

describe("hosted MCP HTTP boundary", () => {
  let f: ReturnType<typeof fixture>;
  const backendRequests: {
    url: string;
    key: string | null;
    environment: string | null;
    body: unknown;
  }[] = [];
  const backend = vi.fn(async (input: unknown, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const key = headers.get("x-api-key");
    backendRequests.push({
      url: String(input),
      key,
      environment: headers.get("x-launa-environment"),
      body: init?.body && JSON.parse(String(init.body)),
    });
    if (String(input).includes("secret-error"))
      return new Response("upstream secret test-only-key", { status: 403 });
    return Response.json([{ owner: key }]);
  });
  let server: Server;
  let base: string;
  beforeAll(async () => {
    let handler: ReturnType<typeof createHttpHandler>;
    server = createServer((req, res) => {
      void handler(req, res);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    f = fixture({ publicUrl: base });
    handler = createHttpHandler(
      { ...config, publicUrl: base },
      f.oauth,
      backend,
    );
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const request = (path: string, init: RequestInit = {}) =>
    fetch(base + path, init);
  const rpc = (token: string, method: string, params: unknown = {}) =>
    request("/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-03-26",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  it("advertises OAuth discovery and challenges unauthenticated requests", async () => {
    const response = await request("/mcp", { method: "POST" });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "oauth-protected-resource/mcp",
    );
    const resource = await (
      await request("/.well-known/oauth-protected-resource/mcp")
    ).json();
    expect(resource.resource).toBe(base + "/mcp");
    const metadata = await (
      await request("/.well-known/oauth-authorization-server")
    ).json();
    expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);
    expect(metadata.registration_endpoint).toBeUndefined();
  });
  it("rejects DNS rebinding, untrusted origins, duplicate parameters and an untrusted consent bridge", async () => {
    const badHost = await new Promise<number | undefined>((resolve) => {
      const req = rawRequest(
        base + "/healthz",
        { headers: { Host: "attacker.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.end();
    });
    expect(badHost).toBe(403);
    expect(
      (
        await request("/healthz", {
          headers: { Origin: "https://attacker.example" },
        })
      ).status,
    ).toBe(403);
    expect(
      (await request("/oauth/authorize?client_id=cursor&client_id=other"))
        .status,
    ).toBe(400);
    expect((await request("/oauth/consent?request=x")).status).toBe(403);
  });
  it("preserves all control-plane schemas and omits both local buyer tools", async () => {
    const { tokens } = await f.connect();
    const response = await rpc(tokens.access_token, "tools/list");
    expect(response.status).toBe(200);
    const remote = (await response.json()).result.tools;
    const local = createMcpServer(
      createToolHandlers(() => {
        throw new Error("unused");
      }),
    );
    const client = new Client({ name: "test", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await local.connect(a);
    await client.connect(b);
    try {
      const tools = (await client.listTools()).tools.filter(
        (t) => !["launa_inspect_url", "launa_pay_url"].includes(t.name),
      );
      expect(remote).toEqual(tools);
      expect(remote).toHaveLength(42);
    } finally {
      await client.close();
      await local.close();
    }
    const absent = await (
      await rpc(tokens.access_token, "tools/call", {
        name: "launa_pay_url",
        arguments: { url: "http://169.254.169.254/" },
      })
    ).json();
    expect(absent.error ?? absent.result?.isError).toBeTruthy();
  });
  it("isolates simultaneous tenant and environment credentials, ignoring process globals", async () => {
    const alice = await f.connect("alice", "development");
    const bob = await f.connect("bob", "production");
    vi.stubEnv("LAUNA_API_KEY", "must-never-be-used");
    vi.stubEnv("LAUNA_SANDBOX", "1");
    try {
      const responses = await Promise.all(
        [alice, bob].map((c) =>
          rpc(c.tokens.access_token, "tools/call", {
            name: "launa_list_apis",
            arguments: {},
          }).then((r) => r.json()),
        ),
      );
      expect(JSON.stringify(responses[0])).toContain(
        "test-only-key-alice-development",
      );
      expect(JSON.stringify(responses[0])).not.toContain("test-only-key-bob");
      expect(JSON.stringify(responses[1])).toContain(
        "test-only-key-bob-production",
      );
      await Promise.all(
        [alice, bob].map((c) =>
          rpc(c.tokens.access_token, "tools/call", {
            name: "launa_add_endpoint",
            arguments: {
              api_id: "api",
              method: "GET",
              path_pattern: "/sample",
              price_usdc: "0.10",
            },
          }),
        ),
      );
      const prices = backendRequests.filter((r) =>
        r.url.endsWith("/endpoints"),
      );
      const testPrice = prices.find((r) => r.environment === "development")!;
      const livePrice = prices.find((r) => r.environment === "production")!;
      expect(JSON.stringify(testPrice.body)).toContain("eip155:845320402");
      expect(JSON.stringify(livePrice.body)).not.toContain("eip155:845320402");
      expect(
        backendRequests.every(
          (r) =>
            r.key !== "must-never-be-used" &&
            r.url.startsWith(config.backendUrl),
        ),
      ).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("redacts backend errors, rejects revoked tokens and limits bodies", async () => {
    const { tokens } = await f.connect();
    const result = await (
      await rpc(tokens.access_token, "tools/call", {
        name: "launa_get_api",
        arguments: { api_id: "secret-error" },
      })
    ).json();
    expect(JSON.stringify(result)).toContain("403");
    expect(JSON.stringify(result)).not.toContain("upstream secret");
    const oversized = await request("/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "x=" + "x".repeat(20_000),
    });
    expect(oversized.status).toBe(413);
    await f.oauth.revoke(
      new URLSearchParams({ client_id: "cursor", token: tokens.access_token }),
    );
    expect((await rpc(tokens.access_token, "tools/list")).status).toBe(401);
  });
});

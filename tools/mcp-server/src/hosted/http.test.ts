import { createServer, request as rawRequest, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  auth,
  type OAuthClientProvider,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../server.js";
import { createToolHandlers } from "../tools.js";
import { createHttpHandler } from "./http.js";
import { fixture, config } from "./test-helpers.js";

describe("hosted MCP HTTP boundary", () => {
  let f: ReturnType<typeof fixture>;
  const testKey = `launa_sandbox_${"a".repeat(48)}`;
  const liveKey = `launa_live_${"b".repeat(48)}`;
  let revokedKey = false;
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
    if (String(input).endsWith("/auth/api-key")) {
      if (![testKey, liveKey].includes(key ?? "") || revokedKey)
        return new Response("sensitive revoked key", { status: 401 });
      return Response.json({
        environment: key === testKey ? "development" : "production",
        scopes: ["apis:read"],
      });
    }
    if (String(input).endsWith("/sandbox-wallet")) {
      if ([testKey, liveKey].includes(key ?? ""))
        return Response.json({ error: "insufficient scope" }, { status: 403 });
      return Response.json({ address: `0x${"1".repeat(40)}`, private_key: `0x${"2".repeat(64)}`,
        private_key_redacted: "redacted", environment: "development", network: "eip155:845320402" });
    }
    if ([testKey, liveKey].includes(key ?? "")) {
      if (init?.method && init.method !== "GET")
        return new Response("sensitive scope error", { status: 403 });
      return Response.json([{ name: key === testKey ? "test-api" : "live-api" }]);
    }
    if (String(input).includes("secret-error"))
      return new Response("upstream secret test-only-key", { status: 403 });
    if (init?.method === "POST" && String(input).endsWith("/apis")) {
      const body = JSON.parse(String(init.body));
      if (body.pay_to_mode === "platform_wallet") return Response.json(body);
      return Response.json({ error: "pay_to_address or pay_to_addresses required for user_wallet mode" }, { status: 400 });
    }
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
    expect(metadata.registration_endpoint).toBe(base + "/oauth/register");
  });
  it("serves API-key clients, enforces scope denials, and revalidates revocation", async () => {
    const results = await Promise.all([testKey, liveKey].map(async (key) => {
      expect((await rpc(key, "tools/list")).status).toBe(200);
      return (await rpc(key, "tools/call", { name: "launa_list_apis", arguments: {} })).json();
    }));
    expect(JSON.stringify(results[0])).toContain("test-api");
    expect(JSON.stringify(results[0])).not.toContain("live-api");
    expect(JSON.stringify(results[1])).toContain("live-api");
    const denied = await (await rpc(testKey, "tools/call", {
      name: "launa_create_api",
      arguments: { name: "Forbidden", slug: "forbidden", upstream_base_url: "https://example.com" },
    })).json();
    expect(denied.result.isError).toBe(true);
    expect(JSON.stringify(denied)).toContain("403");
    expect(JSON.stringify(denied)).not.toContain("sensitive");
    const keyed = await request("/mcp", {
      method: "POST",
      headers: { "X-API-Key": testKey, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(keyed.status).toBe(200);
    const calls = backendRequests.filter(r => [testKey, liveKey].includes(r.key ?? "") && !r.url.endsWith("/auth/api-key"));
    expect(calls.every(r => r.environment === (r.key === testKey ? "development" : "production"))).toBe(true);
    revokedKey = true;
    try {
      const rejected = await rpc(testKey, "tools/list");
      expect(rejected.status).toBe(401);
      expect(await rejected.text()).not.toContain("sensitive");
    } finally { revokedKey = false; }
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
      expect(remote).toHaveLength(43);
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
  it("returns actionable write errors and accepts explicit platform wallets", async () => {
    const { tokens } = await f.connect("validation", "development");
    const create = async (args: Record<string, unknown>) => (await rpc(tokens.access_token, "tools/call", {
      name: "launa_create_api", arguments: { name: "Test", slug: "test", upstream_base_url: "https://example.com", ...args },
    })).json();
    const rejected = await create({});
    expect(rejected.result.isError).toBe(true);
    expect(rejected.result.content[0].text).toContain("pay_to_address or pay_to_addresses required for user_wallet mode");
    const accepted = await create({ pay_to_mode: "platform_wallet" });
    expect(accepted.result.isError).not.toBe(true);
    expect(JSON.parse(accepted.result.content[0].text).pay_to_mode).toBe("platform_wallet");
    const before = backendRequests.length;
    const batch = await (await rpc(tokens.access_token, "tools/call", {
      name: "launa_add_endpoint", arguments: { api_id: "api", method: "GET", path_pattern: "/status/200", scheme: "batch-settlement", price_usdc: "0.001" },
    })).json();
    expect(batch.result.isError).toBe(true);
    expect(batch.result.content[0].text).toContain("sandbox fork supports exact scheme only");
    expect(backendRequests.slice(before).filter((r) => r.url.includes("/endpoints"))).toEqual([]);
  });
  it("exposes sandbox wallet credentials through authenticated MCP and rejects Live or unscoped keys", async () => {
    const sandbox = await f.connect("wallet", "development");
    const live = await f.connect("wallet-live", "production");
    const call = async (token: string) => (await rpc(token, "tools/call", { name: "launa_sandbox_wallet", arguments: {} })).json();
    const result = await call(sandbox.tokens.access_token);
    expect(result.result.isError).not.toBe(true);
    const wallet = JSON.parse(result.result.content[0].text);
    expect(wallet.private_key).toBe(`0x${"2".repeat(64)}`);
    expect(wallet.network).toBe("eip155:845320402");
    const before = backendRequests.length;
    const deniedLive = await call(live.tokens.access_token);
    expect(deniedLive.result.isError).toBe(true);
    expect(deniedLive.result.content[0].text).toContain("only available in Sandbox");
    expect(backendRequests.slice(before).some(r => r.url.endsWith("/sandbox-wallet"))).toBe(false);
    const deniedScope = await call(testKey);
    expect(deniedScope.result.isError).toBe(true);
    expect(deniedScope.result.content[0].text).toContain("insufficient scope");
    expect(JSON.stringify(deniedScope)).not.toContain(wallet.private_key);
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

  it("completes the MCP SDK discovery, DCR, consent and token flow", async () => {
    let client: OAuthClientInformationMixed | undefined;
    let tokens: OAuthTokens | undefined;
    let verifier = "";
    let authorizationUrl: URL | undefined;
    const redirect = "http://127.0.0.1:54321/callback";
    const provider: OAuthClientProvider = {
      redirectUrl: redirect,
      clientMetadata: {
        client_name: "SDK client",
        redirect_uris: [redirect],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      clientInformation: () => client,
      saveClientInformation: (value) => {
        client = value;
      },
      tokens: () => tokens,
      saveTokens: (value) => {
        tokens = value;
      },
      saveCodeVerifier: (value) => {
        verifier = value;
      },
      codeVerifier: () => verifier,
      redirectToAuthorization: (url) => {
        authorizationUrl = url;
      },
    };
    expect(await auth(provider, { serverUrl: base + "/mcp" })).toBe("REDIRECT");
    expect(client?.client_id).toMatch(/^dcr_/);
    const response = await fetch(authorizationUrl!, { redirect: "manual" });
    expect(response.status).toBe(302);
    const requestId = new URL(
      response.headers.get("location")!,
    ).searchParams.get("request")!;
    const info = await f.oauth.consentInfo(requestId, "sdk-user");
    const callback = new URL(
      await f.oauth.consent(
        {
          request: requestId,
          consentToken: info.consentToken,
          environment: "development",
          approve: true,
        },
        "sdk-user",
      ),
    );
    expect(
      await auth(provider, {
        serverUrl: base + "/mcp",
        authorizationCode: callback.searchParams.get("code")!,
      }),
    ).toBe("AUTHORIZED");
    expect((await rpc(tokens!.access_token, "tools/list")).status).toBe(200);
    const refreshed = await f.oauth.token(
      new URLSearchParams({
        client_id: client!.client_id,
        grant_type: "refresh_token",
        refresh_token: tokens!.refresh_token!,
        resource: base + "/mcp",
      }),
    );
    expect((await rpc(refreshed.access_token, "tools/list")).status).toBe(200);
  });
  it("registers public clients over JSON and rate-limits registration floods", async () => {
    const payload = JSON.stringify({
      client_name: "Test client",
      redirect_uris: ["http://127.0.0.1/callback"],
    });
    const register = () =>
      request("/oauth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    const first = await register();
    expect(first.status).toBe(201);
    expect(first.headers.get("cache-control")).toBe("no-store");
    const client = await first.json();
    expect(client.client_id).toMatch(/^dcr_/);
    expect(client.client_secret).toBeUndefined();
    for (let i = 1; i < 20; i++)
      expect([201, 429]).toContain((await register()).status);
    const limited = await register();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { OAuthService } from "./oauth.js";
import { CONTROL_SCOPES, readConfig, type HostedConfig } from "./config.js";
import { hash, decrypt, encrypt } from "./crypto.js";
import type { OAuthStore, RecordValue } from "./store.js";
import { SellerBackend, backendFetch } from "./backend.js";

import { fixture, config, verifier } from "./test-helpers.js";

afterEach(() => vi.useRealTimers());
describe("hosted OAuth security", () => {
  it("binds consent, credentials, tokens and environment without storing the login session", async () => {
    const f = fixture();
    const { tokens, callback } = await f.connect("alice", "production");
    const { grant, apiKey } = await f.oauth.authenticate(tokens.access_token);
    expect(grant.environment).toBe("production");
    expect(grant.userId).toBe("alice");
    expect(apiKey).toBe("test-only-key-alice-production");
    expect(callback.searchParams.get("state")).toBe("client-state");
    expect(callback.searchParams.get("iss")).toBe(config.publicUrl);
    expect(f.backend.createKey).toHaveBeenCalledWith(
      "alice",
      "production",
      [...CONTROL_SCOPES],
      expect.stringContaining("MCP: Cursor"),
    );
    const persisted = JSON.stringify([...f.store.records.values()]);
    expect(persisted).not.toContain(apiKey);
    expect(persisted).not.toContain(tokens.access_token);
    expect(persisted).not.toContain(tokens.refresh_token);
    expect(CONTROL_SCOPES).not.toContain("income:payout");
    expect(CONTROL_SCOPES).not.toContain("billing:write");
  });
  it.each([
    ["redirect_uri", "https://attacker.example/callback"],
    ["code_challenge_method", "plain"],
    ["resource", "https://wrong.example/mcp"],
    ["scope", "income:payout"],
    ["client_id", "unknown"],
  ])("rejects unauthorized %s before redirecting", async (key, value) => {
    const f = fixture();
    const p = f.authorize();
    p.set(key, value);
    await expect(f.oauth.authorize(p)).rejects.toThrow();
    expect(f.store.records.size).toBe(0);
  });
  it("requires explicit consent bound to the logged-in account", async () => {
    const f = fixture();
    const location = await f.oauth.authorize(f.authorize());
    const request = new URL(location).searchParams.get("request")!;
    const info = await f.oauth.consentInfo(request, "alice");
    await expect(
      f.oauth.consent(
        {
          request,
          consentToken: info.consentToken,
          environment: "development",
          approve: true,
        },
        "bob",
      ),
    ).rejects.toThrow();
    expect(f.backend.createKey).not.toHaveBeenCalled();
    const denied = await f.oauth.consent(
      {
        request,
        consentToken: info.consentToken,
        environment: "development",
        approve: false,
      },
      "alice",
    );
    expect(new URL(denied).searchParams.get("error")).toBe("access_denied");
    await expect(f.oauth.consentInfo(request, "alice")).rejects.toThrow();
    expect(f.backend.createKey).not.toHaveBeenCalled();
  });
  it("rejects a wrong verifier/client/resource/redirect without consuming the code", async () => {
    const f = fixture();
    const location = await f.oauth.authorize(f.authorize());
    const request = new URL(location).searchParams.get("request")!;
    const info = await f.oauth.consentInfo(request, "alice");
    const url = await f.oauth.consent(
      {
        request,
        consentToken: info.consentToken,
        environment: "development",
        approve: true,
      },
      "alice",
    );
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "cursor",
      resource: f.oauth.resource,
      redirect_uri: config.clients[0].redirectUris[0],
      code: new URL(url).searchParams.get("code")!,
      code_verifier: verifier,
    });
    for (const [key, value] of [
      ["code_verifier", "wrong".repeat(10)],
      ["client_id", "other"],
      ["resource", "https://other.example"],
      ["redirect_uri", "https://other.example/callback"],
    ]) {
      const wrong = new URLSearchParams(params);
      wrong.set(key, value);
      await expect(f.oauth.token(wrong)).rejects.toThrow();
    }
    const tokens = await f.oauth.token(params);
    expect(tokens.access_token).toBeTruthy();
    await expect(f.oauth.token(params)).rejects.toThrow();
    await expect(f.oauth.authenticate(tokens.access_token)).rejects.toThrow();
  });
  it("rotates refresh tokens and revokes the entire grant on reuse", async () => {
    const f = fixture();
    const { tokens } = await f.connect();
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "cursor",
      resource: f.oauth.resource,
      refresh_token: tokens.refresh_token,
    });
    const next = await f.oauth.token(params);
    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    await f.oauth.authenticate(next.access_token);
    await expect(f.oauth.token(params)).rejects.toThrow();
    await expect(f.oauth.authenticate(next.access_token)).rejects.toThrow();
    await expect(f.oauth.authenticate(tokens.access_token)).rejects.toThrow();
  });
  it("allows at most one concurrent refresh and fails closed on replay", async () => {
    const f = fixture();
    const { tokens } = await f.connect();
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "cursor",
      resource: f.oauth.resource,
      refresh_token: tokens.refresh_token,
    });
    const results = await Promise.allSettled([
      f.oauth.token(params),
      f.oauth.token(params),
    ]);
    expect(
      results.filter((r) => r.status === "fulfilled").length,
    ).toBeLessThanOrEqual(1);
    for (const result of results)
      if (result.status === "fulfilled")
        await expect(
          f.oauth.authenticate(result.value.access_token),
        ).rejects.toThrow();
  });
  it("expires access, pending requests, authorization codes and absolute grants", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const location = await f.oauth.authorize(f.authorize());
    const { tokens } = await f.connect();
    vi.setSystemTime(Date.now() + 11 * 60_000);
    await expect(
      f.oauth.consentInfo(
        new URL(location).searchParams.get("request")!,
        "alice",
      ),
    ).rejects.toThrow();
    await expect(f.oauth.authenticate(tokens.access_token)).rejects.toThrow();
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60_000);
    await expect(
      f.oauth.token(
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: "cursor",
          resource: f.oauth.resource,
          refresh_token: tokens.refresh_token,
        }),
      ),
    ).rejects.toThrow();
  });
  it("revokes only the correct client's grant", async () => {
    const f = fixture();
    const alice = await f.connect("alice");
    const bob = await f.connect("bob", "production");
    await f.oauth.revoke(
      new URLSearchParams({
        client_id: "other",
        token: alice.tokens.refresh_token,
      }),
    );
    await f.oauth.authenticate(alice.tokens.access_token);
    await f.oauth.revoke(
      new URLSearchParams({
        client_id: "cursor",
        token: alice.tokens.refresh_token,
      }),
    );
    await expect(
      f.oauth.authenticate(alice.tokens.access_token),
    ).rejects.toThrow();
    expect(
      (await f.oauth.authenticate(bob.tokens.access_token)).grant.userId,
    ).toBe("bob");
  });
  it("binds persisted grants to the resource even if deployments share storage", async () => {
    const f = fixture();
    const { tokens } = await f.connect();
    const other = new OAuthService(
      { ...config, publicUrl: "https://other.example.com" },
      f.store,
      f.backend as unknown as SellerBackend,
    );
    await expect(other.authenticate(tokens.access_token)).rejects.toThrow();
    await other.revoke(
      new URLSearchParams({ client_id: "cursor", token: tokens.access_token }),
    );
    await f.oauth.authenticate(tokens.access_token);
  });
  it("allows the same scope on refresh but rejects changes", async () => {
    const f = fixture();
    const { tokens } = await f.connect();
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "cursor",
      resource: f.oauth.resource,
      refresh_token: tokens.refresh_token,
      scope: "income:payout",
    });
    await expect(f.oauth.token(params)).rejects.toThrow();
    params.set("scope", tokens.scope);
    expect((await f.oauth.token(params)).access_token).toBeTruthy();
  });
  it("rejects ciphertext substitution and tampering", () => {
    const encrypted = encrypt(
      "test-only-secret",
      config.encryptionKey,
      "grant-a",
    );
    expect(decrypt(encrypted, config.encryptionKey, "grant-a")).toBe(
      "test-only-secret",
    );
    expect(() => decrypt(encrypted, config.encryptionKey, "grant-b")).toThrow();
    expect(() =>
      decrypt(encrypted + "x", config.encryptionKey, "grant-a"),
    ).toThrow();
  });
  it("cleans up a newly created backend key if persistence fails", async () => {
    const f = fixture();
    const request = new URL(
      await f.oauth.authorize(f.authorize()),
    ).searchParams.get("request")!;
    const info = await f.oauth.consentInfo(request, "alice");
    vi.spyOn(f.store, "put").mockRejectedValue(new Error("database down"));
    await expect(
      f.oauth.consent(
        {
          request,
          consentToken: info.consentToken,
          environment: "development",
          approve: true,
        },
        "alice",
      ),
    ).rejects.toThrow();
    expect(f.backend.revokeKey).toHaveBeenCalledWith(
      "alice",
      "development",
      "id-alice",
    );
  });
  it("pins backend origin and disables redirects and retries", async () => {
    const mock = vi.fn(async () => new Response("{}"));
    const secured = backendFetch(config, mock);
    await expect(secured("https://attacker.example/auth/me")).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
    await secured(`${config.backendUrl}/auth/me`, {
      headers: { Authorization: "Bearer test-only-session" },
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0][1]).toMatchObject({ redirect: "error" });
  });
  it("fails startup with insecure public endpoints or short keys", () => {
    expect(() => readConfig({})).toThrow();
    expect(() =>
      readConfig({
        MCP_PUBLIC_URL: "http://remote.example",
        MCP_FRONTEND_URL: config.frontendUrl,
        LAUNA_BASE_URL: config.backendUrl,
        MCP_ENCRYPTION_KEY: config.encryptionKey.toString("base64"),
        MCP_BRIDGE_SECRET: config.bridgeSecret,
        MCP_OAUTH_CLIENTS: JSON.stringify(config.clients),
      }),
    ).toThrow();
  });
});

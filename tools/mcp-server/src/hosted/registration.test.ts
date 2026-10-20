import { describe, expect, it, vi, afterEach } from "vitest";
import { fixture, verifier } from "./test-helpers.js";
import { OAuthService } from "./oauth.js";
import { registrationMetadata, WEB_CALLBACKS } from "./registration.js";

describe("public OAuth client registration", () => {
  afterEach(() => vi.useRealTimers());
  it.each([
    "https://attacker.example/callback",
    "http://169.254.169.254/",
    "http://192.168.1.1/callback",
    "http://localhost.attacker.example/",
    "http://user@localhost:8080/",
    "http://localhost:8080/?next=evil",
    "http://localhost:8080/#fragment",
    "javascript:alert(1)",
    "file:///tmp/callback",
    "http://localhost:8080/\\evil",
  ])("rejects unreviewed callbacks: %s", (uri) => {
    expect(() => registrationMetadata({ redirect_uris: [uri] })).toThrow();
  });
  it("permits only public authorization-code clients and does not retain metadata URLs", () => {
    const value = {
      redirect_uris: ["http://127.0.0.1/callback"],
      logo_uri: "http://169.254.169.254/",
    };
    expect(registrationMetadata(value)).not.toHaveProperty("logo_uri");
    expect(() =>
      registrationMetadata({
        ...value,
        token_endpoint_auth_method: "client_secret_post",
      }),
    ).toThrow();
    expect(() =>
      registrationMetadata({ ...value, grant_types: ["client_credentials"] }),
    ).toThrow();
    expect(() =>
      registrationMetadata({ ...value, client_name: "Launa\nverified" }),
    ).toThrow();
    for (const uri of WEB_CALLBACKS)
      expect(
        registrationMetadata({ redirect_uris: [uri] }).redirect_uris,
      ).toEqual([uri]);
  });
  it("persists registration across service instances, binds exact callbacks at exchange and preserves PKCE", async () => {
    const f = fixture();
    const registered = await f.oauth.register({
      client_name: "Test editor",
      redirect_uris: ["http://127.0.0.1/callback"],
    });
    const oauth = new OAuthService(f.oauth.config, f.store, f.backend as never);
    const params = f.authorize();
    params.set("client_id", registered.client_id);
    params.set("redirect_uri", "http://127.0.0.1:54123/callback");
    const request = new URL(await oauth.authorize(params)).searchParams.get(
      "request",
    )!;
    const info = await oauth.consentInfo(request, "alice");
    expect(info.client).toBe("Test editor");
    expect(info.redirectUri).toBe(params.get("redirect_uri"));
    const callback = new URL(
      await oauth.consent(
        {
          request,
          consentToken: info.consentToken,
          environment: "development",
          approve: true,
        },
        "alice",
      ),
    );
    const exchange = new URLSearchParams({
      client_id: registered.client_id,
      resource: oauth.resource,
      grant_type: "authorization_code",
      code: callback.searchParams.get("code")!,
      code_verifier: verifier,
      redirect_uri: "http://127.0.0.1:54124/callback",
    });
    await expect(oauth.token(exchange)).rejects.toMatchObject({
      code: "invalid_grant",
    });
    exchange.set("redirect_uri", params.get("redirect_uri")!);
    const tokens = await oauth.token(exchange);
    expect(
      (await oauth.authenticate(tokens.access_token)).grant.environment,
    ).toBe("development");
    params.set("redirect_uri", "http://127.0.0.1:54123/other");
    await expect(oauth.authorize(params)).rejects.toMatchObject({
      code: "invalid_request",
    });
    params.set("redirect_uri", "http://localhost:54123/callback");
    await expect(oauth.authorize(params)).rejects.toMatchObject({
      code: "invalid_request",
    });
    params.set("redirect_uri", "http://127.0.0.1:54123/callback");
    params.delete("code_challenge");
    await expect(oauth.authorize(params)).rejects.toMatchObject({
      code: "invalid_request",
    });
    const other = new OAuthService(
      { ...f.oauth.config, publicUrl: "https://different.example" },
      f.store,
      f.backend as never,
    );
    await expect(other.authorize(params)).rejects.toMatchObject({
      code: "invalid_client",
    });
  });
  it("expires unused clients after 90 days", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const client = await f.oauth.register({
      redirect_uris: ["http://localhost:12345/callback"],
    });
    vi.setSystemTime(Date.now() + 91 * 24 * 60 * 60 * 1000);
    const params = f.authorize();
    params.set("client_id", client.client_id);
    await expect(f.oauth.authorize(params)).rejects.toMatchObject({
      code: "invalid_client",
    });
  });
  it("extends active cached client IDs without duplicating registration records", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const client = await f.oauth.register({
      redirect_uris: ["http://localhost:8787/callback"],
    });
    const params = f.authorize();
    params.set("client_id", client.client_id);
    vi.setSystemTime(Date.now() + 80 * 24 * 60 * 60 * 1000);
    await expect(f.oauth.authorize(params)).resolves.toContain("/mcp/connect");
    vi.setSystemTime(Date.now() + 20 * 24 * 60 * 60 * 1000);
    await expect(f.oauth.authorize(params)).resolves.toContain("/mcp/connect");
  });
});

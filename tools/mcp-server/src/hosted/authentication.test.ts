import type { IncomingMessage } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { authenticateCredential } from "./authentication.js";
import { config, fixture } from "./test-helpers.js";

const key = (mode = "sandbox") => `launa_${mode}_${"a".repeat(48)}`;
function request(headers: Record<string, string>): IncomingMessage {
  return { headers, rawHeaders: Object.entries(headers).flat() } as IncomingMessage;
}
const identity = (environment = "development") =>
  Response.json({ environment, scopes: ["stats:read"] });

describe("hosted credential selection", () => {
  it.each(["authorization", "x-api-key"])("validates %s keys on every request without forwarding client headers", async (header) => {
    const f = fixture();
    const fetchFn = vi.fn(async (_: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("X-API-Key")).toBe(key());
      expect(new Headers(init?.headers).get("X-Launa-Environment")).toBeNull();
      expect(new Headers(init?.headers).get("Cookie")).toBeNull();
      expect(init?.redirect).toBe("error");
      return identity();
    });
    const req = request({ [header]: header === "authorization" ? `Bearer ${key()}` : key(), cookie: "untrusted", "x-launa-environment": "production" });
    for (let i = 0; i < 2; i++)
      expect(await authenticateCredential(req, config, f.oauth, fetchFn)).toEqual({ apiKey: key(), environment: "development" });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[0][0])).toBe(config.backendUrl + "/auth/api-key");
    expect(f.store.records.size).toBe(0);
  });
  it("keeps OAuth working and does not send access tokens to backend key validation", async () => {
    const f = fixture();
    const { tokens } = await f.connect();
    const fetchFn = vi.fn();
    const result = await authenticateCredential(request({ authorization: `Bearer ${tokens.access_token}` }), config, f.oauth, fetchFn);
    expect(result.environment).toBe("development");
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { cookie: "token=some-session" },
    { authorization: "Bearer some-frontend-jwt" },
    { authorization: "Basic something" },
    { "x-api-key": "an-oauth-token" },
    { "x-api-key": "launa_sandbox_invalid" },
    { authorization: `Bearer ${key()}`, "x-api-key": key() },
  ])("rejects invalid or ambiguous credentials", async (headers) => {
    const fetchFn = vi.fn();
    await expect(authenticateCredential(request(headers), config, fixture().oauth, fetchFn)).rejects.toMatchObject({ status: 401 });
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("rejects duplicate auth headers before trusting Node's normalized headers", async () => {
    const req = request({ authorization: `Bearer ${key()}` });
    req.rawHeaders.push("Authorization", `Bearer ${key("live")}`);
    const fetchFn = vi.fn();
    await expect(authenticateCredential(req, config, fixture().oauth, fetchFn)).rejects.toMatchObject({ status: 401 });
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it.each([401, 403, 500, 302])("fails closed for backend status %s", async (status) => {
    await expect(authenticateCredential(request({ "x-api-key": key() }), config, fixture().oauth,
      async () => new Response("sensitive upstream content", { status }))).rejects.toMatchObject({ status: 401, message: "invalid_token" });
  });
  it("rejects environment mismatch and malformed identity responses", async () => {
    const req = request({ "x-api-key": key("live") });
    await expect(authenticateCredential(req, config, fixture().oauth, async () => identity())).rejects.toMatchObject({ status: 401 });
    await expect(authenticateCredential(req, config, fixture().oauth, async () => Response.json({}))).rejects.toThrow();
    expect(await authenticateCredential(req, config, fixture().oauth, async () => identity("production"))).toMatchObject({ environment: "production" });
  });
});

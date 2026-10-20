import { describe, expect, it, vi } from "vitest";
import { SellerBackend } from "./backend.js";
import { config } from "./test-helpers.js";

describe("seller session bridge", () => {
  it("validates sessions through the existing backend and creates only the consented key", async () => {
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer test-only-session");
      expect(headers.get("Cookie")).toBeNull();
      expect(init?.redirect).toBe("error");
      if (String(url).endsWith("/auth/me")) return Response.json({ id: "a".repeat(24), email: "seller@example.com" });
      expect(String(url)).toBe(config.backendUrl + "/auth/api-keys");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ name: "MCP: Cursor", scopes: ["apis:read"] });
      expect(headers.get("X-Launa-Environment")).toBe("development");
      return Response.json({ id: "b".repeat(24), key: "test-only-key", environment: "development" });
    });
    const backend = new SellerBackend(config, fetchFn);
    expect((await backend.user("test-only-session")).id).toBe("a".repeat(24));
    expect(await backend.createKey("test-only-session", "development", ["apis:read"], "MCP: Cursor")).toEqual({ id: "b".repeat(24), key: "test-only-key" });
  });
  it.each([401, 403])("rejects revoked, blocked or non-session credentials (%s) without echoing backend content", async status => {
    const backend = new SellerBackend(config, async () => new Response("sensitive token", { status }));
    await expect(backend.user("test-only-bad-token")).rejects.toMatchObject({ status, message: "Launa session or permission rejected" });
  });
  it("rejects malformed user and wrong-environment key responses", async () => {
    const backend = new SellerBackend(config, async () => Response.json({ id: "bad" }));
    await expect(backend.user("test-only-session")).rejects.toThrow();
    const wrongEnv = new SellerBackend(config, async () => Response.json({ id: "key", key: "test-only-key", environment: "production" }));
    await expect(wrongEnv.createKey("test-only-session", "development", ["apis:read"], "MCP: Cursor")).rejects.toThrow();
  });
});

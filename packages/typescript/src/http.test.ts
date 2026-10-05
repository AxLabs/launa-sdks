import { describe, expect, it } from "vitest";
import { HttpClient } from "./http.js";

function captureHeaders(init?: { apiKey?: string; token?: string; environment?: string }) {
  let headers: Headers | undefined;
  const fetchFn: typeof fetch = async (_url, req) => {
    headers = new Headers(req?.headers);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const creds = init?.apiKey
    ? { type: "apiKey" as const, apiKey: init.apiKey }
    : init?.token
      ? { type: "jwt" as const, token: init.token }
      : undefined;
  const client = new HttpClient({
    baseUrl: "https://api.example",
    credentials: creds,
    environment: init?.environment,
    fetch: fetchFn,
  });
  return { client, headers: () => headers };
}

describe("HttpClient environment header", () => {
  it("sends X-Launa-Environment with an API key", async () => {
    const { client, headers } = captureHeaders({
      apiKey: "launa_sandbox_abc",
      environment: "development",
    });
    await client.request("/config/platform");
    expect(headers()?.get("X-API-Key")).toBe("launa_sandbox_abc");
    expect(headers()?.get("X-Launa-Environment")).toBe("development");
  });

  it("sends X-Launa-Environment without credentials", async () => {
    const { client, headers } = captureHeaders({ environment: "development" });
    await client.request("/config/platform");
    expect(headers()?.get("X-API-Key")).toBeNull();
    expect(headers()?.get("X-Launa-Environment")).toBe("development");
  });
});

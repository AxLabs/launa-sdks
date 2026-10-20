import type { HostedConfig, Environment } from "./config.js";
import { OAuthError } from "./errors.js";

/** Only this configured control-plane origin ever receives seller credentials. No redirects/retries. */
export function backendFetch(
  config: HostedConfig,
  fetchFn: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.origin !== config.backendUrl || url.username || url.password)
      throw new Error("Invalid backend origin");
    const headers = new Headers(init?.headers);
    return fetchFn(url, {
      ...init,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  };
}

export class SellerBackend {
  private fetchFn: typeof fetch;
  constructor(
    private config: HostedConfig,
    fetchFn: typeof fetch = fetch,
  ) {
    this.fetchFn = backendFetch(config, fetchFn);
  }
  private async request(
    path: string,
    session: string,
    environment: Environment,
    init: RequestInit = {},
  ) {
    const response = await this.fetchFn(this.config.backendUrl + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${session}`,
        "Content-Type": "application/json",
        "X-Launa-Environment": environment,
      },
    });
    if (!response.ok)
      throw new OAuthError(
        response.status === 401 ? 401 : 403,
        "access_denied",
        "Launa session or permission rejected",
      );
    return response.json() as Promise<Record<string, unknown>>;
  }
  async user(session: string) {
    const user = await this.request("/auth/me", session, "development");
    if (typeof user.id !== "string" || !/^[a-f0-9]{24}$/.test(user.id))
      throw new Error("Invalid account response");
    return {
      id: user.id,
      email: typeof user.email === "string" ? user.email : "",
    };
  }
  async createKey(
    session: string,
    environment: Environment,
    scopes: string[],
    name: string,
  ) {
    const key = await this.request("/auth/api-keys", session, environment, {
      method: "POST",
      body: JSON.stringify({ name, scopes }),
    });
    if (
      typeof key.id !== "string" ||
      typeof key.key !== "string" ||
      key.environment !== environment
    ) {
      throw new Error("Invalid API key response");
    }
    return { id: key.id, key: key.key };
  }
  async revokeKey(session: string, environment: Environment, id: string) {
    await this.request(
      `/auth/api-keys/${encodeURIComponent(id)}`,
      session,
      environment,
      { method: "DELETE" },
    );
  }
}

import type { ClientOptions, Credentials } from "./types.js";
import { parseApiError } from "./scopes.js";

export class Ax402Error extends Error {
  readonly status: number;
  readonly data?: Record<string, unknown>;

  constructor(status: number, message: string, data?: Record<string, unknown>) {
    super(message);
    this.name = "Ax402Error";
    this.status = status;
    this.data = data;
  }
}

export class HttpClient {
  private baseUrl: string;
  private credentials?: Credentials;
  private fetchFn: typeof fetch;
  private environment?: string;

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.credentials = opts.credentials;
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.environment = opts.environment;
  }

  setEnvironment(environment: string | undefined): void {
    this.environment = environment;
  }

  setCredentials(credentials: Credentials | undefined): void {
    this.credentials = credentials;
  }

  setApiKey(apiKey: string): void {
    this.credentials = { type: "apiKey", apiKey };
  }

  setToken(token: string): void {
    this.credentials = { type: "jwt", token };
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (this.credentials?.type === "apiKey") {
      headers.set("X-API-Key", this.credentials.apiKey);
    } else if (this.credentials?.type === "jwt") {
      headers.set("Authorization", `Bearer ${this.credentials.token}`);
      if (this.environment && !headers.has("X-Ax402-Environment")) {
        headers.set("X-Ax402-Environment", this.environment);
      }
    }

    const res = await this.fetchFn(`${this.baseUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Ax402Error(res.status, parseApiError(body || res.statusText), parseErrorData(body));
    }
    return parseJsonResponse<T>(res);
  }

  async requestMultipart<T>(path: string, form: FormData): Promise<T> {
    const headers = new Headers();
    if (this.credentials?.type === "apiKey") {
      headers.set("X-API-Key", this.credentials.apiKey);
    } else if (this.credentials?.type === "jwt") {
      headers.set("Authorization", `Bearer ${this.credentials.token}`);
      if (this.environment && !headers.has("X-Ax402-Environment")) {
        headers.set("X-Ax402-Environment", this.environment);
      }
    }
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Ax402Error(res.status, parseApiError(body || res.statusText), parseErrorData(body));
    }
    return parseJsonResponse<T>(res);
  }
}

function parseErrorData(body: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) return undefined as T;
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

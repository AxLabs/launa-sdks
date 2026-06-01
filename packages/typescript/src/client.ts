import { HttpClient } from "./http.js";
import type {
  API,
  APIKey,
  APIStats,
  BatchSettlement,
  ClientOptions,
  CreateAPIInput,
  CreateEndpointInput,
  CreatedAPIKey,
  DomainPlan,
  DomainSetup,
  Endpoint,
  OpenAPIImportInput,
  OpenAPIImportResult,
  ParsedOpenAPI,
  PlatformConfig,
  Settlement,
  StatsOverview,
  User,
} from "./types.js";

export type Ax402ClientOptions = ClientOptions & {
  apiKey?: string;
  token?: string;
};

export class Ax402Client {
  readonly http: HttpClient;
  readonly auth: AuthResource;
  readonly keys: KeysResource;
  readonly apis: APIsResource;
  readonly endpoints: EndpointsResource;
  readonly domains: DomainsResource;
  readonly openapi: OpenAPIResource;
  readonly stats: StatsResource;
  readonly settlements: SettlementsResource;
  readonly config: ConfigResource;

  constructor(opts: Ax402ClientOptions) {
    let credentials = opts.credentials;
    if (opts.apiKey) credentials = { type: "apiKey", apiKey: opts.apiKey };
    else if (opts.token) credentials = { type: "jwt", token: opts.token };

    this.http = new HttpClient({ ...opts, credentials });
    this.auth = new AuthResource(this.http);
    this.keys = new KeysResource(this.http);
    this.apis = new APIsResource(this.http);
    this.endpoints = new EndpointsResource(this.http);
    this.domains = new DomainsResource(this.http);
    this.openapi = new OpenAPIResource(this.http);
    this.stats = new StatsResource(this.http);
    this.settlements = new SettlementsResource(this.http);
    this.config = new ConfigResource(this.http);
  }

  setApiKey(apiKey: string): void {
    this.http.setApiKey(apiKey);
  }

  setToken(token: string): void {
    this.http.setToken(token);
  }
}

class AuthResource {
  constructor(private http: HttpClient) {}

  signup(email: string, password: string) {
    return this.http.request<{ token: string; user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  login(email: string, password: string) {
    return this.http.request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  logout() {
    return this.http.request<void>("/auth/logout", { method: "POST" });
  }

  me() {
    return this.http.request<User>("/auth/me");
  }

  verifyEmail(token: string) {
    return this.http.request<{ status: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  resendVerification() {
    return this.http.request<{ status: string }>("/auth/resend-verification", { method: "POST" });
  }

  changePassword(current_password: string, new_password: string) {
    return this.http.request<{ status: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  completeOnboarding() {
    return this.http.request<User>("/auth/onboarding/complete", { method: "POST" });
  }

  supportedNetworks() {
    return this.http.request<unknown>("/supported-networks");
  }
}

class KeysResource {
  constructor(private http: HttpClient) {}

  listScopes() {
    return this.http.request<{ scopes: string[] }>("/auth/scopes");
  }

  list() {
    return this.http.request<APIKey[]>("/auth/api-keys");
  }

  create(body: { name: string; scopes: string[] }) {
    return this.http.request<CreatedAPIKey>("/auth/api-keys", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  revoke(keyId: string) {
    return this.http.request<{ status: string }>(`/auth/api-keys/${keyId}`, { method: "DELETE" });
  }
}

class APIsResource {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.request<API[]>("/apis");
  }

  create(body: CreateAPIInput) {
    return this.http.request<API>("/apis", { method: "POST", body: JSON.stringify(body) });
  }

  get(id: string) {
    return this.http.request<API>(`/apis/${id}`);
  }

  update(id: string, body: Partial<CreateAPIInput>) {
    return this.http.request<API>(`/apis/${id}`, { method: "PUT", body: JSON.stringify(body) });
  }

  delete(id: string) {
    return this.http.request<void>(`/apis/${id}`, { method: "DELETE" });
  }
}

class EndpointsResource {
  constructor(private http: HttpClient) {}

  list(apiId: string) {
    return this.http.request<Endpoint[]>(`/apis/${apiId}/endpoints`);
  }

  create(apiId: string, body: CreateEndpointInput) {
    return this.http.request<Endpoint>(`/apis/${apiId}/endpoints`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  update(apiId: string, endpointId: string, body: Partial<CreateEndpointInput>) {
    return this.http.request<Endpoint>(`/apis/${apiId}/endpoints/${endpointId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete(apiId: string, endpointId: string) {
    return this.http.request<void>(`/apis/${apiId}/endpoints/${endpointId}`, { method: "DELETE" });
  }
}

class DomainsResource {
  constructor(private http: HttpClient) {}

  suggest(apex: string, prefix = "x402", upstreamPath = "/api") {
    const q = new URLSearchParams({ apex, prefix, upstream_path: upstreamPath });
    return this.http.request<DomainPlan>(`/domains/suggest?${q}`);
  }

  list(apiId: string) {
    return this.http.request<import("./types.js").APIDomain[]>(`/apis/${apiId}/domains`);
  }

  add(apiId: string, hostname: string) {
    return this.http.request<DomainSetup>(`/apis/${apiId}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname }),
    });
  }

  verify(apiId: string, domainId: string) {
    return this.http.request<{ status: string }>(`/apis/${apiId}/domains/${domainId}/verify`, {
      method: "POST",
    });
  }
}

class OpenAPIResource {
  constructor(private http: HttpClient) {}

  parseSpec(spec: string) {
    return this.http.request<ParsedOpenAPI>("/openapi/parse", {
      method: "POST",
      body: JSON.stringify({ spec }),
    });
  }

  parseFile(file: Blob, filename = "openapi.yaml") {
    const fd = new FormData();
    fd.append("file", file, filename);
    return this.http.requestMultipart<ParsedOpenAPI>("/openapi/parse", fd);
  }

  import(apiId: string, body: OpenAPIImportInput) {
    return this.http.request<OpenAPIImportResult>(`/apis/${apiId}/openapi/import`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

class StatsResource {
  constructor(private http: HttpClient) {}

  overview(days = 30) {
    return this.http.request<StatsOverview>(`/stats/overview?days=${days}`);
  }

  forApi(apiId: string, days = 30) {
    return this.http.request<APIStats>(`/apis/${apiId}/stats?days=${days}`);
  }
}

class SettlementsResource {
  constructor(private http: HttpClient) {}

  list(apiId: string) {
    return this.http.request<Settlement[]>(`/apis/${apiId}/settlements`);
  }

  listBatch(apiId: string) {
    return this.http.request<BatchSettlement[]>(`/apis/${apiId}/batch-settlements`);
  }
}

class ConfigResource {
  constructor(private http: HttpClient) {}

  platform() {
    return this.http.request<PlatformConfig>("/config/platform");
  }
}

import { HttpClient } from "./http.js";
import type {
  API,
  APICorsOrigins,
  APIKey,
  APIStats,
  BatchIntervals,
  BatchOverview,
  BatchSettlement,
  BillingModel,
  BillingOverview,
  BillingPackage,
  BillingPeriod,
  ClientOptions,
  CreateAPIInput,
  CreateEndpointInput,
  CreatedAPIKey,
  DiscoveryURLs,
  DomainPlan,
  DomainSetup,
  Endpoint,
  ExchangeRateLookup,
  ExchangeRatesAll,
  ExchangeRatesSupported,
  IncomeLedgerPage,
  IncomeSummary,
  LocalDevConfig,
  NotificationPreferences,
  OpenAPIImportInput,
  OpenAPIImportResult,
  ParsedOpenAPI,
  PaymentHistoryPage,
  PaymentHistoryQuery,
  PayoutRequest,
  PlatformConfig,
  PlatformSandboxWallet,
  PublicBillingCatalog,
  SellerIncomeEntry,
  UpstreamProbeRequest,
  UpstreamProbeResponse,
  WaitlistJoinInput,
  WaitlistJoinResponse,
  Settlement,
  StatsOverview,
  LoginResponse,
  PasskeyOptionsResponse,
  TOTPSetupResponse,
  User,
  FacilitatorEndpoint,
  FacilitatorEvent,
  FacilitatorEventsPage,
  FacilitatorStats,
  SupportedResponse,
  UserPasskey,
  WebhookDelivery,
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
  readonly billing: BillingResource;
  readonly income: IncomeResource;
  readonly exchangeRates: ExchangeRatesResource;
  readonly config: ConfigResource;
  readonly sandboxWallet: SandboxWalletResource;

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
    this.billing = new BillingResource(this.http);
    this.income = new IncomeResource(this.http);
    this.exchangeRates = new ExchangeRatesResource(this.http);
    this.config = new ConfigResource(this.http);
    this.sandboxWallet = new SandboxWalletResource(this.http);
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

  login(email: string, password: string, totpCode?: string) {
    return this.http.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, totp_code: totpCode || undefined }),
    });
  }

  verifyMfa(mfaToken: string, code: string) {
    return this.http.request<{ token: string; user: User }>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    });
  }

  totpSetup() {
    return this.http.request<TOTPSetupResponse>("/auth/totp/setup", { method: "POST" });
  }

  totpConfirm(code: string) {
    return this.http.request<{ totp_enabled: boolean; backup_codes: string[] }>("/auth/totp/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  totpDisable(password: string, code: string) {
    return this.http.request<{ totp_enabled: boolean }>("/auth/totp", {
      method: "DELETE",
      body: JSON.stringify({ password, code }),
    });
  }

  totpRegenerateBackup(password: string, code: string) {
    return this.http.request<{ backup_codes: string[] }>("/auth/totp/backup-codes", {
      method: "POST",
      body: JSON.stringify({ password, code }),
    });
  }

  listPasskeys() {
    return this.http.request<UserPasskey[]>("/auth/passkeys");
  }

  passkeyRegisterOptions() {
    return this.http.request<PasskeyOptionsResponse>("/auth/passkeys/register/options", { method: "POST" });
  }

  passkeyRegisterVerify(body: {
    session_token: string;
    name: string;
    password: string;
    credential: unknown;
  }) {
    return this.http.request<UserPasskey>("/auth/passkeys/register/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  passkeyLoginOptions() {
    return this.http.request<PasskeyOptionsResponse>("/auth/passkeys/login/options", { method: "POST" });
  }

  passkeyLoginVerify(sessionToken: string, credential: unknown) {
    return this.http.request<{ token: string; user: User }>("/auth/passkeys/login/verify", {
      method: "POST",
      body: JSON.stringify({ session_token: sessionToken, credential }),
    });
  }

  deletePasskey(passkeyId: string, password: string) {
    return this.http.request<void>(`/auth/passkeys/${passkeyId}`, {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
  }

  logout() {
    return this.http.request<void>("/auth/logout", { method: "POST" });
  }

  me() {
    return this.http.request<User>("/auth/me");
  }

  verifyEmail(token: string) {
    return this.http.request<{ status: string; token: string; user: User }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  resendVerification() {
    return this.http.request<{ status: string }>("/auth/resend-verification", { method: "POST" });
  }

  forgotPassword(email: string) {
    return this.http.request<{ status: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  resetPassword(token: string, password: string) {
    return this.http.request<{ status: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  changePassword(current_password: string, new_password: string) {
    return this.http.request<{ status: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  patchPreferences(body: { display_currency?: string }) {
    return this.http.request<{ display_currency?: string; status?: string }>("/auth/me/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  deleteAccount(password: string, confirm_email: string) {
    return this.http.request<void>("/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ password, confirm_email }),
    });
  }

  notificationPreferences() {
    return this.http.request<NotificationPreferences>("/auth/me/notifications");
  }

  updateNotificationPreferences(body: Partial<NotificationPreferences>) {
    return this.http.request<NotificationPreferences>("/auth/me/notifications", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  completeOnboarding(skipped?: boolean) {
    const body = skipped ? JSON.stringify({ skipped: true }) : undefined;
    return this.http.request<User>("/auth/onboarding/complete", {
      method: "POST",
      body,
    });
  }

  getFacilitator() {
    return this.http.request<FacilitatorEndpoint>("/auth/facilitator");
  }

  refreshFacilitatorSupported() {
    return this.http.request<SupportedResponse>("/auth/facilitator/supported");
  }

  facilitatorStats(days = 30) {
    return this.http.request<FacilitatorStats>(`/auth/facilitator/stats?days=${days}`);
  }

  facilitatorEvents(query?: { days?: number; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (query?.days !== undefined) q.set("days", String(query.days));
    if (query?.limit !== undefined) q.set("limit", String(query.limit));
    if (query?.offset !== undefined) q.set("offset", String(query.offset));
    const suffix = q.toString() ? `?${q}` : "";
    return this.http.request<FacilitatorEventsPage>(`/auth/facilitator/events${suffix}`);
  }

  updatePreferredEnvironment(environment: "production" | "development") {
    return this.http.request<{ preferred_environment: string }>("/auth/me/environment", {
      method: "PATCH",
      body: JSON.stringify({ environment }),
    });
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

  /** Computed gateway discovery URLs for all verified hosts */
  discovery(id: string) {
    return this.http.request<DiscoveryURLs>(`/apis/${id}/discovery`);
  }

  update(id: string, body: Partial<CreateAPIInput>) {
    return this.http.request<API>(`/apis/${id}`, { method: "PUT", body: JSON.stringify(body) });
  }

  delete(id: string) {
    return this.http.request<void>(`/apis/${id}`, { method: "DELETE" });
  }

  batchOverview(id: string) {
    return this.http.request<BatchOverview>(`/apis/${id}/batch`);
  }

  updateBatchSettings(id: string, settings: BatchIntervals) {
    return this.http.request<BatchOverview>(`/apis/${id}/batch/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  checkSlugAvailability(slug: string, excludeApiId?: string) {
    const q = new URLSearchParams({ slug });
    if (excludeApiId) q.set("exclude_api_id", excludeApiId);
    return this.http.request<{ available: boolean }>(`/apis/slug-availability?${q}`);
  }

  probeUpstream(apiId: string, body?: UpstreamProbeRequest) {
    return this.http.request<UpstreamProbeResponse>(`/apis/${apiId}/readiness/upstream`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  listWebhookDeliveries(apiId: string) {
    return this.http.request<WebhookDelivery[]>(`/apis/${apiId}/webhook-deliveries`);
  }

  getCors(apiId: string) {
    return this.http.request<APICorsOrigins>(`/apis/${apiId}/cors`);
  }

  putCors(apiId: string, origins: string[]) {
    return this.http.request<APICorsOrigins>(`/apis/${apiId}/cors`, {
      method: "PUT",
      body: JSON.stringify({ origins }),
    });
  }

  addCorsOrigin(apiId: string, origin: string) {
    return this.http.request<APICorsOrigins>(`/apis/${apiId}/cors`, {
      method: "POST",
      body: JSON.stringify({ origin }),
    });
  }

  removeCorsOrigin(apiId: string, origin: string) {
    const q = new URLSearchParams({ origin });
    return this.http.request<APICorsOrigins>(`/apis/${apiId}/cors?${q}`, { method: "DELETE" });
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

  delete(apiId: string, domainId: string) {
    return this.http.request<void>(`/apis/${apiId}/domains/${domainId}`, { method: "DELETE" });
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

  listHistory(query: PaymentHistoryQuery = {}) {
    const q = new URLSearchParams();
    const days = query.days ?? 30;
    q.set("days", days === 0 ? "0" : String(days));
    if (query.limit != null) q.set("limit", String(query.limit));
    if (query.offset != null) q.set("offset", String(query.offset));
    if (query.apiId) q.set("api_id", query.apiId);
    return this.http.request<PaymentHistoryPage>(`/settlements?${q}`);
  }

  exportHistoryUrl(query: PaymentHistoryQuery & { format: "csv" | "json" }) {
    const q = new URLSearchParams();
    const days = query.days ?? 30;
    q.set("days", days === 0 ? "0" : String(days));
    if (query.apiId) q.set("api_id", query.apiId);
    q.set("format", query.format);
    if (query.format === "json") q.set("download", "1");
    return `/settlements?${q}`;
  }

  exportHistory(query: PaymentHistoryQuery & { format: "csv" | "json" }) {
    return this.http.requestText(this.exportHistoryUrl(query));
  }
}

class BillingResource {
  constructor(private http: HttpClient) {}

  overview() {
    return this.http.request<BillingOverview>("/billing");
  }

  packages() {
    return this.http.request<{ packages: BillingPackage[] }>("/billing/packages");
  }

  invoices() {
    return this.http.request<{ invoices: BillingPeriod[] }>("/billing/invoices");
  }

  setModel(model: BillingModel) {
    return this.http.request<BillingOverview>("/billing/model", {
      method: "POST",
      body: JSON.stringify({ model }),
    });
  }
}

class SandboxWalletResource {
  constructor(private http: HttpClient) {}

  get() {
    return this.http.request<PlatformSandboxWallet>("/sandbox-wallet");
  }

  reset() {
    return this.http.request<PlatformSandboxWallet>("/sandbox-wallet/reset", { method: "POST" });
  }
}

class IncomeResource {
  constructor(private http: HttpClient) {}

  summary() {
    return this.http.request<IncomeSummary>("/income/summary");
  }

  ledger(query: { limit?: number; offset?: number; apiId?: string; network?: string } = {}) {
    const q = new URLSearchParams();
    if (query.limit != null) q.set("limit", String(query.limit));
    if (query.offset != null) q.set("offset", String(query.offset));
    if (query.apiId) q.set("api_id", query.apiId);
    if (query.network) q.set("network", query.network);
    const suffix = q.size ? `?${q}` : "";
    return this.http.request<IncomeLedgerPage>(`/income/ledger${suffix}`);
  }

  ledgerEntry(entryId: string) {
    return this.http.request<SellerIncomeEntry>(`/income/ledger/${entryId}`);
  }

  payoutRequests() {
    return this.http.request<PayoutRequest[]>("/income/payout-requests");
  }

  createPayoutRequest(body: {
    network: string;
    asset: string;
    amount_atomic: number;
    destination_address: string;
  }) {
    return this.http.request<PayoutRequest>("/income/payout-requests", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  cancelPayoutRequest(id: string) {
    return this.http.request<void>(`/income/payout-requests/${id}`, { method: "DELETE" });
  }
}

class ExchangeRatesResource {
  constructor(private http: HttpClient) {}

  /** Rates for all enabled platform payment tokens (default quote: usd). */
  list(query: { quote?: string; date?: string } = {}) {
    const q = new URLSearchParams();
    if (query.quote) q.set("quote", query.quote);
    if (query.date) q.set("date", query.date);
    const suffix = q.size ? `?${q}` : "";
    return this.http.request<ExchangeRatesAll>(`/exchange-rates${suffix}`);
  }

  supported() {
    return this.http.request<ExchangeRatesSupported>("/exchange-rates/supported");
  }

  lookup(query: { network: string; asset: string; quote?: string; date?: string }) {
    const q = new URLSearchParams();
    q.set("network", query.network);
    q.set("asset", query.asset);
    if (query.quote) q.set("quote", query.quote);
    if (query.date) q.set("date", query.date);
    return this.http.request<ExchangeRateLookup>(`/exchange-rates/lookup?${q}`);
  }
}

class ConfigResource {
  constructor(private http: HttpClient) {}

  platform() {
    return this.http.request<PlatformConfig>("/config/platform");
  }

  billing() {
    return this.http.request<PublicBillingCatalog>("/config/billing");
  }

  joinWaitlist(body: WaitlistJoinInput) {
    return this.http.request<WaitlistJoinResponse>("/waitlist", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  localDev() {
    return this.http.request<LocalDevConfig>("/config/local-dev");
  }
}

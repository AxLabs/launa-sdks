export type Credentials =
  | { type: "apiKey"; apiKey: string }
  | { type: "jwt"; token: string };

export type ClientOptions = {
  baseUrl: string;
  credentials?: Credentials;
  fetch?: typeof fetch;
};

export type User = {
  id: string;
  email: string;
  onboarding_completed?: boolean;
  email_verified?: boolean;
};

export type APIKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
};

export type CreatedAPIKey = APIKey & { key: string };

export type PlatformConfig = {
  platform_domain: string;
  gateway_cname_target: string;
  gateway_port: number;
  admin_host: string;
  custom_domain_tls?: boolean;
};

export type DomainPlan = {
  gateway_hostname: string;
  upstream_base_url: string;
  cname_record: string;
  cname_target: string;
  txt_record: string;
};

export type DomainSetup = {
  id?: string;
  hostname: string;
  verification_token: string;
  verification_record: string;
  cname_record: string;
  cname_target: string;
  instructions?: string[];
};

export type DomainTLSStatus = "ready" | "pending" | "unavailable";

export type APIDomain = {
  id?: string;
  hostname: string;
  verification_token?: string;
  verification_record?: string;
  cname_record?: string;
  cname_target?: string;
  verified_at?: string | null;
  tls_status?: DomainTLSStatus;
  is_primary?: boolean;
  is_default_subdomain?: boolean;
};

export type UpstreamAuth = {
  type: string;
  header?: string;
  configured?: boolean;
};

export type UpstreamAuthInput = {
  type: string;
  header?: string;
  value?: string;
};

export type GatewayServerSummary = {
  id: string;
  name: string;
  region?: string;
  public_hostname: string;
  cname_target: string;
  status: "active" | "draining" | "offline";
};

export type API = {
  id: string;
  name: string;
  slug: string;
  upstream_base_url: string;
  upstream_auth?: UpstreamAuth;
  pay_to_mode: "user_wallet" | "platform_wallet";
  pay_to_address?: string;
  receiver_authorizer_address?: string;
  batch_withdraw_delay?: number;
  gateway_server_id?: string;
  gateway_server?: GatewayServerSummary;
  gateway_cname_target?: string;
  domains: APIDomain[];
};

export type CreateAPIInput = {
  name: string;
  slug: string;
  upstream_base_url: string;
  pay_to_mode?: API["pay_to_mode"];
  pay_to_address?: string;
  upstream_auth?: UpstreamAuthInput;
};

export type AcceptOption = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  max_timeout_seconds?: number;
  extra?: Record<string, unknown>;
};

export type Endpoint = {
  id: string;
  api_id: string;
  method: string;
  path_pattern: string;
  description?: string;
  enabled: boolean;
  accepts: AcceptOption[];
  upstream_auth?: UpstreamAuth;
};

export type CreateEndpointInput = {
  method: string;
  path_pattern: string;
  description?: string;
  enabled?: boolean;
  accepts: AcceptOption[];
  upstream_auth?: UpstreamAuthInput;
  clear_upstream_auth?: boolean;
};

export type Settlement = {
  id: string;
  type?: string;
  payer: string;
  tx: string;
  amount: string;
  network: string;
  created_at: string;
};

export type BatchSettlement = {
  id: string;
  type: string;
  tx: string;
  network: string;
  amount?: string;
  created_at: string;
};

export type EarningsByNetwork = { network: string; amount: string; count: number };
export type DayCount = { date: string; count: number };
export type DayAmount = { date: string; amount: string; count: number };
export type PayerStats = { payer: string; count: number; amount: string; network?: string };

export type PaymentActivity = {
  id: string;
  api_id?: string;
  type?: string;
  payer: string;
  amount: string;
  network: string;
  tx?: string;
  created_at: string;
};

export type ParsedOpenAPIOperation = {
  id: string;
  method: string;
  path: string;
  path_pattern: string;
  summary?: string;
  description?: string;
  tags?: string[];
};

export type ParsedOpenAPI = {
  title?: string;
  version?: string;
  server_urls?: string[];
  suggested_upstream?: string;
  operations: ParsedOpenAPIOperation[];
};

export type OpenAPIImportResult = {
  created: number;
  skipped: number;
  skipped_keys?: string[];
  endpoints: Endpoint[];
};

export type StatsOverview = {
  total_requests: number;
  payment_required: number;
  paid_requests: number;
  total_earnings: EarningsByNetwork[];
  voucher_earnings?: EarningsByNetwork[];
  earnings_by_day: DayAmount[];
  requests_by_day: DayCount[];
  paid_by_day: DayCount[];
  unique_payers: number;
  top_payers: PayerStats[];
  recent_payments: PaymentActivity[];
  top_apis: APIStats[];
};

export type APIStats = {
  api_id: string;
  api_name?: string;
  total_requests: number;
  paid_requests: number;
  payment_required: number;
  earnings: EarningsByNetwork[];
  voucher_earnings?: EarningsByNetwork[];
  earnings_by_day: DayAmount[];
  by_day: DayCount[];
  by_endpoint: {
    endpoint_id: string;
    method?: string;
    path_pattern?: string;
    total_requests: number;
    paid_requests: number;
    payment_required: number;
    earnings_amount?: string;
    earnings_count?: number;
  }[];
  unique_payers: number;
  top_payers: PayerStats[];
  recent_payments: PaymentActivity[];
};

export type OpenAPIImportInput = {
  operations: { method: string; path_pattern: string; description?: string }[];
  accepts: AcceptOption[];
};

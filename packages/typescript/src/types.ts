export type Credentials =
  | { type: "apiKey"; apiKey: string }
  | { type: "jwt"; token: string };

export type ClientOptions = {
  baseUrl: string;
  credentials?: Credentials;
  fetch?: typeof fetch;
  environment?: Environment;
};

export type Environment = "production" | "development";

export type User = {
  id: string;
  email: string;
  onboarding_completed?: boolean;
  onboarding_skipped_at?: string;
  email_verified?: boolean;
  totp_enabled?: boolean;
  passkey_count?: number;
  preferred_environment?: Environment;
  display_currency?: string;
};

export type SupportedKind = {
  scheme?: string;
  network?: string;
  asset?: string;
  x402Version?: number;
  extra?: Record<string, unknown>;
};

export type SupportedResponse = {
  kinds?: SupportedKind[];
  signers?: Record<string, string[]>;
};

export type FacilitatorEndpoint = {
  base_url: string;
  hostname: string;
  slug: string;
  provision_pending?: boolean;
  environment?: Environment;
  uses_dev_facilitator?: boolean;
  supported?: SupportedResponse;
  supported_error?: string;
};

export type FacilitatorStats = {
  verify_count: number;
  settle_count: number;
  verify_ok: number;
  settle_ok: number;
  success_rate: number;
};

export type FacilitatorEvent = {
  id: string;
  user_id: string;
  event_type: string;
  hostname: string;
  success: boolean;
  created_at: string;
  scheme?: string;
  network?: string;
  asset?: string;
  amount?: string;
  pay_to?: string;
  payer?: string;
  transaction?: string;
  reason?: string;
  message?: string;
};

export type FacilitatorEventsPage = {
  items: FacilitatorEvent[];
  total: number;
};

export type UserPasskey = {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string | null;
};

export type PasskeyOptionsResponse = {
  session_token: string;
  publicKey: unknown;
};

export type LoginResponse =
  | { token: string; user: User; mfa_required?: false }
  | { mfa_required: true; mfa_token: string };

export type TOTPSetupResponse = {
  secret: string;
  otpauth_url: string;
};

export type APIKey = {
  id: string;
  environment?: Environment;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
};

export type CreatedAPIKey = APIKey & { key: string };

export type PaymentToken = {
  id: string;
  symbol: string;
  name: string;
  network: string;
  asset: string;
  decimals: number;
  schemes: string[];
  extra?: Record<string, unknown>;
  enabled: boolean;
  sort_order?: number;
};

export type PlatformAccess = {
  mode: "open" | "waitlist_only";
  waitlist_headline?: string;
  waitlist_subhead?: string;
};

export type PlatformConfig = {
  platform_domain: string;
  platform_domains?: { domain: string; label?: string; is_primary?: boolean; enabled?: boolean }[];
  development_platform_domains?: { domain: string; label?: string; is_primary?: boolean; enabled?: boolean }[];
  gateway_cname_target: string;
  gateway_port: number;
  admin_host: string;
  custom_domain_tls?: boolean;
  payment_tokens?: PaymentToken[];
  access?: PlatformAccess;
  testnet_facilitator_internal_url?: string;
  testnet_facilitator_external_url?: string;
};

export type WaitlistJoinInput = {
  email: string;
  name?: string;
  company?: string;
  source?: string;
};

export type WaitlistJoinResponse = {
  id: string;
  email: string;
};

export type LocalDevPaymentToken = {
  symbol: string;
  name: string;
  asset: string;
  decimals: number;
  network: string;
};

export type LocalDevConfig = {
  enabled: boolean;
  chain_id?: number;
  network?: string;
  network_name?: string;
  rpc_url?: string;
  native_symbol?: string;
  faucet_enabled?: boolean;
  payment_token?: LocalDevPaymentToken;
};

export type DevBalances = {
  eth_wei: string;
  usdc_base: string;
};

export type DevFaucetResult = Record<string, unknown>;

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
  environment?: Environment;
  name: string;
  slug: string;
  upstream_base_url: string;
  upstream_auth?: UpstreamAuth;
  pay_to_mode: "user_wallet" | "platform_wallet";
  pay_to_address?: string;
  accept_all_tokens?: boolean;
  accepted_token_ids?: string[];
  receiver_authorizer_address?: string;
  batch_withdraw_delay?: number;
  gateway_server_id?: string;
  gateway_server?: GatewayServerSummary;
  gateway_cname_target?: string;
  webhook_url?: string;
  webhook_configured?: boolean;
  /** Agent-facing usage hints for generated OpenAPI info.x-guidance */
  discovery_guidance?: string;
  /** Overrides owner email in OpenAPI info.contact.email */
  discovery_contact_email?: string;
  /** Semver for generated OpenAPI info.version (default 1.0.0) */
  openapi_version?: string;
  domains: APIDomain[];
  cors_allowed_origins?: string[];
};

export type CreateAPIInput = {
  name: string;
  slug: string;
  upstream_base_url: string;
  pay_to_mode?: API["pay_to_mode"];
  pay_to_address?: string;
  accept_all_tokens?: boolean;
  accepted_token_ids?: string[];
  upstream_auth?: UpstreamAuthInput;
  webhook_url?: string;
  webhook_secret?: string;
  clear_webhook?: boolean;
  cors_allowed_origins?: string[];
  discovery_guidance?: string;
  discovery_contact_email?: string;
  openapi_version?: string;
};

export type APICorsOrigins = {
  origins: string[];
};

/** Alias used by the seller dashboard; same shape as {@link APICorsOrigins}. */
export type CorsConfig = APICorsOrigins;

export type WebhookDelivery = {
  id: string;
  api_id: string;
  user_id: string;
  settlement_id?: string;
  tx: string;
  network: string;
  delivery_id: string;
  event: string;
  status: "pending" | "success" | "failed" | string;
  attempts: number;
  next_attempt_at: string;
  last_status_code?: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
};

export type UpstreamProbeResult = {
  endpoint_id: string;
  method: string;
  path_pattern: string;
  probe_path?: string;
  upstream_url?: string;
  status?: number;
  ok: boolean;
  error?: string;
};

export type UpstreamProbeResponse = {
  ok: boolean;
  results: UpstreamProbeResult[];
  error?: string;
};

export type UpstreamProbeRequest = {
  probes?: Array<{ endpoint_id: string; path?: string }>;
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
  /** JSON Schema for OpenAPI requestBody / bazaar input */
  request_schema?: Record<string, unknown>;
  /** JSON Schema for OpenAPI 200 response / bazaar output */
  response_schema?: Record<string, unknown>;
  /** How schemas were produced: openapi import, inferred defaults, or manual */
  schema_source?: "openapi" | "inferred" | "manual";
  /** Present when the endpoint was created with a TTL (ephemeral / one-time). */
  ttl?: number;
  expires_at?: string;
};

export type CreateEndpointInput = {
  method: string;
  path_pattern: string;
  description?: string;
  enabled?: boolean;
  accepts: AcceptOption[];
  upstream_auth?: UpstreamAuthInput;
  clear_upstream_auth?: boolean;
  request_schema?: Record<string, unknown>;
  response_schema?: Record<string, unknown>;
  /** When true, clears schemas and re-infers defaults */
  clear_schemas?: boolean;
  /** Optional lifetime in seconds; endpoint is deleted after first settle or expiry. */
  ttl?: number;
};

export type DiscoveryHostURLs = {
  host: string;
  openapi_url: string;
  well_known_url: string;
  is_primary: boolean;
};

/** Control-plane GET /apis/{id}/discovery response */
export type DiscoveryURLs = {
  primary_host: string;
  hosts: string[];
  openapi_url: string;
  well_known_url: string;
  endpoint_count: number;
  discoverable_endpoint_count: number;
  host_urls?: DiscoveryHostURLs[];
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
export type PayerStats = {
  payer: string;
  count: number;
  amount: string;
  network?: string;
  asset?: string;
};

export type PaymentActivity = {
  id: string;
  api_id?: string;
  type?: string;
  payer: string;
  amount: string;
  asset?: string;
  network: string;
  tx?: string;
  created_at: string;
};

export type PaymentHistoryPage = {
  items: PaymentActivity[];
  total: number;
  limit: number;
  offset: number;
};

export type PaymentHistoryQuery = {
  days?: number;
  limit?: number;
  offset?: number;
  apiId?: string;
};

export type ParsedOpenAPIOperation = {
  id: string;
  method: string;
  path: string;
  path_pattern: string;
  summary?: string;
  description?: string;
  tags?: string[];
  request_schema?: Record<string, unknown>;
  response_schema?: Record<string, unknown>;
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

export type DayFiatAmount = {
  date: string;
  amount: string;
  currency: string;
  count: number;
};

export type StatsOverview = {
  total_requests: number;
  payment_required: number;
  paid_requests: number;
  total_earnings: EarningsByNetwork[];
  voucher_earnings?: EarningsByNetwork[];
  display_currency?: string;
  total_earnings_fiat?: string;
  voucher_earnings_fiat?: string;
  earnings_by_day: DayAmount[];
  earnings_by_day_fiat?: DayFiatAmount[];
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
  display_currency?: string;
  total_earnings_fiat?: string;
  voucher_earnings_fiat?: string;
  earnings_by_day: DayAmount[];
  earnings_by_day_fiat?: DayFiatAmount[];
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
  operations: {
    method: string;
    path_pattern: string;
    description?: string;
    request_schema?: Record<string, unknown>;
    response_schema?: Record<string, unknown>;
  }[];
  accepts: AcceptOption[];
};

export type BatchIntervals = {
  claim_interval_secs: number;
  settle_interval_secs: number;
  refund_interval_secs: number;
};

export type BatchChannelPending = {
  pending_id: string;
  signed_max_claimable: string;
  expires_at: string;
};

export type BatchChannel = {
  channel_id: string;
  updated_at: string;
  payer: string;
  payer_authorizer?: string;
  receiver: string;
  receiver_authorizer?: string;
  channel_salt?: string;
  token: string;
  withdraw_delay_secs: number;
  balance: string;
  total_claimed: string;
  unclaimed_escrow: string;
  charged_cumulative: string;
  signed_max_claimable: string;
  voucher_signature?: string;
  outstanding_voucher_gap: string;
  withdraw_requested_at: number;
  refund_nonce: number;
  last_request_at?: string;
  onchain_synced_at?: string;
  has_pending_request: boolean;
  pending_request?: BatchChannelPending;
};

export type BatchActivityRow = {
  id: string;
  type: string;
  payer?: string;
  tx: string;
  amount?: string;
  request_amount?: string;
  network: string;
  endpoint_id?: string;
  created_at: string;
};

export type BatchOverview = {
  has_batch_endpoints: boolean;
  settings: BatchIntervals;
  withdraw_delay_secs: number;
  channels: BatchChannel[];
  batch_settlements: BatchActivityRow[];
  vouchers: BatchActivityRow[];
  deposits: BatchActivityRow[];
};

export type BillingModel = "free" | "package" | "payg";
export type BillingStatus = "active" | "grace" | "suspended" | "exempt";

export type PendingPurchase = {
  package_id: string;
  package_name?: string;
  settlements: number;
  status: string;
  created_at: string;
};

export type RecentPurchase = {
  package_id: string;
  settlements: number;
  created_at: string;
  provider?: string;
};

export type BillingOverview = {
  model: BillingModel;
  status: BillingStatus;
  package_credits: number;
  free_used: number;
  free_limit: number;
  usage_percent: number;
  payg_gmv_atomic: number;
  payg_fees_atomic: number;
  period_start: string;
  stripe_enabled: boolean;
  crypto_enabled: boolean;
  stripe_publishable_key?: string;
  grace_started_at?: string;
  payment_action_required?: boolean;
  billing_enabled?: boolean;
  checkout_available?: boolean;
  pending_purchase?: PendingPurchase | null;
  recent_purchases?: RecentPurchase[];
};

export type BillingPackage = {
  id: string;
  name?: string;
  price_cents?: number;
  settlements: number;
  enabled: boolean;
  sort_order: number;
};

export type BillingPeriod = {
  id: string;
  period_start: string;
  period_end: string;
  gmv_atomic: number;
  fees_atomic: number;
  amount_cents: number;
  status: string;
};

export type PublicBillingCatalog = {
  free_settlements_per_month: number;
  packages: BillingPackage[];
};

export type SellerIncomeEntryType =
  | "settlement_credit"
  | "payout_debit"
  | "payout_hold"
  | "payout_release"
  | "adjustment";

export type SellerCustodialAccount = {
  user_id: string;
  network: string;
  asset: string;
  available_atomic: number;
  pending_hold_atomic: number;
  updated_at: string;
};

export type IncomeSummary = {
  lifetime_earnings_atomic: number;
  lifetime_earnings_fiat?: string;
  display_currency?: string;
  custodial_balances: SellerCustodialAccount[];
  pending_payouts: number;
  income_enabled: boolean;
};

export type ExchangeRatesSupported = {
  currencies: string[];
  default: string;
};

export type ExchangeRateLookup = {
  price_token_id: string;
  rate: string;
  rate_date: string;
  source: string;
  quote: string;
};

export type TokenExchangeRate = {
  token_id: string;
  symbol: string;
  network: string;
  asset: string;
  price_token_id: string;
  rate: string;
  source: string;
};

export type ExchangeRatesAll = {
  quote: string;
  rate_date: string;
  rates: TokenExchangeRate[];
};

export type SellerIncomeEntry = {
  id: string;
  user_id: string;
  api_id?: string;
  type: SellerIncomeEntryType;
  amount_atomic: number;
  asset: string;
  network: string;
  tx_hash?: string;
  payer?: string;
  pay_to?: string;
  pay_to_mode?: string;
  source_event_id?: string;
  settlement_id?: string;
  payout_request_id?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  ledger_source?: string;
  counts_toward_earnings?: boolean;
  custodial: boolean;
  balance_after?: number;
  reconciled_at?: string;
  created_at: string;
};

export type IncomeLedgerPage = {
  items: SellerIncomeEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type PayoutRequestStatus =
  | "pending"
  | "approved"
  | "sent"
  | "confirmed"
  | "rejected"
  | "cancelled";

export type PayoutRequest = {
  id: string;
  user_id: string;
  network: string;
  asset: string;
  amount_atomic: number;
  destination_address: string;
  status: PayoutRequestStatus;
  requested_at: string;
  sent_tx_hash?: string;
  confirmed_at?: string;
  rejection_reason?: string;
};

export type PlatformSandboxWallet = {
  address: string;
  private_key: string;
  private_key_redacted: string;
};

export type NotificationPreferences = {
  billing_alerts: boolean;
  weekly_summary: boolean;
  payout_alerts: boolean;
};

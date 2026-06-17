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
  domains: APIDomain[];
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
  custodial_balances: SellerCustodialAccount[];
  pending_payouts: number;
  income_enabled: boolean;
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

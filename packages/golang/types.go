package launa

import "encoding/json"

type User struct {
	ID                  string `json:"id"`
	Email               string `json:"email"`
	OnboardingCompleted bool   `json:"onboarding_completed"`
	EmailVerified       bool   `json:"email_verified"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type PlatformConfig struct {
	PlatformDomain                  string `json:"platform_domain"`
	GatewayCNAMETarget              string `json:"gateway_cname_target"`
	GatewayPort                     int    `json:"gateway_port"`
	AdminHost                       string `json:"admin_host"`
	TestnetFacilitatorInternalURL   string `json:"testnet_facilitator_internal_url,omitempty"`
	TestnetFacilitatorExternalURL   string `json:"testnet_facilitator_external_url,omitempty"`
}

type LocalDevPaymentToken struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Asset    string `json:"asset"`
	Decimals int    `json:"decimals"`
	Network  string `json:"network"`
}

type LocalDevConfig struct {
	Enabled        bool                  `json:"enabled"`
	ChainID        int64                 `json:"chain_id,omitempty"`
	Network        string                `json:"network,omitempty"`
	NetworkName    string                `json:"network_name,omitempty"`
	RPCURL         string                `json:"rpc_url,omitempty"`
	NativeSymbol   string                `json:"native_symbol,omitempty"`
	FaucetEnabled  bool                  `json:"faucet_enabled,omitempty"`
	PaymentToken   *LocalDevPaymentToken `json:"payment_token,omitempty"`
}

type DevBalances struct {
	EthWei   string `json:"eth_wei"`
	USDCBase string `json:"usdc_base"`
}

type SandboxWallet struct {
	Address            string `json:"address"`
	PrivateKey         string `json:"private_key"`
	PrivateKeyRedacted string `json:"private_key_redacted"`
}

type AcceptOption struct {
	Scheme            string         `json:"scheme"`
	Network           string         `json:"network"`
	Asset             string         `json:"asset"`
	Amount            string         `json:"amount"`
	MaxTimeoutSeconds int            `json:"max_timeout_seconds,omitempty"`
	Extra             map[string]any `json:"extra,omitempty"`
}

type GatewayServerSummary struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Region         string `json:"region,omitempty"`
	PublicHostname string `json:"public_hostname"`
	CNAMETarget    string `json:"cname_target"`
	Status         string `json:"status"`
}

type API struct {
	ID                    string                `json:"id"`
	Name                  string                `json:"name"`
	Slug                  string                `json:"slug"`
	UpstreamBaseURL       string                `json:"upstream_base_url"`
	PayToMode             string                `json:"pay_to_mode"`
	PayToAddress          string                `json:"pay_to_address,omitempty"`
	PayToAddresses        map[string]string     `json:"pay_to_addresses,omitempty"` // CAIP-2 → recipient
	GatewayServerID       string                `json:"gateway_server_id,omitempty"`
	GatewayServer         *GatewayServerSummary `json:"gateway_server,omitempty"`
	GatewayCNAMETarget    string                `json:"gateway_cname_target,omitempty"`
	WebhookURL            string                `json:"webhook_url,omitempty"`
	WebhookConfigured     bool                  `json:"webhook_configured,omitempty"`
	CORSAllowedOrigins    []string              `json:"cors_allowed_origins,omitempty"`
	DiscoveryGuidance     string                `json:"discovery_guidance,omitempty"`
	DiscoveryContactEmail string                `json:"discovery_contact_email,omitempty"`
	OpenAPIVersion        string                `json:"openapi_version,omitempty"`
	Domains               []APIDomain           `json:"domains"`
}

type APIDomain struct {
	ID       string `json:"id,omitempty"`
	Hostname string `json:"hostname"`
}

type CreateAPIInput struct {
	Name                  string   `json:"name"`
	Slug                  string   `json:"slug"`
	UpstreamBaseURL       string   `json:"upstream_base_url"`
	PayToMode             string   `json:"pay_to_mode,omitempty"`
	PayToAddress          string   `json:"pay_to_address,omitempty"`
	// PayToAddresses is CAIP-2 → recipient. No omitempty so {} encodes and clears on update.
	PayToAddresses        map[string]string `json:"pay_to_addresses"`
	WebhookURL            string   `json:"webhook_url,omitempty"`
	WebhookSecret         string   `json:"webhook_secret,omitempty"`
	ClearWebhook          bool     `json:"clear_webhook,omitempty"`
	CORSAllowedOrigins    []string `json:"cors_allowed_origins,omitempty"`
	DiscoveryGuidance     string   `json:"discovery_guidance,omitempty"`
	DiscoveryContactEmail string   `json:"discovery_contact_email,omitempty"`
	OpenAPIVersion        string   `json:"openapi_version,omitempty"`
}

type APICorsOrigins struct {
	Origins []string `json:"origins"`
}

type WebhookDelivery struct {
	ID             string `json:"id"`
	APIID          string `json:"api_id"`
	UserID         string `json:"user_id"`
	SettlementID   string `json:"settlement_id,omitempty"`
	Tx             string `json:"tx"`
	Network        string `json:"network"`
	DeliveryID     string `json:"delivery_id"`
	Event          string `json:"event"`
	Status         string `json:"status"`
	Attempts       int    `json:"attempts"`
	NextAttemptAt  string `json:"next_attempt_at"`
	LastStatusCode int    `json:"last_status_code,omitempty"`
	LastError      string `json:"last_error,omitempty"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

type Endpoint struct {
	ID             string         `json:"id"`
	APIID          string         `json:"api_id"`
	Method         string         `json:"method"`
	PathPattern    string         `json:"path_pattern"`
	Enabled        bool           `json:"enabled"`
	Accepts        []AcceptOption `json:"accepts"`
	Description    string         `json:"description,omitempty"`
	RequestSchema  map[string]any `json:"request_schema,omitempty"`
	ResponseSchema map[string]any `json:"response_schema,omitempty"`
	SchemaSource   string         `json:"schema_source,omitempty"`
	TTL            *int           `json:"ttl,omitempty"`
	ExpiresAt      string         `json:"expires_at,omitempty"`
}

type CreateEndpointInput struct {
	Method         string         `json:"method"`
	PathPattern    string         `json:"path_pattern"`
	Accepts        []AcceptOption `json:"accepts"`
	Description    string         `json:"description,omitempty"`
	Enabled        *bool          `json:"enabled,omitempty"`
	RequestSchema  map[string]any `json:"request_schema,omitempty"`
	ResponseSchema map[string]any `json:"response_schema,omitempty"`
	ClearSchemas   *bool          `json:"clear_schemas,omitempty"`
	TTL            *int           `json:"ttl,omitempty"`
}

type UpdateEndpointInput struct {
	Method         string         `json:"method,omitempty"`
	PathPattern    string         `json:"path_pattern,omitempty"`
	Accepts        []AcceptOption `json:"accepts,omitempty"`
	Description    string         `json:"description,omitempty"`
	Enabled        *bool          `json:"enabled,omitempty"`
	RequestSchema  map[string]any `json:"request_schema,omitempty"`
	ResponseSchema map[string]any `json:"response_schema,omitempty"`
	ClearSchemas   *bool          `json:"clear_schemas,omitempty"`
}

// DiscoveryHostURLs is one verified host's discovery document URLs.
type DiscoveryHostURLs struct {
	Host         string `json:"host"`
	OpenAPIURL   string `json:"openapi_url"`
	WellKnownURL string `json:"well_known_url"`
	IsPrimary    bool   `json:"is_primary"`
}

// DiscoveryURLs is the control-plane GET /apis/{id}/discovery response.
type DiscoveryURLs struct {
	PrimaryHost               string              `json:"primary_host"`
	Hosts                     []string            `json:"hosts"`
	OpenAPIURL                string              `json:"openapi_url"`
	WellKnownURL              string              `json:"well_known_url"`
	EndpointCount             int                 `json:"endpoint_count"`
	DiscoverableEndpointCount int                 `json:"discoverable_endpoint_count"`
	HostURLs                  []DiscoveryHostURLs `json:"host_urls,omitempty"`
}

type DomainSetup struct {
	ID                 string   `json:"id,omitempty"`
	Hostname           string   `json:"hostname"`
	VerificationToken  string   `json:"verification_token"`
	VerificationRecord string   `json:"verification_record"`
	CNAMERecord        string   `json:"cname_record"`
	CNAMETarget        string   `json:"cname_target"`
	Instructions       []string `json:"instructions,omitempty"`
}

type DomainPlan struct {
	GatewayHostname string `json:"gateway_hostname"`
	UpstreamBaseURL string `json:"upstream_base_url"`
	CNAMERecord     string `json:"cname_record"`
	CNAMETarget     string `json:"cname_target"`
	TXTRecord       string `json:"txt_record"`
}

type ParsedOpenAPI struct {
	Title             string                   `json:"title,omitempty"`
	SuggestedUpstream string                   `json:"suggested_upstream,omitempty"`
	Operations        []ParsedOpenAPIOperation `json:"operations"`
}

type ParsedOpenAPIOperation struct {
	Method         string         `json:"method"`
	PathPattern    string         `json:"path_pattern"`
	Summary        string         `json:"summary,omitempty"`
	Description    string         `json:"description,omitempty"`
	RequestSchema  map[string]any `json:"request_schema,omitempty"`
	ResponseSchema map[string]any `json:"response_schema,omitempty"`
}

// OpenAPIImportOperation is one operation for POST /apis/{id}/openapi/import.
type OpenAPIImportOperation struct {
	Method         string         `json:"method"`
	PathPattern    string         `json:"path_pattern"`
	Description    string         `json:"description,omitempty"`
	RequestSchema  map[string]any `json:"request_schema,omitempty"`
	ResponseSchema map[string]any `json:"response_schema,omitempty"`
}

type APIKey struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	KeyPrefix string   `json:"key_prefix"`
	Scopes    []string `json:"scopes"`
	CreatedAt string   `json:"created_at,omitempty"`
}

type CreatedAPIKey struct {
	APIKey
	Key string `json:"key"`
}

type StatsOverview map[string]any

type Settlement map[string]any

type BatchSettlement map[string]any

type SupportedNetworks = json.RawMessage

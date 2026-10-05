from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LaunaError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


class User(BaseModel):
    id: str
    email: str
    onboarding_completed: bool = False
    email_verified: bool = False


class AuthResponse(BaseModel):
    token: str
    user: User


class PlatformConfig(BaseModel):
    platform_domain: str
    gateway_cname_target: str
    gateway_port: int
    admin_host: str
    testnet_facilitator_internal_url: str | None = None
    testnet_facilitator_external_url: str | None = None


class AcceptOption(BaseModel):
    scheme: str
    network: str
    asset: str
    amount: str
    max_timeout_seconds: int | None = None
    extra: dict[str, Any] | None = None


class APIDomain(BaseModel):
    id: str | None = None
    hostname: str
    is_primary: bool | None = None
    is_default_subdomain: bool | None = None


class API(BaseModel):
    id: str
    name: str
    slug: str
    upstream_base_url: str
    pay_to_mode: str = "user_wallet"
    pay_to_address: str | None = None
    pay_to_addresses: dict[str, str] = Field(
        default_factory=dict,
        description="CAIP-2 network → recipient. Empty on GET when unset. Send {} on update to clear.",
    )
    webhook_url: str | None = None
    webhook_configured: bool | None = None
    cors_allowed_origins: list[str] = Field(default_factory=list)
    discovery_guidance: str | None = None
    discovery_contact_email: str | None = None
    openapi_version: str | None = None
    domains: list[APIDomain] = Field(default_factory=list)


class APICorsOrigins(BaseModel):
    origins: list[str] = Field(default_factory=list)


class WebhookDelivery(BaseModel):
    id: str
    api_id: str
    user_id: str
    settlement_id: str | None = None
    tx: str
    network: str
    delivery_id: str
    event: str
    status: str
    attempts: int = 0
    next_attempt_at: str | None = None
    last_status_code: int | None = None
    last_error: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class Endpoint(BaseModel):
    id: str
    api_id: str
    method: str
    path_pattern: str
    enabled: bool = True
    accepts: list[AcceptOption]
    description: str | None = None
    request_schema: dict[str, Any] | None = None
    response_schema: dict[str, Any] | None = None
    schema_source: str | None = None
    ttl: int | None = None
    expires_at: str | None = None


class DiscoveryHostURLs(BaseModel):
    host: str
    openapi_url: str
    well_known_url: str
    is_primary: bool = False


class DiscoveryURLs(BaseModel):
    primary_host: str = ""
    hosts: list[str] = Field(default_factory=list)
    openapi_url: str = ""
    well_known_url: str = ""
    endpoint_count: int = 0
    discoverable_endpoint_count: int = 0
    host_urls: list[DiscoveryHostURLs] = Field(default_factory=list)


class DomainSetup(BaseModel):
    id: str | None = None
    hostname: str
    verification_token: str | None = None
    verification_record: str | None = None
    cname_record: str | None = None
    cname_target: str | None = None
    instructions: list[str] = Field(default_factory=list)


class DomainPlan(BaseModel):
    gateway_hostname: str
    upstream_base_url: str
    cname_record: str
    cname_target: str
    txt_record: str | None = None


class APIKey(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    created_at: str | None = None
    last_used_at: str | None = None


class CreatedAPIKey(APIKey):
    key: str


class ParsedOpenAPIOperation(BaseModel):
    method: str
    path_pattern: str
    summary: str | None = None
    description: str | None = None
    request_schema: dict[str, Any] | None = None
    response_schema: dict[str, Any] | None = None


class ParsedOpenAPI(BaseModel):
    title: str | None = None
    suggested_upstream: str | None = None
    operations: list[ParsedOpenAPIOperation] = Field(default_factory=list)


class OpenAPIImportResult(BaseModel):
    created: int = 0
    skipped: int = 0
    endpoints: list[Endpoint] = Field(default_factory=list)


class StatsOverview(BaseModel):
    total_requests: int = 0
    payment_required: int = 0
    paid_requests: int = 0
    unique_payers: int = 0
    total_earnings: list[Any] = Field(default_factory=list)
    display_currency: str | None = None
    total_earnings_fiat: str | None = None
    voucher_earnings_fiat: str | None = None
    earnings_by_day: list[Any] = Field(default_factory=list)
    earnings_by_day_fiat: list[Any] = Field(default_factory=list)
    requests_by_day: list[Any] = Field(default_factory=list)
    paid_by_day: list[Any] = Field(default_factory=list)
    top_payers: list[Any] = Field(default_factory=list)
    recent_payments: list[Any] = Field(default_factory=list)
    top_apis: list[Any] = Field(default_factory=list)


class ExchangeRatesSupported(BaseModel):
    currencies: list[str] = Field(default_factory=list)
    default: str = "usd"


class ExchangeRateLookup(BaseModel):
    price_token_id: str
    rate: str
    rate_date: str
    source: str
    quote: str


class TokenExchangeRate(BaseModel):
    token_id: str
    symbol: str
    network: str
    asset: str
    price_token_id: str
    rate: str
    source: str


class ExchangeRatesAll(BaseModel):
    quote: str
    rate_date: str
    rates: list[TokenExchangeRate] = Field(default_factory=list)


SCOPE_PRESETS: dict[str, list[str]] = {
    "readonly": [
        "apis:read",
        "endpoints:read",
        "domains:read",
        "stats:read",
        "settlements:read",
        "openapi:read",
        "billing:read",
        "income:read",
    ],
    "apiManager": [
        "apis:read",
        "apis:write",
        "endpoints:read",
        "endpoints:write",
        "domains:read",
        "domains:write",
        "openapi:read",
    ],
    "analytics": ["stats:read", "settlements:read", "billing:read", "income:read"],
}

USDC_DECIMALS = 6


def usdc_to_atomic(amount: str) -> str:
    trimmed = amount.strip()
    whole, _, frac = trimmed.partition(".")
    frac = (frac + "0" * USDC_DECIMALS)[:USDC_DECIMALS]
    atomic = int(whole + frac)
    if atomic <= 0:
        raise ValueError("price must be > 0")
    return str(atomic)


def atomic_to_usdc(atomic: str) -> str:
    if not atomic or not atomic.isdigit():
        return "0"
    s = atomic.zfill(USDC_DECIMALS + 1)
    whole = s[:-USDC_DECIMALS].lstrip("0") or "0"
    frac = s[-USDC_DECIMALS:].rstrip("0")
    return f"{whole}.{frac}" if frac else whole


def build_usdc_accept(amount_atomic: str, scheme: str = "exact", withdraw_delay: int | None = None) -> dict[str, Any]:
    from .platform.helpers import build_usdc_accept as _build

    return _build(amount_atomic, scheme, withdraw_delay)

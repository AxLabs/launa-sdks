from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Ax402Error(Exception):
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
    domains: list[APIDomain] = Field(default_factory=list)


class Endpoint(BaseModel):
    id: str
    api_id: str
    method: str
    path_pattern: str
    enabled: bool = True
    accepts: list[AcceptOption]
    description: str | None = None


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
    earnings_by_day: list[Any] = Field(default_factory=list)
    requests_by_day: list[Any] = Field(default_factory=list)
    paid_by_day: list[Any] = Field(default_factory=list)
    top_payers: list[Any] = Field(default_factory=list)
    recent_payments: list[Any] = Field(default_factory=list)
    top_apis: list[Any] = Field(default_factory=list)


SCOPE_PRESETS: dict[str, list[str]] = {
    "readonly": [
        "apis:read",
        "endpoints:read",
        "domains:read",
        "stats:read",
        "settlements:read",
        "openapi:read",
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
    "analytics": ["stats:read", "settlements:read"],
}

USDC_DECIMALS = 6
DEFAULT_USDC = {
    "scheme": "exact",
    "network": "eip155:84532",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "max_timeout_seconds": 300,
    "extra": {"name": "USDC", "version": "2", "assetTransferMethod": "eip3009"},
}


def usdc_to_atomic(amount: str) -> str:
    trimmed = amount.strip()
    whole, _, frac = trimmed.partition(".")
    frac = (frac + "0" * USDC_DECIMALS)[:USDC_DECIMALS]
    atomic = int(whole + frac)
    if atomic <= 0:
        raise ValueError("price must be > 0")
    return str(atomic)


def build_usdc_accept(amount_atomic: str, scheme: str = "exact") -> dict[str, Any]:
    out = {**DEFAULT_USDC, "amount": amount_atomic}
    if scheme == "batch-settlement":
        out["scheme"] = "batch-settlement"
        out.setdefault("extra", {})["withdrawDelay"] = 900
    return out

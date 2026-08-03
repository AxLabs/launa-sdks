from __future__ import annotations

from typing import Any, Callable

NETWORK_BASE = "eip155:8453"
NETWORK_BASE_SEPOLIA = "eip155:84532"
NETWORK_NEOX_MAINNET = "eip155:47763"
NETWORK_NEOX_TESTNET = "eip155:12227332"
NETWORK_HEDERA_MAINNET = "hedera:mainnet"
NETWORK_HEDERA_TESTNET = "hedera:testnet"
USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
ZCHF_BASE_MAINNET = "0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553"
XGAS_NEOX_MAINNET = "0x9a50C8804dC885F118835cD96d3Ea4D4A5131A01"
HBAR = "0.0.0"
USDC_HEDERA_TESTNET = "0.0.429274"
USDC_HEDERA_MAINNET = "0.0.456858"

MIN_BATCH_WITHDRAW_DELAY = 900
MAX_BATCH_WITHDRAW_DELAY = 2_592_000
DEFAULT_BATCH_WITHDRAW_DELAY = 259_200

DEFAULT_USDC_ACCEPT = {
    "scheme": "exact",
    "network": NETWORK_BASE,
    "asset": USDC_BASE_MAINNET,
    "max_timeout_seconds": 300,
    "extra": {"name": "USDC", "version": "2", "assetTransferMethod": "eip3009"},
}
DEFAULT_USDC_ACCEPT_SEPOLIA = {
    "scheme": "exact",
    "network": NETWORK_BASE_SEPOLIA,
    "asset": USDC_BASE_SEPOLIA,
    "max_timeout_seconds": 300,
    "extra": {"name": "USDC", "version": "2", "assetTransferMethod": "eip3009"},
}
DEFAULT_BATCH_USDC_ACCEPT = {
    "scheme": "batch-settlement",
    "network": NETWORK_BASE,
    "asset": USDC_BASE_MAINNET,
    "max_timeout_seconds": 300,
    "extra": {
        "name": "USDC",
        "version": "2",
        "assetTransferMethod": "eip3009",
        "withdrawDelay": DEFAULT_BATCH_WITHDRAW_DELAY,
    },
}


def gateway_base_url(host: str, port: int = 443) -> str:
    if not host:
        return ""
    if host.endswith(".localhost") or host == "localhost":
        if port not in (80, 443):
            return f"http://{host}:{port}"
    return f"https://{host}"


def gateway_url(host: str, path: str, port: int = 443) -> str:
    if not path.startswith("/"):
        path = "/" + path
    base = gateway_base_url(host, port)
    if not base:
        return ""
    return f"{base}{path}"


def format_withdraw_delay(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds} seconds"
    if seconds < 3600:
        minutes = round(seconds / 60)
        return "1 minute" if minutes == 1 else f"{minutes} minutes"
    if seconds < 86_400:
        hours = round(seconds / 3600)
        return "1 hour" if hours == 1 else f"{hours} hours"
    days = round(seconds / 86_400)
    return "1 day" if days == 1 else f"{days} days"


def build_usdc_accept(
    amount_atomic: str,
    scheme: str = "exact",
    withdraw_delay: int | None = None,
) -> dict[str, Any]:
    base = DEFAULT_BATCH_USDC_ACCEPT if scheme == "batch-settlement" else DEFAULT_USDC_ACCEPT
    extra = dict(base["extra"])
    if scheme == "batch-settlement":
        extra["withdrawDelay"] = withdraw_delay if withdraw_delay is not None else DEFAULT_BATCH_WITHDRAW_DELAY
    return {**base, "amount": amount_atomic, "extra": extra}


def amount_to_atomic(amount: str, decimals: int) -> str:
    trimmed = amount.strip()
    whole, _, frac = trimmed.partition(".")
    if len(frac) > decimals:
        raise ValueError(f"Supports at most {decimals} decimal places")
    frac = (frac + "0" * decimals)[:decimals]
    atomic = int(whole + frac)
    if atomic <= 0:
        raise ValueError("price must be > 0")
    return str(atomic)


def atomic_to_display(atomic: str, decimals: int) -> str:
    if not atomic or not atomic.isdigit():
        return "0"
    s = atomic.zfill(decimals + 1)
    whole = s[:-decimals].lstrip("0") or "0"
    frac = s[-decimals:].rstrip("0")
    return f"{whole}.{frac}" if frac else whole


def wrap_openapi(
    client,
    api_id: str,
    spec: str,
    accepts: list[dict],
    filter_fn: Callable[[dict[str, str]], bool] | None = None,
) -> dict:
    parsed = client.openapi.parse_spec(spec)
    operations = []
    for op in parsed.operations:
        row = {
            "method": op.method,
            "path_pattern": op.path_pattern,
            "description": op.summary or op.description,
        }
        if filter_fn and not filter_fn(row):
            continue
        operations.append(row)
    result = client.openapi.import_operations(api_id, {"operations": operations, "accepts": accepts})
    return result.model_dump()


def setup_api_with_default_domain(client, input_body: dict[str, Any]) -> dict[str, Any]:
    platform = client.config.platform()
    api = client.apis.create(input_body)
    host = f"{input_body['slug']}.{platform.platform_domain}"
    return {
        "api": api,
        "platform": platform,
        "gateway_host": host,
        "gateway_url": gateway_base_url(host, platform.gateway_port),
    }

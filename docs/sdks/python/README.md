# Python SDK

Package: `launa-sdk` in `packages/python/`.

## Install

```bash
pip install launa-sdk
pip install "launa-sdk[buyer]"  # x402 signing + eth-account
```

PyPI is not live yet (`0.0.7` is prepared). Until the first upload:

```bash
pip install "launa-sdk @ git+https://github.com/AxLabs/launa-sdks.git#subdirectory=packages/python"
```

## Control plane

```python
from launa_sdk import LaunaClient

client = LaunaClient.from_env()  # LAUNA_BASE_URL, LAUNA_API_KEY or LAUNA_JWT

apis = client.apis.list()
api = client.apis.create({
    "name": "My API",
    "slug": "myapi",
    "upstream_base_url": "https://api.example.com",
})
```

Resource-style API: `client.auth`, `client.keys`, `client.apis`, `client.endpoints`, `client.domains`, `client.openapi`, `client.stats`, `client.settlements`, `client.billing`, `client.income`, `client.exchange_rates`, `client.config`. API helpers: `apis.check_slug_availability`, `apis.probe_upstream`, `apis.list_webhook_deliveries`.

Settlement webhooks:

```python
api = client.apis.create({
    "name": "Shopify channel",
    "slug": "acme-shop",
    "upstream_base_url": "https://shopify-app.example",
    "pay_to_address": "0xYourWallet",
    "pay_to_addresses": {"hedera:testnet": "0.0.1234"},
    "webhook_url": "https://shopify-app.example/webhooks/launa/settlement",
    "webhook_secret": "whsec_...",
})
deliveries = client.apis.list_webhook_deliveries(api.id)
```

### Discovery

```python
api = client.apis.create({
    "name": "Search",
    "slug": "search",
    "upstream_base_url": "https://upstream.example.com",
    "discovery_guidance": "Use POST /search with a query field.",
    "discovery_contact_email": "support@example.com",
})
urls = client.apis.discovery(api.id)
client.endpoints.update(api.id, endpoint_id, {
    "request_schema": {"type": "object", "properties": {"query": {"type": "string"}}},
    "response_schema": {"type": "object", "additionalProperties": True},
})
```

Resource-style API includes `apis.discovery`. Flat back-compat aliases (`list_apis`, `stats_overview`, etc.) remain on `LaunaClient`.

Helpers: `gateway_url`, `gateway_base_url`, `wrap_openapi`, `setup_api_with_default_domain`, `SCOPE_PRESETS`, `usdc_to_atomic`, `build_usdc_accept`.

## Buyer

Pay gateway URLs with EVM `exact` or `batch-settlement`. Full guide: [buyers](../buyers/README.md).

Native Hedera (`hedera:*`) buyer signing is TypeScript-only (`@launaio/sdk/buyer`) until foundation ships a Python Hedera mechanism. Platform helpers expose `NETWORK_HEDERA_*` / `HBAR` / `USDC_HEDERA_*` for seller config.

```python
from launa_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://my-api.launa.io/v1/echo?test=1")
print(result.status_code, result.settlement)
```

Async:

```python
from launa_sdk.buyer import AsyncBuyerClient, evm_signer_from_private_key

async with AsyncBuyerClient(evm_signer_from_private_key(key)) as client:
    result = await client.get("https://my-api.launa.io/v1/echo?test=1")
```

Batch-settlement gateways:

```python
from launa_sdk.buyer import BuyerClient, BatchBuyerOptions

result = BuyerClient.from_env(batch=BatchBuyerOptions(deposit_multiplier=5)).get(
    "https://my-api.launa.io/v1/echo?test=1"
)
```

## Tests

```bash
cd packages/python && pip install -e ".[dev,buyer]" && pytest
```

## Examples

See [examples/python/](../../examples/python/) — setup API, pay gateway, stats, wrap OpenAPI.

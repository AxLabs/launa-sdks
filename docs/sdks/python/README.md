# Python SDK

Package: `ax402-sdk` in `packages/python/`.

## Install

```bash
pip install ax402-sdk
pip install "ax402-sdk[buyer]"  # x402 signing + eth-account
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

Resource-style API: `client.auth`, `client.keys`, `client.apis`, `client.endpoints`, `client.domains`, `client.openapi`, `client.stats`, `client.settlements`, `client.billing`, `client.income`, `client.exchange_rates`, `client.config`.

Flat back-compat aliases (`list_apis`, `stats_overview`, etc.) remain on `LaunaClient`.

Helpers: `gateway_url`, `gateway_base_url`, `wrap_openapi`, `setup_api_with_default_domain`, `SCOPE_PRESETS`, `usdc_to_atomic`, `build_usdc_accept`.

## Buyer

Pay gateway URLs with EVM `exact` or `batch-settlement`. Full guide: [buyers](../buyers/README.md).

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

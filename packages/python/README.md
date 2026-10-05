# Launa Python SDK

Control-plane and buyer client for the [Launa](https://launa.io) platform.

## Install

```bash
pip install ax402-sdk
pip install "ax402-sdk[buyer]"  # optional: pay gateway URLs
```

## Control plane

```python
from launa_sdk import LaunaClient

client = LaunaClient.from_env()  # LAUNA_BASE_URL, LAUNA_API_KEY or LAUNA_JWT
apis = client.apis.list()
```

## Buyer

```python
from launa_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://my-api.launa.io/v1/foo")
```

See [docs/sdks/python](../../docs/sdks/python/README.md).

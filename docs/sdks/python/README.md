# Python SDK

Package: `ax402-sdk` in `packages/python/`.

## Install

```bash
pip install ax402-sdk
pip install "ax402-sdk[buyer]"
```

## Control plane

```python
from ax402_sdk import Ax402Client

client = Ax402Client.from_env()
apis = client.list_apis()
```

## Buyer

```python
from ax402_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://myapi.localhost:8090/v1/foo")
```

## Tests

```bash
pip install -e ".[dev]" && pytest
```

# Ax402 Python SDK

Control-plane and buyer client for the [Ax402](https://ax402.io) platform.

## Install

```bash
pip install ax402-sdk
pip install "ax402-sdk[buyer]"  # optional: pay gateway URLs
```

Until the first PyPI upload, install from git:

```bash
pip install "ax402-sdk @ git+https://github.com/AxLabs/ax402-sdks.git#subdirectory=packages/python"
```

## Control plane

```python
from ax402_sdk import Ax402Client

client = Ax402Client.from_env()  # AX402_BASE_URL, AX402_API_KEY or AX402_JWT
apis = client.apis.list()
```

## Buyer

```python
from ax402_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://my-api.ax402.io/v1/foo")
```

See [docs/sdks/python](../../docs/sdks/python/README.md).

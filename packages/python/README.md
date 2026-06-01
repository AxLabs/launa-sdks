# ax402-sdk (Python)

Control-plane client for ax402-backend.

```bash
pip install -e ".[dev]"
pytest
```

```python
from ax402_sdk import Ax402Client, build_usdc_accept, usdc_to_atomic

client = Ax402Client.from_env()
apis = client.list_apis()
```

## Buyer (pay gateway URLs)

```bash
pip install -e ".[buyer]"
```

```python
from ax402_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://my-api.localhost:8090/v1/foo")
print(result.status_code, result.settlement)
```

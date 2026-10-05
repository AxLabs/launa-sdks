# ax402-sdk (Python)

Control-plane client for launa-backend.

```bash
pip install -e ".[dev]"
pytest
```

```python
from launa_sdk import LaunaClient, build_usdc_accept, usdc_to_atomic

client = LaunaClient.from_env()
apis = client.list_apis()
```

## Buyer (pay gateway URLs)

```bash
pip install -e ".[buyer]"
```

```python
from launa_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://my-api.localhost:8090/v1/foo")
print(result.status_code, result.settlement)
```

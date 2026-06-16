# Buyer clients

Pay **gateway hostnames** with automatic HTTP 402 handling and x402 signing. Buyer clients do not call the control plane — they talk to seller gateway URLs (`https://{slug}.{platform_domain}/...` or custom domains).

For in-browser humans, use [`@axlabs/x402-react-paywall`](../packages/react-paywall/docs/README.md) instead.

## How it works

1. Your client requests a gateway URL.
2. The gateway returns **402** with `PAYMENT-REQUIRED` (and related headers).
3. The buyer client signs a payment payload with your EVM wallet.
4. The client retries with `PAYMENT-SIGNATURE`; the gateway verifies via the facilitator and returns the upstream response.

You never configure a facilitator URL in buyer code — the gateway handles verify/settle.

## Environment

| Variable | Purpose |
|----------|---------|
| `AX402_EVM_PRIVATE_KEY` | Hex EVM key with USDC on the gateway's network (legacy: `EVM_PRIVATE_KEY`) |

Fund the wallet with **testnet USDC** on the network the gateway accepts (typically Base Sepolia `eip155:84532`).

**Staging smoke test:**

```text
https://echo.staging.ax402.io/echo/get?test=1
```

## Language parity

| Capability | TypeScript | Go | Python |
|------------|:----------:|:--:|:------:|
| EVM `exact` scheme | ✓ | ✓ | ✓ |
| `batch-settlement` scheme | ✓ | ✓ | ✓ |
| Browser wallet signer | ✓ | — | — |
| Async client | — | — | ✓ (`AsyncBuyerClient`) |
| Settlement metadata | `pay()` → `payment` | `SettleResponseFrom(resp)` | `PayResult.settlement` |
| Env factory | `buyerClientFromEnv` | — | `BuyerClient.from_env` |
| `upto` scheme | — | — | — |

Control-plane clients (seller automation) are documented per language in [sdks/](../sdks/README.md).

## TypeScript

Install buyer deps (optional extras on the main package):

```bash
pnpm add @axlabs/ax402-sdk @x402/fetch @x402/evm viem
```

### Private key (scripts, CI, agents)

```typescript
import { buyerClientFromEnv } from "@axlabs/ax402-sdk/buyer";

const client = await buyerClientFromEnv();
const result = await client.pay({ url: "https://echo.staging.ax402.io/echo/get?test=1" });
const body = await result.response.text();
console.log(result.response.status, body, result.payment);
```

### One-shot fetch

```typescript
import { payAndFetch, createEvmSignerFromPrivateKey } from "@axlabs/ax402-sdk/buyer";

const signer = await createEvmSignerFromPrivateKey(process.env.AX402_EVM_PRIVATE_KEY!);
const res = await payAndFetch(signer, {
  url: "https://echo.staging.ax402.io/echo/get?test=1",
});
```

### Reusable payment fetch

```typescript
import { createPaymentFetch, createEvmSignerFromPrivateKey } from "@axlabs/ax402-sdk/buyer";

const signer = await createEvmSignerFromPrivateKey(process.env.AX402_EVM_PRIVATE_KEY!);
const fetchWithPay = await createPaymentFetch(signer);
const res = await fetchWithPay("https://myapi.example.com/v1/data");
```

### Batch-settlement gateways (TypeScript only)

When the gateway endpoint accepts `batch-settlement`, register the batch scheme alongside `exact`:

```typescript
import { buyerClientFromEnv } from "@axlabs/ax402-sdk/buyer";

const client = await buyerClientFromEnv({
  batch: {
    channelSalt: "0x0000000000000000000000000000000000000000000000000000000000000000",
    depositMultiplier: 5,
  },
});
const result = await client.pay({ url: "https://echo.staging.ax402.io/echo/get?test=1" });
```

### Browser wallet (extension)

```typescript
import { createEvmSignerFromBrowserProvider, BuyerClient } from "@axlabs/ax402-sdk/buyer";

const signer = await createEvmSignerFromBrowserProvider(); // window.ethereum
const client = await BuyerClient.create(signer);
const res = await client.fetch("https://myapi.example.com/v1/data");
```

## Go

Module: `github.com/AxLabs/ax402-sdk/go/buyer`. Underlying protocol: `github.com/x402-foundation/x402/go`.

```go
import "github.com/AxLabs/ax402-sdk/go/buyer"

c, err := buyer.NewFromPrivateKey(os.Getenv("AX402_EVM_PRIVATE_KEY"))
if err != nil { /* handle */ }

resp, err := c.Get(ctx, "https://echo.staging.ax402.io/echo/get?test=1")
if err != nil { /* handle */ }
defer resp.Body.Close()

settle, err := c.SettleResponseFrom(resp)
```

`PayURL(ctx, method, url, body)` supports non-GET methods. `HTTPClient()` returns the payment-wrapped `*http.Client` for custom requests.

Batch-settlement gateways:

```go
c, err := buyer.NewFromPrivateKey(key, buyer.Options{
    Batch: &buyer.BatchOptions{DepositMultiplier: 5},
})
```

## Python

Install the buyer extra:

```bash
pip install "ax402-sdk[buyer]"
```

### Sync

```python
from ax402_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://echo.staging.ax402.io/echo/get?test=1")
print(result.status_code, result.body, result.settlement)
```

### Async

```python
from ax402_sdk.buyer import AsyncBuyerClient, BatchBuyerOptions, evm_signer_from_private_key
import os

signer = evm_signer_from_private_key(os.environ["AX402_EVM_PRIVATE_KEY"])
async with AsyncBuyerClient(signer, batch=BatchBuyerOptions(deposit_multiplier=5)) as client:
    result = await client.get("https://echo.staging.ax402.io/echo/get?test=1")
```

### Batch-settlement (sync)

```python
from ax402_sdk.buyer import BuyerClient, BatchBuyerOptions

result = BuyerClient.from_env(batch=BatchBuyerOptions(deposit_multiplier=5)).get(
    "https://echo.staging.ax402.io/echo/get?test=1"
)
```

## CLI and MCP

```bash
export AX402_EVM_PRIVATE_KEY=0x...
ax402 inspect url --url https://echo.staging.ax402.io/echo/get?test=1 --json
ax402 pay url --url https://echo.staging.ax402.io/echo/get?test=1 --json
```

MCP tool `ax402_pay_url` uses the same env var when set. See [mcp](../mcp/README.md).

## When to use what

| Runtime | Recommendation |
|---------|----------------|
| Node / TS agent or backend | `@axlabs/ax402-sdk/buyer` |
| Go service or CI | `go/buyer` |
| Python script or async service | `ax402_sdk.buyer` |
| Browser SPA with wallet UI | `@axlabs/x402-react-paywall` |
| Shell / Cursor agent | `ax402 pay url` or MCP `ax402_pay_url` |

## Protocol reference

Signing and settlement semantics: [x402-foundation/x402](https://github.com/x402-foundation/x402).

AxLabs testnet facilitator (used by gateways, not called directly from buyer code): `https://ax402.testnet.app.mf.axlabs.net`.

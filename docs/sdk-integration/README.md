# SDK integration

Programmatic access to Launa from your codebase: seller automation (control plane) and consumer payments (buyer).

## Control plane vs buyer

| Surface | URL | Auth | Use when |
|---------|-----|------|----------|
| **Control plane** | `LAUNA_BASE_URL` | API key or JWT | Manage APIs, endpoints, domains, keys, stats |
| **Buyer** | Gateway hostname | EVM private key / wallet | Pay for upstream data behind an x402 gateway |

They are separate concerns. An agent that wraps APIs uses an API key; paying those gateway URLs uses a funded EVM wallet.

## Buyer quick start

Staging echo (Base Sepolia USDC): `https://echo.staging.launa.io/echo/get?test=1`

### TypeScript

```typescript
import { buyerClientFromEnv } from "@axlabs/ax402-sdk/buyer";

const client = await buyerClientFromEnv();
const { response } = await client.pay({ url: "https://echo.staging.launa.io/echo/get?test=1" });
```

Requires: `@x402/fetch`, `@x402/evm`, `viem`. See [buyers](../buyers/README.md) for batch-settlement and browser wallet.

### Go

```go
c, _ := buyer.NewFromPrivateKey(os.Getenv("LAUNA_EVM_PRIVATE_KEY"))
resp, _ := c.Get(ctx, "https://echo.staging.launa.io/echo/get?test=1")
```

### Python

```python
from launa_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://echo.staging.launa.io/echo/get?test=1")
```

Install: `pip install "ax402-sdk[buyer]"`.

## Control plane quick start

### TypeScript

```typescript
import { LaunaClient } from "@axlabs/ax402-sdk";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL!,
  apiKey: process.env.LAUNA_API_KEY!,
});
```

### Go

```go
client := launa.NewClient(baseURL, launa.Credentials{APIKey: key})
```

### Python

```python
client = LaunaClient.from_env()
```

## When to use

- **Buyer SDK** — backend service, agent, or script that calls paid gateway URLs
- **Control plane SDK** — CI/CD, custom admin, or agent that provisions APIs and endpoints
- **React paywall** — browser SPA with wallet connect UI
- **CLI / MCP** — shell and Cursor automation (same APIs as SDKs)

## Tools

Same control-plane surface as [CLI](../cli/README.md) and [MCP](../mcp/README.md). Buyer parity: [buyers](../buyers/README.md).

# SDK integration

Programmatic access to Ax402 from your codebase: seller automation (control plane) and consumer payments (buyer).

## Control plane vs buyer

| Surface | URL | Auth | Use when |
|---------|-----|------|----------|
| **Control plane** | `AX402_BASE_URL` | API key or JWT | Manage APIs, endpoints, domains, keys, stats |
| **Buyer** | Gateway hostname | EVM private key / wallet | Pay for upstream data behind an x402 gateway |

They are separate concerns. An agent that wraps APIs uses an API key; paying those gateway URLs uses a funded EVM wallet.

## Buyer quick start

Example gateway URL: `https://my-api.ax402.io/v1/echo?test=1`

### TypeScript

```typescript
import { buyerClientFromEnv } from "@ax402/sdk/buyer";

const client = await buyerClientFromEnv();
const { response } = await client.pay({ url: "https://my-api.ax402.io/v1/echo?test=1" });
```

Requires: `@x402/fetch`, `@x402/evm`, `viem`. See [buyers](../buyers/README.md) for batch-settlement and browser wallet.

### Go

```go
c, _ := buyer.NewFromPrivateKey(os.Getenv("AX402_EVM_PRIVATE_KEY"))
resp, _ := c.Get(ctx, "https://my-api.ax402.io/v1/echo?test=1")
```

### Python

```python
from ax402_sdk.buyer import BuyerClient

result = BuyerClient.from_env().get("https://my-api.ax402.io/v1/echo?test=1")
```

Install: `pip install "ax402-sdk[buyer]"`.

## Control plane quick start

### TypeScript

```typescript
import { Ax402Client } from "@ax402/sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY!,
});
```

### Go

```go
client := ax402.NewClient(baseURL, ax402.Credentials{APIKey: key})
```

### Python

```python
client = Ax402Client.from_env()
```

## When to use

- **Buyer SDK** — backend service, agent, or script that calls paid gateway URLs
- **Control plane SDK** — CI/CD, custom admin, or agent that provisions APIs and endpoints
- **React paywall** — browser SPA with wallet connect UI
- **CLI / MCP** — shell and Cursor automation (same APIs as SDKs)

## Tools

Same control-plane surface as [CLI](../cli/README.md) and [MCP](../mcp/README.md). Buyer parity: [buyers](../buyers/README.md).

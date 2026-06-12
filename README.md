# ax402-sdk

Platform kit for [ax402-backend](https://github.com/AxLabs/ax402-backend) — control-plane clients, AI-agent tools, and e-commerce plugin starters.

**Payment protocol (402, signing, facilitator)** lives in [x402-foundation/x402](https://github.com/x402-foundation/x402). Use `@x402/fetch` or `github.com/x402-foundation/x402/go` to pay gateway URLs. This repo wraps the AxLabs **control plane** only.

## Which package do I need?

| Task | Package |
|------|---------|
| Manage APIs/endpoints/domains from Node/TS | `@axlabs/ax402-sdk` |
| CI/CD automation (Go) | `github.com/AxLabs/ax402-sdk/go` |
| AI agents (Python) | `ax402-sdk` on PyPI |
| CLI / shell scripts | `ax402` CLI in `tools/cli` |
| Cursor / Claude MCP tools | `tools/mcp-server` |
| WordPress / WooCommerce | `plugins/wordpress`, `plugins/woocommerce` |
| Shopify app | `plugins/shopify` |
| Pay a wrapped API (buyer) | `@axlabs/ax402-sdk/buyer` (`BuyerClient`, `payAndFetch`) |

## Quick start (TypeScript)

From this repository root:

```bash
pnpm install
pnpm --filter @axlabs/ax402-sdk build
```

Or from the package directory:

```bash
cd packages/typescript && pnpm run build
```

```typescript
import { Ax402Client } from "@axlabs/ax402-sdk";

const client = new Ax402Client({
  baseUrl: "http://api.localhost:8090",
  apiKey: process.env.AX402_API_KEY!,
});

const apis = await client.apis.list();
```

## Environment

| Variable | Used by |
|----------|---------|
| `AX402_BASE_URL` | CLI, MCP, SDKs |
| `AX402_API_KEY` | CLI, MCP, automation (`ax402_live_...`) |
| `AX402_JWT` | Interactive CLI auth |

## Layout

```
openapi/          OpenAPI contract
packages/         TS, Go, Python SDKs
tools/            CLI + MCP server
plugins/          WP, WC, Shopify starters
docs/             Platform guides (gateway, SDKs, CLI, MCP, plugins)
AGENTS.md         LLM action catalog
```

See [docs/README.md](./docs/README.md) for the full documentation index. The dashboard also hosts docs at `/docs`.

See [AGENTS.md](./AGENTS.md) for AI-agent workflows.

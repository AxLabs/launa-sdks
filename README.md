# launa-sdk

Official SDKs and tools for the [Launa](https://launa.io) platform — control-plane clients, buyer helpers, CLI, and MCP server.

**Payment protocol (402, signing, facilitator)** is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402). Use `@x402/fetch` or `github.com/x402-foundation/x402/go` to pay gateway URLs. This repository covers the Launa **control plane API** and automation tooling.

## Which package do I need?

| Task | Package |
|------|---------|
| Manage APIs/endpoints/domains from Node/TS | `@axlabs/launa-sdk` |
| CI/CD automation (Go) | `github.com/AxLabs/launa-sdk/go` |
| AI agents (Python) | `launa-sdk` on PyPI |
| CLI / shell scripts | `launa` CLI in `tools/cli` |
| Cursor / Claude MCP tools | `tools/mcp-server` |
| Pay a wrapped API (buyer) | `@axlabs/launa-sdk/buyer` (`BuyerClient`, `payAndFetch`) |

## Quick start (TypeScript)

```bash
pnpm add @axlabs/launa-sdk
```

```typescript
import { LaunaClient } from "@axlabs/launa-sdk";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL!,
  apiKey: process.env.LAUNA_API_KEY!,
});

const apis = await client.apis.list();
```

## Environment

| Variable | Used by |
|----------|---------|
| `LAUNA_BASE_URL` | CLI, MCP, SDKs — your Launa API URL (from the dashboard) |
| `LAUNA_API_KEY` | CLI, MCP, automation (`launa_live_...`) |
| `LAUNA_JWT` | Interactive CLI auth |
| `LAUNA_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |

## Layout

```
openapi/          OpenAPI contract
packages/         TS, Go, Python SDKs
tools/            CLI + MCP server
docs/             Guides (gateway, SDKs, CLI, MCP, buyers)
AGENTS.md         LLM action catalog
```

See [docs/README.md](./docs/README.md) for the full documentation index.

See [AGENTS.md](./AGENTS.md) for AI-agent workflows.

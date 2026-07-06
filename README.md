# ax402-sdk

Official SDKs and tools for the [Ax402](https://ax402.io) platform — control-plane clients, buyer helpers, CLI, and MCP server.

**Payment protocol (402, signing, facilitator)** is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402). Use `@x402/fetch` or `github.com/x402-foundation/x402/go` to pay gateway URLs. This repository covers the Ax402 **control plane API** and automation tooling.

## Which package do I need?

| Task | Package |
|------|---------|
| Manage APIs/endpoints/domains from Node/TS | `@axlabs/ax402-sdk` |
| CI/CD automation (Go) | `github.com/AxLabs/ax402-sdk/go` |
| AI agents (Python) | `ax402-sdk` on PyPI |
| CLI / shell scripts | `ax402` CLI in `tools/cli` |
| Cursor / Claude MCP tools | `tools/mcp-server` |
| Pay a wrapped API (buyer) | `@axlabs/ax402-sdk/buyer` (`BuyerClient`, `payAndFetch`) |

## Quick start (TypeScript)

```bash
pnpm add @axlabs/ax402-sdk
```

```typescript
import { Ax402Client } from "@axlabs/ax402-sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY!,
});

const apis = await client.apis.list();
```

## Environment

| Variable | Used by |
|----------|---------|
| `AX402_BASE_URL` | CLI, MCP, SDKs — your Ax402 API URL (from the dashboard) |
| `AX402_API_KEY` | CLI, MCP, automation (`ax402_live_...`) |
| `AX402_JWT` | Interactive CLI auth |
| `AX402_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |

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

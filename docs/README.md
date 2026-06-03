# Ax402 SDK documentation

Docs for **@axlabs/ax402-sdk** and related automation tools (CLI, MCP). Control plane API is implemented by [ax402-backend](../ax402-backend/).

**Platform docs** (hosted gateway, dashboard, domains, OpenAPI import, React paywall, e-commerce plugins) live on the [ax402-frontend](../ax402-frontend/) site at `/docs`.

Payment protocol (402, signing, facilitator) is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402).

## SDK packages & tools

| Language / tool | Guide | Package |
|-----------------|-------|---------|
| TypeScript | [sdks/typescript](./sdks/typescript/README.md) | `@axlabs/ax402-sdk` |
| Go | [sdks/go](./sdks/go/README.md) | `github.com/AxLabs/ax402-sdk/go` |
| Python | [sdks/python](./sdks/python/README.md) | `ax402-sdk` (PyPI) |
| Buyers | [buyers](./buyers/README.md) | Pay wrapped gateway URLs |
| CLI | [cli](./cli/README.md) | `@axlabs/ax402-cli` |
| MCP | [mcp](./mcp/README.md) | `@axlabs/ax402-mcp-server` |
| Agents | [agents](./agents/README.md) | CLI + MCP recipes |

## Integration (SDK-centric)

| Guide | Use when |
|-------|----------|
| [sdk-integration](./sdk-integration/README.md) | Automate APIs, endpoints, keys from code or CI |
| [buyers](./buyers/README.md) | Sign and pay gateway URLs in-process |

Gateway setup, DNS, and dashboard workflows: **[/docs on ax402-frontend](https://github.com/AxLabs/ax402-frontend)** — start at [gateway-wrap](https://github.com/AxLabs/ax402-frontend) (`/docs/gateway-wrap`).

## Environment

| Variable | Used by |
|----------|---------|
| `AX402_BASE_URL` | SDKs, CLI, MCP |
| `AX402_API_KEY` | Automation (`ax402_live_...`) |
| `AX402_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |

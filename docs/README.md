# Launa SDK documentation

Docs for **@axlabs/ax402-sdk** and related automation tools (CLI, MCP).

Payment protocol (402, signing, facilitator) is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402).

Dashboard guides (gateway setup, DNS, domains, billing): [launa.io/docs](https://launa.io/docs).

## SDK packages & tools

| Language / tool | Guide | Package |
|-----------------|-------|---------|
| **Buyers** | **[buyers](./buyers/README.md)** | Pay gateway URLs (start here for consumers) |
| TypeScript | [sdks/typescript](./sdks/typescript/README.md) | `@axlabs/ax402-sdk` + `/buyer` |
| Go | [sdks/go](./sdks/go/README.md) | `github.com/AxLabs/ax402-sdk/go` |
| Python | [sdks/python](./sdks/python/README.md) | `ax402-sdk` (PyPI) |
| CLI | [cli](./cli/README.md) | `@axlabs/launa-cli` |
| MCP | [mcp](./mcp/README.md) | `@axlabs/launa-mcp-server` |
| Agents | [agents](./agents/README.md) | CLI + MCP recipes |
| React paywall | [packages/react-paywall/docs](../packages/react-paywall/docs/README.md) | `@axlabs/x402-react-paywall` |

## Integration

| Guide | Use when |
|-------|----------|
| [gateway-wrap](./gateway-wrap/README.md) | Monetize an API through the hosted gateway |
| [sdk-integration](./sdk-integration/README.md) | Automate APIs, endpoints, keys from code or CI |
| [buyers](./buyers/README.md) | Sign and pay gateway URLs in-process |

OpenAPI contract: [openapi/control-plane.yaml](../openapi/control-plane.yaml).

## Environment

| Variable | Used by |
|----------|---------|
| `LAUNA_BASE_URL` | SDKs, CLI, MCP |
| `LAUNA_API_KEY` | Automation (`launa_live_...`) |
| `LAUNA_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |

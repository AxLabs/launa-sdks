# Ax402 documentation

Platform docs for [ax402-backend](../ax402-backend/) and [ax402-sdk](../ax402-sdk/). Payment protocol (402, signing, facilitator) is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402).

The [ax402-frontend](../ax402-frontend/) site mirrors this index at `/docs`.

## Integration paths

| Path | Guide | Best for |
|------|-------|----------|
| **Gateway wrap** | [gateway-wrap](./gateway-wrap/README.md) | Existing HTTP APIs, dashboard + DNS, no upstream code changes |
| **SDK integration** | [sdk-integration](./sdk-integration/README.md) | In-app control plane, CI/CD, agents, buyer logic |

## SDKs

| Language | Guide | Package |
|----------|-------|---------|
| TypeScript | [sdks/typescript](./sdks/typescript/README.md) | `@axlabs/ax402-sdk` |
| Go | [sdks/go](./sdks/go/README.md) | `github.com/AxLabs/ax402-sdk/go` |
| Python | [sdks/python](./sdks/python/README.md) | `ax402-sdk` (PyPI) |
| Buyers | [buyers](./buyers/README.md) | Pay wrapped gateway URLs |

## Tools

| Tool | Guide |
|------|-------|
| CLI | [cli](./cli/README.md) |
| MCP server | [mcp](./mcp/README.md) |
| Agent workflows | [agents](./agents/README.md) |

## Plugins

| Guide | Contents |
|-------|----------|
| [ecommerce](./ecommerce/README.md) | WordPress, WooCommerce, Shopify gateway wrap |

## Environment

| Variable | Used by |
|----------|---------|
| `AX402_BASE_URL` | SDKs, CLI, MCP |
| `AX402_API_KEY` | Automation (`ax402_live_...`) |
| `AX402_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |

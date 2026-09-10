# Ax402 SDK documentation

Docs for **@ax402/sdk** and related automation tools (CLI, MCP).

Payment protocol (402, signing, facilitator) is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402).

Dashboard guides (gateway setup, DNS, domains, billing): [ax402.io/docs](https://ax402.io/docs).

## SDK packages & tools

| Language / tool | Guide | Package |
|-----------------|-------|---------|
| **Buyers** | **[buyers](./buyers/README.md)** | Pay gateway URLs (start here for consumers) |
| TypeScript | [sdks/typescript](./sdks/typescript/README.md) | `@ax402/sdk` + `/buyer` |
| Go | [sdks/go](./sdks/go/README.md) | `github.com/AxLabs/ax402-sdks/go` |
| Python | [sdks/python](./sdks/python/README.md) | `ax402-sdk` (PyPI) |
| CLI | [cli](./cli/README.md) | `@ax402/cli` |
| MCP | [mcp](./mcp/README.md) | `@ax402/mcp-server` |
| Agents | [agents](./agents/README.md) | CLI + MCP recipes |
| Publishing | [publishing](./publishing/README.md) | npm + PyPI release setup |
| React paywall | [packages/react-paywall/docs](../packages/react-paywall/docs/README.md) | `@ax402/react-paywall` |

## Integration

| Guide | Use when |
|-------|----------|
| [gateway-wrap](./gateway-wrap/README.md) | Monetize an API through the hosted gateway |
| [sdk-integration](./sdk-integration/README.md) | Automate APIs, endpoints, keys from code or CI |
| [buyers](./buyers/README.md) | Sign and pay gateway URLs in-process |
| Seller [API discovery](https://ax402.io/docs/guides/discovery) | AgentCash OpenAPI + `/.well-known/x402.json` on gateway hosts |

## Environment

| Variable | Used by |
|----------|---------|
| `AX402_BASE_URL` | SDKs, CLI, MCP |
| `AX402_API_KEY` | Automation (`ax402_live_...` / `ax402_sandbox_...`) |
| `AX402_JWT` | CLI keys + sandbox-wallet |
| `AX402_ENVIRONMENT` | `development` = Sandbox / Test mode |
| `AX402_SANDBOX` | `1` / `true` — alias for development |
| `AX402_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |
| `HEDERA_ACCOUNT_ID` | Buyer Hedera account |
| `HEDERA_PRIVATE_KEY` | Buyer Hedera key |

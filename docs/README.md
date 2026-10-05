# Launa SDK documentation

Docs for **@launa/sdk** and related automation tools (CLI, MCP).

Payment protocol (402, signing, facilitator) is defined by [x402-foundation/x402](https://github.com/x402-foundation/x402).

Dashboard guides (gateway setup, DNS, domains, billing): [launa.io/docs](https://launa.io/docs).

## SDK packages & tools

| Language / tool | Guide | Package |
|-----------------|-------|---------|
| **Buyers** | **[buyers](./buyers/README.md)** | Pay gateway URLs (start here for consumers) |
| TypeScript | [sdks/typescript](./sdks/typescript/README.md) | `@launa/sdk` + `/buyer` |
| Go | [sdks/go](./sdks/go/README.md) | `github.com/AxLabs/launa-sdks/go` |
| Python | [sdks/python](./sdks/python/README.md) | `launa-sdk` (PyPI) |
| CLI | [cli](./cli/README.md) | `@launa/cli` |
| MCP | [mcp](./mcp/README.md) | `@launa/mcp-server` |
| Agents | [agents](./agents/README.md) | CLI + MCP recipes |
| Publishing | [publishing](./publishing/README.md) | npm + PyPI release setup |
| React paywall | [packages/react-paywall/docs](../packages/react-paywall/docs/README.md) | `@launa/react-paywall` |

## Integration

| Guide | Use when |
|-------|----------|
| [gateway-wrap](./gateway-wrap/README.md) | Monetize an API through the hosted gateway |
| [sdk-integration](./sdk-integration/README.md) | Automate APIs, endpoints, keys from code or CI |
| [buyers](./buyers/README.md) | Sign and pay gateway URLs in-process |
| Seller [API discovery](https://launa.io/docs/guides/discovery) | AgentCash OpenAPI + `/.well-known/x402.json` on gateway hosts |

## Environment

| Variable | Used by |
|----------|---------|
| `LAUNA_BASE_URL` | SDKs, CLI, MCP |
| `LAUNA_API_KEY` | Automation (`launa_live_...` / `launa_test_...`) |
| `LAUNA_JWT` | CLI keys + sandbox-wallet |
| `LAUNA_ENVIRONMENT` | `development` = Sandbox / Test mode |
| `LAUNA_SANDBOX` | `1` / `true` — alias for development |
| `LAUNA_EVM_PRIVATE_KEY` | Buyer CLI/MCP pay |
| `HEDERA_ACCOUNT_ID` | Buyer Hedera account |
| `HEDERA_PRIVATE_KEY` | Buyer Hedera key |

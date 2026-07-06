# SDKs

Ax402 ships control-plane clients (seller automation) and buyer helpers (pay gateway URLs) in three languages.

| Language | Package | Control plane | Buyer |
|----------|---------|:-------------:|:-----:|
| TypeScript | `@axlabs/ax402-sdk` | Full | `exact` + `batch-settlement` |
| Go | `github.com/AxLabs/ax402-sdk/go` | Full | `exact` + `batch-settlement` |
| Python | `ax402-sdk` | Full | `exact` + `batch-settlement` (+ async) |

All three SDKs expose the same control-plane resources: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `billing`, `income`, `exchangeRates`, and `config`. Platform helpers (`buildUsdcAccept`, `wrapOpenAPI`, `setupApiWithDefaultDomain`, etc.) are available in each language.

## Guides

| Language | Guide |
|----------|-------|
| TypeScript | [typescript](./typescript/README.md) |
| Go | [go](./go/README.md) |
| Python | [python](./python/README.md) |

Runnable scripts: [examples/](../../examples/README.md).

## Paying gateway URLs

Start here if you consume paid APIs: **[buyers](../buyers/README.md)**.

Buyer clients sign x402 payments against **gateway hostnames** — not `AX402_BASE_URL`. Use the same `AX402_EVM_PRIVATE_KEY` as `ax402 pay url` and MCP `ax402_pay_url`.

For browser SPAs, use [`@axlabs/x402-react-paywall`](../packages/react-paywall/docs/README.md).

OpenAPI contract: [openapi/control-plane.yaml](../../openapi/control-plane.yaml).

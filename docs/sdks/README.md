# SDKs

Launa ships control-plane clients (seller automation) and buyer helpers (pay gateway URLs) in three languages.

| Language | Package | Control plane | Buyer |
|----------|---------|:-------------:|:-----:|
| TypeScript | `@axlabs/launa-sdk` | Full (+ MFA, facilitator) | `exact` + `batch-settlement` |
| Go | `github.com/AxLabs/launa-sdk/go` | Core automation | `exact` |
| Python | `launa-sdk` | Core automation | `exact` (+ async) |

## Guides

| Language | Guide |
|----------|-------|
| TypeScript | [typescript](./typescript/README.md) |
| Go | [go](./go/README.md) |
| Python | [python](./python/README.md) |

## Paying gateway URLs

Start here if you consume paid APIs: **[buyers](../buyers/README.md)**.

Buyer clients sign x402 payments against **gateway hostnames** — not `LAUNA_BASE_URL`. Use the same `LAUNA_EVM_PRIVATE_KEY` as `launa pay url` and MCP `launa_pay_url`.

For browser SPAs, use [`@axlabs/x402-react-paywall`](../packages/react-paywall/docs/README.md).

## Control plane parity notes

All three languages cover apis, endpoints, domains, openapi, stats, per-API settlements, and platform config.

**TypeScript-only today:** MFA/passkeys/TOTP, facilitator config/stats/events, global payment history (`GET /settlements`), preferred environment.

**Backend-only (no SDK yet):** billing, income/payouts, batch channel settings (`/apis/{id}/batch/*`).

OpenAPI contract: [openapi/control-plane.yaml](../../openapi/control-plane.yaml) — lags backend on billing, income, and MFA routes.

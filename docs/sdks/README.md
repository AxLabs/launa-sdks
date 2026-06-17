# SDKs

Ax402 ships control-plane clients (seller automation) and buyer helpers (pay gateway URLs) in three languages.

| Language | Package | Control plane | Buyer |
|----------|---------|:-------------:|:-----:|
| TypeScript | `@axlabs/ax402-sdk` | Full (+ MFA, facilitator) | `exact` + `batch-settlement` |
| Go | `github.com/AxLabs/ax402-sdk/go` | Core automation | `exact` |
| Python | `ax402-sdk` | Core automation | `exact` (+ async) |

## Guides

| Language | Guide |
|----------|-------|
| TypeScript | [typescript](./typescript/README.md) |
| Go | [go](./go/README.md) |
| Python | [python](./python/README.md) |

## Paying gateway URLs

Start here if you consume paid APIs: **[buyers](../buyers/README.md)**.

Buyer clients sign x402 payments against **gateway hostnames** — not `AX402_BASE_URL`. Use the same `AX402_EVM_PRIVATE_KEY` as `ax402 pay url` and MCP `ax402_pay_url`.

For browser SPAs, use [`@axlabs/x402-react-paywall`](../packages/react-paywall/docs/README.md).

## Control plane parity notes

All three languages cover apis, endpoints, domains, openapi, stats, per-API settlements, and platform config.

**TypeScript-only today:** MFA/passkeys/TOTP, facilitator config/stats/events, global payment history (`GET /settlements`), preferred environment.

**Backend-only (no SDK yet):** billing, income/payouts, batch channel settings (`/apis/{id}/batch/*`).

OpenAPI contract: [openapi/control-plane.yaml](../../openapi/control-plane.yaml) — lags backend on billing, income, and MFA routes.

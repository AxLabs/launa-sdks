# SDKs

Ax402 ships control-plane clients (seller automation) and buyer helpers (pay gateway URLs) in three languages.

| Language | Package | Control plane | Buyer |
|----------|---------|:-------------:|:-----:|
| TypeScript | `@ax402/sdk` | Core seller API | `exact` + `batch-settlement` |
| Go | `github.com/AxLabs/ax402-sdks/go` | Core seller API | `exact` + `batch-settlement` |
| Python | `ax402-sdk` | Core seller API | `exact` + `batch-settlement` (+ async) |

All three SDKs expose the same control-plane resources: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `billing`, `income`, `exchangeRates`, and `config`. Platform helpers (`buildUsdcAccept`, `wrapOpenAPI`, `setupApiWithDefaultDomain`, etc.) are available in each language.

## Coverage

SDKs target **seller automation** — APIs, endpoints, domains, stats, settlements, billing/income,
auth/key management, and (TypeScript) account notifications, account deletion, income payout
create/cancel, billing model switch, sandbox wallet, and local-dev config.

These public routes are **not** yet in Go/Python SDKs (use the dashboard, TypeScript SDK, or direct
HTTP):

- Billing checkout and portal (`POST /billing/checkout/*`, `portal`, `payg/setup`)
- Go/Python: income payout mutate (`POST` / `DELETE /income/payout-requests`), notifications,
  account deletion, sandbox wallet, `/config/local-dev`

TypeScript, Go, and Python include `checkSlugAvailability` / `probe_upstream` for slug checks and upstream readiness probes.

## Guides

| Language | Guide |
|----------|-------|
| TypeScript | [typescript](./typescript/README.md) |
| Go | [go](./go/README.md) |
| Python | [python](./python/README.md) |

Runnable scripts: [examples/](../../examples/README.md).

Publishing: [publishing](../publishing/README.md).

## Paying gateway URLs

Start here if you consume paid APIs: **[buyers](../buyers/README.md)**.

Buyer clients sign x402 payments against **gateway hostnames** — not `AX402_BASE_URL`. Use the same `AX402_EVM_PRIVATE_KEY` as `ax402 pay url` and MCP `ax402_pay_url`.

For browser SPAs, use [`@ax402/react-paywall`](../packages/react-paywall/docs/README.md).

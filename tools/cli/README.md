# @ax402/cli

Command-line client for the [Ax402](https://ax402.io) control plane — manage APIs, endpoints, domains, analytics, and x402 gateway payments from scripts and CI.

Payment signing uses [x402](https://github.com/x402-foundation/x402) via `@ax402/sdk/buyer`. This package covers **platform automation**, not the protocol itself.

## Install

```bash
npm install -g @ax402/cli
```

## Quick start

```bash
export AX402_BASE_URL=https://api.ax402.io
export AX402_API_KEY=ax402_live_...

ax402 apis list
ax402 config platform --json
```

Create an API key in the [Ax402 dashboard](https://ax402.io) or via `auth login` → `keys create` (JWT required for key management).

### Bootstrap a paid API

```bash
ax402 apis create \
  --name "My API" --slug my-api \
  --upstream https://api.example.com \
  --pay-to 0xYourWalletAddress --json

ax402 endpoints create \
  --api-id API_ID --path "/v1/*" --price-usdc 0.10 --json

ax402 inspect url --url "https://my-api.YOUR_PLATFORM_DOMAIN/v1/hello"
```

`--pay-to` is required when your account uses `user_wallet` payout mode.

### Pay a gateway URL (buyer)

```bash
# EVM
export AX402_EVM_PRIVATE_KEY=0x...
# and/or Hedera (native hedera:* networks)
export HEDERA_ACCOUNT_ID=0.0.xxxx
export HEDERA_PRIVATE_KEY=0x...

ax402 pay url --url "https://my-api.example.com/v1/data" --json
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AX402_BASE_URL` | Control plane URL (default `https://api.ax402.io`) |
| `AX402_API_KEY` | Scoped API key (`ax402_live_...`) for automation |
| `AX402_JWT` | Session token from `auth login` — needed for `keys` and `scopes list` |
| `AX402_EVM_PRIVATE_KEY` | Signs EVM x402 payments for `pay url` (alias: `EVM_PRIVATE_KEY`) |
| `HEDERA_ACCOUNT_ID` | Hedera payer account for `pay url` |
| `HEDERA_PRIVATE_KEY` | Hedera private key paired with `HEDERA_ACCOUNT_ID` |
| `HEDERA_NETWORK` | Optional `hedera:testnet` (default) or `hedera:mainnet` |

Add `--json` to any command for machine-readable output.

## Command groups

| Group | Examples |
|-------|----------|
| APIs | `apis list`, `apis create`, `apis slug-check`, `apis probe-upstream` |
| Endpoints | `endpoints list`, `endpoints create`, `endpoints update` |
| Domains | `domains add`, `domains verify`, `domains suggest` |
| Auth & keys | `auth login`, `auth me`, `keys create` (JWT) |
| OpenAPI | `openapi parse`, `openapi import` |
| Analytics | `stats overview`, `stats api`, `settlements list`, `settlements export` |
| Billing & income | `billing overview`, `income summary` |
| Config | `config platform`, `networks supported`, `scopes presets` |
| Gateway | `inspect url`, `pay url` |

`endpoints update` can replace accepts:

```bash
ax402 endpoints update \
  --api-id API_ID --endpoint-id EP_ID \
  --network hedera:testnet --asset 0.0.429274 --price 0.10 --scheme exact --json
```


Run `ax402` with no arguments to print the full command reference.

Exit codes: `0` success, `1` API error, `2` usage error.

## Links

- [Full CLI docs](https://github.com/AxLabs/ax402-sdks/blob/main/docs/cli/README.md)
- [Ax402 docs](https://ax402.io/docs/cli)
- [TypeScript SDK](https://www.npmjs.com/package/@ax402/sdk)

## License

Apache-2.0

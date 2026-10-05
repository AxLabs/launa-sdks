# @launa/cli

Command-line client for the [Launa](https://launa.io) control plane — manage APIs, endpoints, domains, analytics, and x402 gateway payments from scripts and CI.

Payment signing uses [x402](https://github.com/x402-foundation/x402) via `@launa/sdk/buyer`. This package covers **platform automation**, not the protocol itself.

## Install

```bash
npm install -g @launa/cli
```

## Quick start

```bash
export LAUNA_BASE_URL=https://api.launa.io
export LAUNA_API_KEY=launa_live_...

launa apis list
launa config platform --json
```

Create an API key in the [Launa dashboard](https://launa.io) or via `auth login` → `keys create` (JWT required for key management).

### Bootstrap a paid API

```bash
launa apis create \
  --name "My API" --slug my-api \
  --upstream https://api.example.com \
  --pay-to 0xYourWalletAddress --json

launa endpoints create \
  --api-id API_ID --path "/v1/*" --price-usdc 0.10 --json

launa inspect url --url "https://my-api.YOUR_PLATFORM_DOMAIN/v1/hello"
```

`--pay-to` is required when your account uses `user_wallet` payout mode.

### Pay a gateway URL (buyer)

```bash
# EVM
export LAUNA_EVM_PRIVATE_KEY=0x...
# and/or Hedera (native hedera:* networks)
export HEDERA_ACCOUNT_ID=0.0.xxxx
export HEDERA_PRIVATE_KEY=0x...

launa pay url --url "https://my-api.example.com/v1/data" --json
```

## Environment

| Variable | Purpose |
|----------|---------|
| `LAUNA_BASE_URL` | Control plane URL (default `https://api.launa.io`) |
| `LAUNA_API_KEY` | Scoped API key (`launa_live_...`) for automation |
| `LAUNA_JWT` | Session token from `auth login` — needed for `keys` and `scopes list` |
| `LAUNA_EVM_PRIVATE_KEY` | Signs EVM x402 payments for `pay url` (alias: `EVM_PRIVATE_KEY`) |
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
launa endpoints update \
  --api-id API_ID --endpoint-id EP_ID \
  --network hedera:testnet --asset 0.0.429274 --price 0.10 --scheme exact --json
```


Run `launa` with no arguments to print the full command reference.

Exit codes: `0` success, `1` API error, `2` usage error.

## Links

- [Full CLI docs](https://github.com/AxLabs/launa-sdks/blob/main/docs/cli/README.md)
- [Launa docs](https://launa.io/docs/cli)
- [TypeScript SDK](https://www.npmjs.com/package/@launa/sdk)

## License

Apache-2.0

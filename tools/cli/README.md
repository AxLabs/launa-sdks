# @launaio/cli

Command-line client for the [Launa](https://launa.io) control plane — manage APIs, endpoints, domains, analytics, and x402 gateway payments from scripts and CI.

Payment signing uses [x402](https://github.com/x402-foundation/x402) via `@launaio/sdk/buyer`. This package covers **platform automation**, not the protocol itself.

## Install

```bash
npm install -g @launaio/cli
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
  --pay-to 0xYourWalletAddress \
  --discovery-guidance "Use GET /v1/*." --json

launa endpoints create \
  --api-id API_ID --path "/v1/*" --price-usdc 0.10 --json

launa apis discovery --id API_ID --json
launa inspect url --url "https://my-api.YOUR_PLATFORM_DOMAIN/v1/hello"
```

`--pay-to` or `--pay-to-addresses` is required when your account uses `user_wallet` payout mode. `--pay-to-addresses` is JSON (`{"hedera:testnet":"0.0.1234"}`) or `network=address` pairs.

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
| `LAUNA_API_KEY` | Scoped API key (`launa_live_...` or `launa_sandbox_...`) for automation |
| `LAUNA_JWT` | Session token from `auth login` — needed for `keys`, `scopes list`, `sandbox-wallet` |
| `LAUNA_ENVIRONMENT` | `development` for Sandbox / Test mode |
| `LAUNA_SANDBOX` | `1` / `true` — alias for development |
| `LAUNA_EVM_PRIVATE_KEY` | Signs EVM x402 payments for `pay url` (alias: `EVM_PRIVATE_KEY`) |
| `HEDERA_ACCOUNT_ID` | Hedera payer account for `pay url` |
| `HEDERA_PRIVATE_KEY` | Hedera private key paired with `HEDERA_ACCOUNT_ID` |
| `HEDERA_NETWORK` | Optional Hedera network (`hedera:mainnet`) |

Add `--json` or `--sandbox` to any command. `--sandbox` creates APIs/endpoints on the Anvil fork and defaults USDC accepts to `eip155:845320402`.

```bash
launa --sandbox apis create --name Demo --slug demo --upstream https://example.com --pay-to 0x... --json
launa --sandbox sandbox-wallet get --json --wait   # JWT required
```

## Command groups

| Group | Examples |
|-------|----------|
| APIs | `apis list`, `apis create`, `apis discovery`, `apis slug-check`, `apis probe-upstream` |
| Endpoints | `endpoints list`, `endpoints create`, `endpoints update` (incl. `--request-schema`) |
| Discovery | `discovery urls`, `discovery check` |
| Domains | `domains add`, `domains verify`, `domains suggest` |
| Auth & keys | `auth login`, `auth me`, `keys create` (JWT) |
| Sandbox | `sandbox-wallet get`, `sandbox-wallet reset` (JWT + `--sandbox`) |
| OpenAPI | `openapi parse`, `openapi import` |
| Analytics | `stats overview`, `stats api`, `settlements list`, `settlements export` |
| Billing & income | `billing overview`, `income summary` |
| Config | `config platform`, `networks supported`, `scopes presets` |
| Gateway | `inspect url`, `pay url` |

`endpoints update` can replace accepts:

```bash
launa endpoints update \
  --api-id API_ID --endpoint-id EP_ID \
  --network hedera:mainnet --asset 0.0.456858 --price 0.10 --scheme exact --json
```

Run `launa` with no arguments to print the full command reference.

Exit codes: `0` success, `1` API error, `2` usage error.

## Links

- [Full CLI docs](https://github.com/AxLabs/launa-sdks/blob/main/docs/cli/README.md)
- [Launa docs](https://launa.io/docs/cli)
- [TypeScript SDK](https://www.npmjs.com/package/@launaio/sdk)

## License

Apache-2.0

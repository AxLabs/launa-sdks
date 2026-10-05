# CLI

Binary: `launa` — published as `@launa/cli` on npm.

## Install

```bash
npm install -g @launa/cli
launa apis list --json
```

Or from source:

```bash
pnpm --filter @launa/cli build
node tools/cli/dist/index.js apis list --json
```

## Quick start

Set `LAUNA_BASE_URL` to your Launa API URL from the dashboard.

```bash
export LAUNA_BASE_URL=https://api.launa.io

# 1. Log in (JWT) — prints the token to stdout when --json is omitted
export LAUNA_JWT=$(launa auth login \
  --email you@example.com --password 'your-password')

# 2. Create a scoped API key for scripts/CI (keys commands require JWT)
launa keys create \
  --name local-cli --scopes apis:read,apis:write,endpoints:read,endpoints:write --json
# Save the returned key — shown once. Then:
export LAUNA_API_KEY=launa_live_...
unset LAUNA_JWT

# 3. List APIs
launa apis list

# 4. Create an API (--pay-to or --pay-to-addresses required for user_wallet)
launa apis create \
  --name "My API" --slug my-api \
  --upstream https://api.example.com \
  --pay-to 0xYourWalletAddress --json

# 5. Add a paid route
launa endpoints create \
  --api-id API_ID --path "/v1/*" --price-usdc 0.10 --json

# 6. Inspect payment requirements on the gateway URL (no wallet needed)
launa inspect url \
  --url "https://my-api.YOUR_PLATFORM_DOMAIN/v1/hello"
```

Run `launa config platform --json` for `platform_domain` and gateway hostname patterns.

## Environment

| Variable | Purpose |
|----------|---------|
| `LAUNA_BASE_URL` | Control plane URL (default `https://api.launa.io`) |
| `LAUNA_API_KEY` | Scoped API key (`launa_live_...` or `launa_test_...`) for automation |
| `LAUNA_JWT` | Session token from `auth login` — alternative to API key |
| `LAUNA_ENVIRONMENT` | `development` for Sandbox / Test mode (fork network) |
| `LAUNA_SANDBOX` | `1` / `true` — alias for development environment |
| `LAUNA_EVM_PRIVATE_KEY` | `pay url` — EVM signer (legacy alias: `EVM_PRIVATE_KEY`) |
| `HEDERA_ACCOUNT_ID` | `pay url` — Hedera payer account |
| `HEDERA_PRIVATE_KEY` | `pay url` — Hedera private key |
| `HEDERA_NETWORK` | Optional Hedera network (`hedera:mainnet`) |

Global flags: `--json`, `--sandbox` (targets development + sandbox-fork USDC defaults).

## Sandbox (Test mode)

```bash
# Create API + endpoint on the Anvil fork (eip155:845320402)
export LAUNA_API_KEY=launa_test_...   # or use LAUNA_JWT with --sandbox
launa --sandbox apis create --name Demo --slug demo --upstream https://example.com --pay-to 0x... --json
launa --sandbox endpoints create --api-id ID --path "/v1/*" --price-usdc 0.10 --json

# Funded buyer wallet for pay url (JWT required)
export LAUNA_JWT=$(launa auth login --email you@example.com --password '...')
export LAUNA_EVM_PRIVATE_KEY=$(launa --sandbox sandbox-wallet get --json --wait | jq -r .private_key)
launa pay url --url "https://demo.dev….launa.io/v1/hello"
```

`sandbox-wallet get|reset` requires `LAUNA_JWT` and `--sandbox` (or `LAUNA_ENVIRONMENT=development`). Human output redacts the private key; `--json` includes the full key.

## Authentication

| Credential | Use for |
|------------|---------|
| `LAUNA_API_KEY` | Automation — most commands (apis, endpoints, domains, stats, settlements, billing, income, openapi, config billing) |
| `LAUNA_JWT` | Interactive session — **required** for `keys list/create/revoke`, `auth me`, `scopes list`, and `sandbox-wallet` |

Create keys in the dashboard or via `auth login` → `keys create`. Use `launa_test_...` keys (created while in Sandbox) for Test mode. Scope presets: `launa scopes presets --json`. See [agents](../agents/README.md) for bootstrap flow.

## Output

Without `--json`, commands print human-readable tables and summaries. With `--json`, stdout is JSON (errors too). `auth login` without `--json` prints only the JWT token — useful for `export LAUNA_JWT=$(launa auth login ...)`.

## Command reference

```bash
launa apis list [--json]
launa apis create --name NAME --slug SLUG --upstream URL [--pay-to 0x...] [--pay-to-addresses JSON_OR_PAIRS] [--webhook-url URL] [--webhook-secret SECRET] [--discovery-guidance TEXT] [--discovery-contact-email EMAIL] [--openapi-version VER] [--json]
launa apis get --id ID [--json]
launa apis discovery --id ID [--json]
launa apis update --id ID [--name NAME] [--slug SLUG] [--upstream URL] [--pay-to 0x...] [--pay-to-addresses JSON_OR_PAIRS] [--webhook-url URL] [--webhook-secret SECRET] [--clear-webhook] [--discovery-guidance TEXT] [--discovery-contact-email EMAIL] [--openapi-version VER] [--json]
launa apis webhook-deliveries --id ID [--json]
launa apis delete --id ID [--json]
launa apis slug-check --slug SLUG [--exclude-api-id ID] [--json]
launa apis probe-upstream --api-id ID [--endpoint-id EP] [--path PATH] [--json]
launa apis cors-list --api-id ID [--json]
launa apis cors-set --api-id ID --origins ORIGIN[,ORIGIN...] [--json]
launa apis cors-add --api-id ID --origin ORIGIN [--json]
launa apis cors-remove --api-id ID --origin ORIGIN [--json]

launa endpoints list --api-id ID [--json]
launa endpoints create --api-id ID --path "/v1/*" [--method GET] [--price-usdc 0.10] [--scheme exact|batch-settlement] [--network CAIP2] [--asset ADDR] [--decimals N] [--ttl SECONDS] [--request-schema JSON] [--response-schema JSON] [--json]
launa endpoints update --api-id ID --endpoint-id EP [--enabled true|false] [--network CAIP2 --asset ADDR --price 0.10] [--accepts JSON] [--request-schema JSON] [--response-schema JSON] [--clear-schemas] [--json]
launa endpoints delete --api-id ID --endpoint-id EP [--json]

launa discovery urls --api-id ID [--json]
launa discovery check --url "https://myapi.example.com" [--json]

launa domains suggest --apex example.com [--prefix x402] [--json]
launa domains add --api-id ID --hostname HOST [--json]
launa domains list --api-id ID [--json]
launa domains verify --api-id ID --domain-id ID [--json]
launa domains delete --api-id ID --domain-id ID [--json]

launa keys list [--json]                              # JWT only
launa keys create --name NAME --scopes apis:read,... [--json]  # JWT only
launa keys revoke --id ID [--json]                    # JWT only

launa --sandbox sandbox-wallet get [--wait|--no-wait] [--json]   # JWT only
launa --sandbox sandbox-wallet reset [--wait|--no-wait] [--json] # JWT only

launa auth login --email EMAIL --password PASS [--json]
launa auth me [--json]                                # JWT only

launa openapi parse [--file PATH] [--spec YAML_OR_JSON] [--json]
launa openapi import --api-id ID [--file PATH] [--spec YAML_OR_JSON] [--price-usdc 0.10] [--json]

launa stats overview [--days 30] [--json]
launa stats api --api-id ID [--days 30] [--json]

launa settlements list --api-id ID [--json]
launa settlements batch --api-id ID [--json]
launa settlements history [--days 30] [--api-id ID] [--limit N] [--offset N] [--json]
launa settlements export --format csv|json [--days 30] [--api-id ID] [--json]

launa billing overview [--json]
launa billing packages [--json]
launa billing invoices [--json]

launa income summary [--json]
launa income ledger [--limit N] [--offset N] [--api-id ID] [--network NET] [--json]
launa income payout-requests [--json]

launa facilitator stats [--days 30] [--json]
launa facilitator events [--days 30] [--limit N] [--offset N] [--json]

launa batch overview --api-id ID [--json]
launa batch settings --api-id ID --claim-interval-secs N --settle-interval-secs N --refund-interval-secs N [--json]

launa config platform [--json]
launa config billing [--json]
launa networks supported [--json]
launa scopes presets [--json]
launa scopes list [--json]                              # JWT only

launa exchange-rates list [--quote usd] [--date YYYY-MM-DD] [--json]
launa exchange-rates supported [--json]
launa exchange-rates lookup --network NET --asset ADDR [--quote USD] [--date YYYY-MM-DD] [--json]

launa inspect url --url GATEWAY_URL [--method GET] [--json]
launa pay url --url GATEWAY_URL [--method GET] [--json]
```

`apis create --pay-to` (or `--pay-to-addresses`) is required when the account uses `user_wallet` payout mode. `--pay-to-addresses` is a JSON object of CAIP-2 → recipient, or `network=address` pairs (`hedera:testnet=0.0.1234`). On update, `{}` clears the map (replace, not merge).

Discovery: `apis discovery` / `discovery urls` return gateway OpenAPI and well-known URLs. Validate with AgentCash:

```bash
npx -y @agentcash/discovery@latest check "https://myapi.example.com/"
npx -y @agentcash/discovery@latest discover "https://myapi.example.com/"
```

Exit codes: 0 success, 1 API error, 2 usage error.

Publishing: [publishing](../publishing/README.md). More docs: [launa.io/docs/cli](https://launa.io/docs/cli).

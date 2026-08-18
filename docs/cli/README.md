# CLI

Binary: `ax402` — published as `@ax402/cli` on npm.

## Install

```bash
npm install -g @ax402/cli
ax402 apis list --json
```

Or from source:

```bash
pnpm --filter @ax402/cli build
node tools/cli/dist/index.js apis list --json
```

## Quick start

Set `AX402_BASE_URL` to your Ax402 API URL from the dashboard.

```bash
export AX402_BASE_URL=https://api.ax402.io

# 1. Log in (JWT) — prints the token to stdout when --json is omitted
export AX402_JWT=$(ax402 auth login \
  --email you@example.com --password 'your-password')

# 2. Create a scoped API key for scripts/CI (keys commands require JWT)
ax402 keys create \
  --name local-cli --scopes apis:read,apis:write,endpoints:read,endpoints:write --json
# Save the returned key — shown once. Then:
export AX402_API_KEY=ax402_live_...
unset AX402_JWT

# 3. List APIs
ax402 apis list

# 4. Create an API (--pay-to required when your account uses user_wallet payout mode)
ax402 apis create \
  --name "My API" --slug my-api \
  --upstream https://api.example.com \
  --pay-to 0xYourWalletAddress --json

# 5. Add a paid route
ax402 endpoints create \
  --api-id API_ID --path "/v1/*" --price-usdc 0.10 --json

# 6. Inspect payment requirements on the gateway URL (no wallet needed)
ax402 inspect url \
  --url "https://my-api.YOUR_PLATFORM_DOMAIN/v1/hello"
```

Run `ax402 config platform --json` for `platform_domain` and gateway hostname patterns.

## Environment

| Variable | Purpose |
|----------|---------|
| `AX402_BASE_URL` | Control plane URL (default `https://api.ax402.io`) |
| `AX402_API_KEY` | Scoped API key (`ax402_live_...` or `ax402_test_...`) for automation |
| `AX402_JWT` | Session token from `auth login` — alternative to API key |
| `AX402_ENVIRONMENT` | `development` for Sandbox / Test mode (fork network) |
| `AX402_SANDBOX` | `1` / `true` — alias for development environment |
| `AX402_EVM_PRIVATE_KEY` | `pay url` — EVM signer (legacy alias: `EVM_PRIVATE_KEY`) |
| `HEDERA_ACCOUNT_ID` | `pay url` — Hedera payer account |
| `HEDERA_PRIVATE_KEY` | `pay url` — Hedera private key |
| `HEDERA_NETWORK` | Optional Hedera network (`hedera:mainnet`) |

Global flags: `--json`, `--sandbox` (targets development + sandbox-fork USDC defaults).

## Sandbox (Test mode)

```bash
# Create API + endpoint on the Anvil fork (eip155:845320402)
export AX402_API_KEY=ax402_test_...   # or use AX402_JWT with --sandbox
ax402 --sandbox apis create --name Demo --slug demo --upstream https://example.com --pay-to 0x... --json
ax402 --sandbox endpoints create --api-id ID --path "/v1/*" --price-usdc 0.10 --json

# Funded buyer wallet for pay url (JWT required)
export AX402_JWT=$(ax402 auth login --email you@example.com --password '...')
export AX402_EVM_PRIVATE_KEY=$(ax402 --sandbox sandbox-wallet get --json --wait | jq -r .private_key)
ax402 pay url --url "https://demo.dev….ax402.io/v1/hello"
```

`sandbox-wallet get|reset` requires `AX402_JWT` and `--sandbox` (or `AX402_ENVIRONMENT=development`). Human output redacts the private key; `--json` includes the full key.

## Authentication

| Credential | Use for |
|------------|---------|
| `AX402_API_KEY` | Automation — most commands (apis, endpoints, domains, stats, settlements, billing, income, openapi, config billing) |
| `AX402_JWT` | Interactive session — **required** for `keys list/create/revoke`, `auth me`, `scopes list`, and `sandbox-wallet` |

Create keys in the dashboard or via `auth login` → `keys create`. Use `ax402_test_...` keys (created while in Sandbox) for Test mode. Scope presets: `ax402 scopes presets --json`. See [agents](../agents/README.md) for bootstrap flow.

## Output

Without `--json`, commands print human-readable tables and summaries. With `--json`, stdout is JSON (errors too). `auth login` without `--json` prints only the JWT token — useful for `export AX402_JWT=$(ax402 auth login ...)`.

## Help

Default help is a short index, not every flag:

```bash
ax402 help
ax402 endpoints --help
ax402 endpoints create --help
ax402 commands --json          # full registry for agents
ax402 help --all               # human cheatsheet of every command
```

Usage errors print **that command’s** help. JWT-only commands (`keys`, `auth me`, `sandbox-wallet`, `scopes list`) fail with `{"code":"jwt_required"}` when only `AX402_API_KEY` is set.

In-app terminals should print a short welcome (`shellWelcomeText()` from `@ax402/sdk/shell`) instead of dumping `help` on open.

## Command reference

```bash
ax402 apis list [--json]
ax402 apis create --name NAME --slug SLUG --upstream URL [--pay-to 0x...] [--webhook-url URL] [--webhook-secret SECRET] [--discovery-guidance TEXT] [--discovery-contact-email EMAIL] [--openapi-version VER] [--json]
ax402 apis get --id ID [--json]
ax402 apis discovery --id ID [--json]
ax402 apis update --id ID [--name NAME] [--slug SLUG] [--upstream URL] [--pay-to 0x...] [--webhook-url URL] [--webhook-secret SECRET] [--clear-webhook] [--discovery-guidance TEXT] [--discovery-contact-email EMAIL] [--openapi-version VER] [--json]
ax402 apis webhook-deliveries --id ID [--json]
ax402 apis delete --id ID [--json]
ax402 apis slug-check --slug SLUG [--exclude-api-id ID] [--json]
ax402 apis probe-upstream --api-id ID [--endpoint-id EP] [--path PATH] [--json]
ax402 apis cors-list --api-id ID [--json]
ax402 apis cors-set --api-id ID --origins ORIGIN[,ORIGIN...] [--json]
ax402 apis cors-add --api-id ID --origin ORIGIN [--json]
ax402 apis cors-remove --api-id ID --origin ORIGIN [--json]

ax402 endpoints list --api-id ID [--json]
ax402 endpoints create --api-id ID --path "/v1/*" [--method GET] [--price-usdc 0.10] [--scheme exact|batch-settlement] [--network CAIP2] [--asset ADDR] [--decimals N] [--ttl SECONDS] [--request-schema JSON] [--response-schema JSON] [--json]
ax402 endpoints update --api-id ID --endpoint-id EP [--enabled true|false] [--network CAIP2 --asset ADDR --price 0.10] [--accepts JSON] [--request-schema JSON] [--response-schema JSON] [--clear-schemas] [--json]
ax402 endpoints delete --api-id ID --endpoint-id EP [--json]

ax402 discovery urls --api-id ID [--json]
ax402 discovery check --url "https://myapi.example.com" [--json]

ax402 domains suggest --apex example.com [--prefix x402] [--json]
ax402 domains add --api-id ID --hostname HOST [--json]
ax402 domains list --api-id ID [--json]
ax402 domains verify --api-id ID --domain-id ID [--json]
ax402 domains delete --api-id ID --domain-id ID [--json]

ax402 keys list [--json]                              # JWT only
ax402 keys create --name NAME --scopes apis:read,... [--json]  # JWT only
ax402 keys revoke --id ID [--json]                    # JWT only

ax402 --sandbox sandbox-wallet get [--wait|--no-wait] [--json]   # JWT only
ax402 --sandbox sandbox-wallet reset [--wait|--no-wait] [--json] # JWT only

ax402 auth login --email EMAIL --password PASS [--json]
ax402 auth me [--json]                                # JWT only

ax402 openapi parse [--file PATH] [--spec YAML_OR_JSON] [--json]
ax402 openapi import --api-id ID [--file PATH] [--spec YAML_OR_JSON] [--price-usdc 0.10] [--json]

ax402 stats overview [--days 30] [--json]
ax402 stats api --api-id ID [--days 30] [--json]

ax402 settlements list --api-id ID [--json]
ax402 settlements batch --api-id ID [--json]
ax402 settlements history [--days 30] [--api-id ID] [--limit N] [--offset N] [--json]
ax402 settlements export --format csv|json [--days 30] [--api-id ID] [--json]

ax402 billing overview [--json]
ax402 billing packages [--json]
ax402 billing invoices [--json]

ax402 income summary [--json]
ax402 income ledger [--limit N] [--offset N] [--api-id ID] [--network NET] [--json]
ax402 income payout-requests [--json]

ax402 facilitator stats [--days 30] [--json]
ax402 facilitator events [--days 30] [--limit N] [--offset N] [--json]

ax402 batch overview --api-id ID [--json]
ax402 batch settings --api-id ID --claim-interval-secs N --settle-interval-secs N --refund-interval-secs N [--json]

ax402 config platform [--json]
ax402 config billing [--json]
ax402 networks supported [--json]
ax402 scopes presets [--json]
ax402 scopes list [--json]                              # JWT only

ax402 exchange-rates list [--quote usd] [--date YYYY-MM-DD] [--json]
ax402 exchange-rates supported [--json]
ax402 exchange-rates lookup --network NET --asset ADDR [--quote USD] [--date YYYY-MM-DD] [--json]

ax402 inspect url --url GATEWAY_URL [--method GET] [--json]
ax402 pay url --url GATEWAY_URL [--method GET] [--json]
```

`apis create --pay-to` is required when the account uses `user_wallet` payout mode (typical for seller accounts).

Discovery: `apis discovery` / `discovery urls` return gateway OpenAPI and well-known URLs. Validate with AgentCash:

```bash
npx -y @agentcash/discovery@latest check "https://myapi.example.com/"
npx -y @agentcash/discovery@latest discover "https://myapi.example.com/"
```

Exit codes: 0 success, 1 API error, 2 usage error.

Publishing: [publishing](../publishing/README.md). More docs: [ax402.io/docs/cli](https://ax402.io/docs/cli).

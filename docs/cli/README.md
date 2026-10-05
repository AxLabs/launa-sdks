# CLI

Binary: `launa` in `tools/cli/`. Workspace-only — build from the ax402-sdk repo.

## Build

```bash
pnpm --filter @axlabs/launa-cli build
node tools/cli/dist/index.js apis list --json
```

## Quick start (local)

Requires a running control plane (default `http://api.localhost:8090`). See the [launa full-stack dev guide](../../ax402/DEVELOPMENT.md) or run launa-backend locally.

```bash
pnpm --filter @axlabs/launa-cli build
export LAUNA_BASE_URL=http://api.localhost:8090

# 1. Log in (JWT) — prints the token to stdout when --json is omitted
export LAUNA_JWT=$(node tools/cli/dist/index.js auth login \
  --email you@example.com --password 'your-password')

# 2. Create a scoped API key for scripts/CI (keys commands require JWT)
node tools/cli/dist/index.js keys create \
  --name local-cli --scopes apis:read,apis:write,endpoints:read,endpoints:write --json
# Save the returned key — shown once. Then:
export LAUNA_API_KEY=launa_live_...
unset LAUNA_JWT

# 3. List APIs
node tools/cli/dist/index.js apis list

# 4. Create an API (--pay-to required when your account uses user_wallet payout mode)
node tools/cli/dist/index.js apis create \
  --name "My API" --slug my-api \
  --upstream https://api.example.com \
  --pay-to 0xYourWalletAddress --json

# 5. Add a paid route
node tools/cli/dist/index.js endpoints create \
  --api-id API_ID --path "/v1/*" --price-usdc 0.10 --json

# 6. Inspect payment requirements on the gateway URL (no wallet needed)
node tools/cli/dist/index.js inspect url \
  --url "https://my-api.YOUR_PLATFORM_DOMAIN/v1/hello"
```

Run `launa config platform --json` for `platform_domain` and gateway hostname patterns.

## Environment

| Variable | Purpose |
|----------|---------|
| `LAUNA_BASE_URL` | Control plane URL (default `http://api.localhost:8090`) |
| `LAUNA_API_KEY` | Scoped API key (`launa_live_...`) for automation |
| `LAUNA_JWT` | Session token from `auth login` — alternative to API key |
| `LAUNA_EVM_PRIVATE_KEY` | `pay url` only — signs x402 payments (legacy alias: `EVM_PRIVATE_KEY`) |

Global flag: `--json` on any command.

## Authentication

| Credential | Use for |
|------------|---------|
| `LAUNA_API_KEY` | Automation — most commands (apis, endpoints, domains, stats, settlements, openapi, config) |
| `LAUNA_JWT` | Interactive session — **required** for `keys list/create/revoke` and `auth me` |

Create keys in the dashboard or via `auth login` → `keys create`. Scope presets: `launa scopes presets --json`. See [agents](../agents/README.md) for bootstrap flow.

## Output

Without `--json`, commands print human-readable tables and summaries. With `--json`, stdout is JSON (errors too). `auth login` without `--json` prints only the JWT token — useful for `export LAUNA_JWT=$(launa auth login ...)`.

## Command reference

```bash
launa apis list [--json]
launa apis create --name NAME --slug SLUG --upstream URL [--pay-to 0x...] [--json]
launa apis get --id ID [--json]
launa apis update --id ID [--name NAME] [--slug SLUG] [--upstream URL] [--pay-to 0x...] [--json]
launa apis delete --id ID [--json]

launa endpoints list --api-id ID [--json]
launa endpoints create --api-id ID --path "/v1/*" [--method GET] [--price-usdc 0.10] [--scheme exact|batch-settlement] [--json]
launa endpoints update --api-id ID --endpoint-id EP [--enabled true|false] [--json]
launa endpoints delete --api-id ID --endpoint-id EP [--json]

launa domains suggest --apex example.com [--prefix x402] [--json]
launa domains add --api-id ID --hostname HOST [--json]
launa domains list --api-id ID [--json]
launa domains verify --api-id ID --domain-id ID [--json]
launa domains delete --api-id ID --domain-id ID [--json]

launa keys list [--json]                              # JWT only
launa keys create --name NAME --scopes apis:read,... [--json]  # JWT only
launa keys revoke --id ID [--json]                    # JWT only

launa auth login --email EMAIL --password PASS [--json]
launa auth me [--json]                                # JWT only

launa openapi parse [--file PATH] [--spec YAML_OR_JSON] [--json]
launa openapi import --api-id ID [--file PATH] [--spec YAML_OR_JSON] [--price-usdc 0.10] [--json]

launa stats overview [--days 30] [--json]
launa stats api --api-id ID [--days 30] [--json]

launa settlements list --api-id ID [--json]
launa settlements batch --api-id ID [--json]
launa settlements history [--days 30] [--api-id ID] [--limit N] [--offset N] [--json]

launa batch overview --api-id ID [--json]
launa batch settings --api-id ID --claim-interval-secs N --settle-interval-secs N --refund-interval-secs N [--json]

launa config platform [--json]
launa networks supported [--json]
launa scopes presets [--json]

launa inspect url --url GATEWAY_URL [--method GET] [--json]
launa pay url --url GATEWAY_URL [--method GET] [--json]
```

`apis create --pay-to` is required when the account uses `user_wallet` payout mode (typical for seller accounts).

Exit codes: 0 success, 1 API error, 2 usage error.

Hosted docs: ax402-frontend `/docs/cli`.

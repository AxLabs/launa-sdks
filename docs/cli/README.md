# CLI

Binary: `ax402` in `tools/cli/`. Workspace-only — build from the ax402-sdk repo.

## Build

```bash
pnpm --filter @axlabs/ax402-cli build
node tools/cli/dist/index.js apis list --json
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AX402_BASE_URL` | Control plane URL (default `http://api.localhost:8090`) |
| `AX402_API_KEY` | Scoped API key |
| `AX402_JWT` | Alternative to API key |
| `AX402_EVM_PRIVATE_KEY` | `pay url` / `inspect url` buyer commands |

Global flag: `--json` on any command.

## Command reference

```bash
ax402 apis list [--json]
ax402 apis create --name NAME --slug SLUG --upstream URL [--pay-to 0x...] [--json]
ax402 apis get --id ID [--json]
ax402 apis update --id ID [--name NAME] [--slug SLUG] [--upstream URL] [--pay-to 0x...] [--json]
ax402 apis delete --id ID [--json]

ax402 endpoints list --api-id ID [--json]
ax402 endpoints create --api-id ID --path "/v1/*" [--method GET] [--price-usdc 0.10] [--scheme exact|batch-settlement] [--json]
ax402 endpoints update --api-id ID --endpoint-id EP [--enabled true|false] [--json]
ax402 endpoints delete --api-id ID --endpoint-id EP [--json]

ax402 domains suggest --apex example.com [--prefix x402] [--json]
ax402 domains add --api-id ID --hostname HOST [--json]
ax402 domains list --api-id ID [--json]
ax402 domains verify --api-id ID --domain-id ID [--json]
ax402 domains delete --api-id ID --domain-id ID [--json]

ax402 keys list [--json]
ax402 keys create --name NAME --scopes apis:read,apis:write [--json]
ax402 keys revoke --id ID [--json]

ax402 auth login --email EMAIL --password PASS [--json]
ax402 auth me [--json]

ax402 openapi parse --file PATH [--spec YAML_OR_JSON] [--json]
ax402 openapi import --api-id ID --file PATH [--price-usdc 0.10] [--json]

ax402 stats overview [--days 30] [--json]
ax402 stats api --api-id ID [--days 30] [--json]

ax402 settlements list --api-id ID [--json]
ax402 settlements batch --api-id ID [--json]
ax402 settlements history [--days 30] [--api-id ID] [--limit N] [--offset N] [--json]

ax402 batch overview --api-id ID [--json]
ax402 batch settings --api-id ID --claim-interval-secs N --settle-interval-secs N --refund-interval-secs N [--json]

ax402 config platform [--json]
ax402 networks supported [--json]
ax402 scopes presets [--json]

ax402 inspect url --url GATEWAY_URL [--method GET] [--json]
ax402 pay url --url GATEWAY_URL [--method GET] [--json]
```

Exit codes: 0 success, 1 API error, 2 usage error.

Hosted docs: ax402-frontend `/docs/cli`.

# MCP server

Model Context Protocol server in `tools/mcp-server/`. Workspace-only — build from launa-sdk.

## Run

```bash
pnpm --filter @axlabs/launa-mcp-server build

LAUNA_API_KEY=launa_live_... \
LAUNA_BASE_URL=http://api.localhost:8090 \
node tools/mcp-server/dist/index.js
```

Auth: `LAUNA_API_KEY` only (no JWT).

## Tools

| Tool | Scope |
|------|-------|
| `launa_list_apis` | apis:read |
| `launa_get_api` | apis:read |
| `launa_list_endpoints` | endpoints:read |
| `launa_create_api` | apis:write + verified email |
| `launa_add_endpoint` | endpoints:write |
| `launa_import_openapi` | openapi:read |
| `launa_add_domain` | domains:write |
| `launa_list_domains` | domains:read |
| `launa_verify_domain` | domains:write |
| `launa_domain_suggest` | domains:read |
| `launa_stats_overview` | stats:read |
| `launa_stats_api` | stats:read |
| `launa_settlements_list` | settlements:read |
| `launa_inspect_url` | buyer (no wallet) |
| `launa_supported_networks` | authenticated |
| `launa_platform_config` | public |
| `launa_pay_url` | buyer (`LAUNA_EVM_PRIVATE_KEY`) |

Cursor config: point `command` at `node` and `args` at the built `dist/index.js` path.

See [agents](../agents/README.md). Hosted docs: ax402-frontend `/docs/mcp`.

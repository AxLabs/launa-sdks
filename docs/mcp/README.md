# MCP server

Model Context Protocol server in `tools/mcp-server/`. Workspace-only — build from ax402-sdk.

## Run

```bash
pnpm --filter @axlabs/ax402-mcp-server build

AX402_API_KEY=ax402_live_... \
AX402_BASE_URL=http://api.localhost:8090 \
node tools/mcp-server/dist/index.js
```

Auth: `AX402_API_KEY` only (no JWT).

## Tools

| Tool | Scope |
|------|-------|
| `ax402_list_apis` | apis:read |
| `ax402_get_api` | apis:read |
| `ax402_list_endpoints` | endpoints:read |
| `ax402_create_api` | apis:write + verified email |
| `ax402_add_endpoint` | endpoints:write |
| `ax402_import_openapi` | openapi:read |
| `ax402_add_domain` | domains:write |
| `ax402_list_domains` | domains:read |
| `ax402_verify_domain` | domains:write |
| `ax402_domain_suggest` | domains:read |
| `ax402_stats_overview` | stats:read |
| `ax402_stats_api` | stats:read |
| `ax402_settlements_list` | settlements:read |
| `ax402_inspect_url` | buyer (no wallet) |
| `ax402_supported_networks` | authenticated |
| `ax402_platform_config` | public |
| `ax402_pay_url` | buyer (`AX402_EVM_PRIVATE_KEY`) |

Cursor config: point `command` at `node` and `args` at the built `dist/index.js` path.

See [agents](../agents/README.md). Hosted docs: ax402-frontend `/docs/mcp`.

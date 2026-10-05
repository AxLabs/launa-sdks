# MCP server

Model Context Protocol server — published as `@launa/mcp-server` on npm.

## Install / run

```bash
npx @launa/mcp-server
```

Or from source:

```bash
pnpm --filter @launa/mcp-server build

LAUNA_API_KEY=launa_live_... \
LAUNA_BASE_URL=https://api.launa.io \
node tools/mcp-server/dist/index.js
```

Auth: `LAUNA_API_KEY` only (no JWT).

## Cursor configuration

```json
{
  "mcpServers": {
    "launa": {
      "command": "npx",
      "args": ["-y", "@launa/mcp-server"],
      "env": {
        "LAUNA_BASE_URL": "https://api.launa.io",
        "LAUNA_API_KEY": "launa_live_...",
        "LAUNA_EVM_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

See [examples/agent-mcp/cursor-mcp.json.example](../../examples/agent-mcp/cursor-mcp.json.example).

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

See [agents](../agents/README.md). Publishing: [publishing](../publishing/README.md).

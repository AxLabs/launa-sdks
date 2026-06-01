# MCP server

Model Context Protocol server in `tools/mcp-server/`.

Run from the **ax402-sdk** repository root.

## Run

```bash
pnpm --filter @axlabs/ax402-mcp-server build

AX402_API_KEY=ax402_live_... \
AX402_BASE_URL=http://api.localhost:8090 \
node tools/mcp-server/dist/index.js
```

## Tools

- `ax402_list_apis`, `ax402_create_api`, `ax402_add_endpoint`
- `ax402_import_openapi`, `ax402_add_domain`, `ax402_verify_domain`
- `ax402_stats_overview`, `ax402_supported_networks`, `ax402_platform_config`
- `ax402_pay_url` (requires `AX402_EVM_PRIVATE_KEY`)

See [agents](../agents/README.md) for scope presets and Cursor setup notes.

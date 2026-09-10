# MCP server

Model Context Protocol server — published as `@ax402/mcp-server` on npm.

## Install / run

```bash
npx @ax402/mcp-server
```

Or from source:

```bash
pnpm --filter @ax402/mcp-server build

AX402_API_KEY=ax402_live_... \
AX402_BASE_URL=https://api.ax402.io \
node tools/mcp-server/dist/index.js
```

Auth: `AX402_API_KEY` only (no JWT). An `ax402_sandbox_...` key selects Sandbox automatically — default endpoint pricing uses the fork network. `AX402_ENVIRONMENT=development` / `AX402_SANDBOX=1` still work with JWT. Sandbox wallet get/reset is CLI + JWT only.

## Cursor configuration

```json
{
  "mcpServers": {
    "ax402": {
      "command": "npx",
      "args": ["-y", "@ax402/mcp-server"],
      "env": {
        "AX402_BASE_URL": "https://api.ax402.io",
        "AX402_API_KEY": "ax402_live_...",
        "AX402_EVM_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

See [examples/agent-mcp/cursor-mcp.json.example](../../examples/agent-mcp/cursor-mcp.json.example).

## Tools

| Tool | Scope |
|------|-------|
| `ax402_list_apis` | apis:read |
| `ax402_get_api` | apis:read |
| `ax402_discovery_urls` | apis:read — gateway `openapi.json` / `/.well-known/x402.json` URLs |
| `ax402_set_discovery_guidance` | apis:write — guidance, contact email, openapi version |
| `ax402_list_endpoints` | endpoints:read |
| `ax402_update_endpoint_schemas` | endpoints:write — request/response JSON Schema |
| `ax402_create_api` | apis:write + verified email — optional `pay_to_address` / `pay_to_addresses`, discovery fields |
| `ax402_add_endpoint` | endpoints:write |
| `ax402_import_openapi` | openapi:read — persists schemas from the spec when present |
| `ax402_add_domain` | domains:write |
| `ax402_list_domains` | domains:read |
| `ax402_verify_domain` | domains:write |
| `ax402_domain_suggest` | domains:read |
| `ax402_stats_overview` | stats:read |
| `ax402_stats_api` | stats:read |
| `ax402_settlements_list` | settlements:read |
| `ax402_settlements_export` | settlements:read |
| `ax402_billing_overview` | billing:read |
| `ax402_income_summary` | income:read |
| `ax402_apis_slug_check` | apis:read |
| `ax402_apis_probe_upstream` | apis:read |
| `ax402_scopes_list` | JWT session |
| `ax402_facilitator_stats` | authenticated |
| `ax402_billing_catalog` | public billing catalog |
| `ax402_inspect_url` | buyer (no wallet) |
| `ax402_supported_networks` | authenticated |
| `ax402_platform_config` | public |
| `ax402_pay_url` | buyer (`AX402_EVM_PRIVATE_KEY` and/or Hedera keys) |

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `AX402_API_KEY` | Yes | Seller API key |
| `AX402_BASE_URL` | No | API base URL (default `https://api.ax402.io`) |
| `AX402_EVM_PRIVATE_KEY` | For `ax402_pay_url` | EVM signer |
| `HEDERA_ACCOUNT_ID` | For `ax402_pay_url` | Hedera payer account |
| `HEDERA_PRIVATE_KEY` | For `ax402_pay_url` | Hedera private key |

Discovery: [API discovery](https://ax402.io/docs/guides/discovery).

See [agents](../agents/README.md). Publishing: [publishing](../publishing/README.md).

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

Auth: `LAUNA_API_KEY` only (no JWT). An `launa_sandbox_...` key selects Sandbox automatically — default endpoint pricing uses the fork network. `LAUNA_ENVIRONMENT=development` / `LAUNA_SANDBOX=1` still work with JWT. Sandbox wallet get/reset is CLI + JWT only.

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
| `launa_discovery_urls` | apis:read — gateway `openapi.json` / `/.well-known/x402.json` URLs |
| `launa_set_discovery_guidance` | apis:write — guidance, contact email, openapi version |
| `launa_list_endpoints` | endpoints:read |
| `launa_update_endpoint_schemas` | endpoints:write — request/response JSON Schema |
| `launa_create_api` | apis:write + verified email — optional `pay_to_address` / `pay_to_addresses`, discovery fields |
| `launa_add_endpoint` | endpoints:write |
| `launa_import_openapi` | openapi:read — persists schemas from the spec when present |
| `launa_add_domain` | domains:write |
| `launa_list_domains` | domains:read |
| `launa_verify_domain` | domains:write |
| `launa_domain_suggest` | domains:read |
| `launa_stats_overview` | stats:read |
| `launa_stats_api` | stats:read |
| `launa_settlements_list` | settlements:read |
| `launa_settlements_export` | settlements:read |
| `launa_billing_overview` | billing:read |
| `launa_income_summary` | income:read |
| `launa_apis_slug_check` | apis:read |
| `launa_apis_probe_upstream` | apis:read |
| `launa_scopes_list` | JWT session |
| `launa_facilitator_stats` | authenticated |
| `launa_billing_catalog` | public billing catalog |
| `launa_inspect_url` | buyer (no wallet) |
| `launa_supported_networks` | authenticated |
| `launa_platform_config` | public |
| `launa_pay_url` | buyer (`LAUNA_EVM_PRIVATE_KEY` and/or Hedera keys) |

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `LAUNA_API_KEY` | Yes | Seller API key |
| `LAUNA_BASE_URL` | No | API base URL (default `https://api.launa.io`) |
| `LAUNA_EVM_PRIVATE_KEY` | For `launa_pay_url` | EVM signer |
| `HEDERA_ACCOUNT_ID` | For `launa_pay_url` | Hedera payer account |
| `HEDERA_PRIVATE_KEY` | For `launa_pay_url` | Hedera private key |

Discovery: [API discovery](https://launa.io/docs/guides/discovery).

See [agents](../agents/README.md). Publishing: [publishing](../publishing/README.md).

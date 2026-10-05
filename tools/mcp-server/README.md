# @launa/mcp-server

[Model Context Protocol](https://modelcontextprotocol.io/) server for the [Launa](https://launa.io) platform. Exposes seller control-plane operations and x402 buyer helpers as MCP tools for Cursor, Claude Desktop, and other MCP clients.

Runs over **stdio**. Uses `@launa/sdk` under the hood.

## Install / run

```bash
npx @launa/mcp-server
```

Requires Node.js 18+.

## Configuration

Set `LAUNA_API_KEY` (scoped `launa_live_...` key from the Launa dashboard). Optional: `LAUNA_BASE_URL` (default `https://api.launa.io`). For paying gateway URLs, set `LAUNA_EVM_PRIVATE_KEY` and/or `HEDERA_ACCOUNT_ID` + `HEDERA_PRIVATE_KEY`.

### Cursor

Add to `.cursor/mcp.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "launa": {
      "command": "npx",
      "args": ["-y", "@launa/mcp-server"],
      "env": {
        "LAUNA_BASE_URL": "https://api.launa.io",
        "LAUNA_API_KEY": "launa_live_..."
      }
    }
  }
}
```

To enable `launa_pay_url`, add `LAUNA_EVM_PRIVATE_KEY` and/or `HEDERA_ACCOUNT_ID` + `HEDERA_PRIVATE_KEY` to `env`.

Example config: [examples/agent-mcp/cursor-mcp.json.example](https://github.com/AxLabs/launa-sdks/blob/main/examples/agent-mcp/cursor-mcp.json.example).

## Tools

| Tool | Description |
|------|-------------|
| `launa_list_apis` | List wrapped APIs |
| `launa_get_api` | Get API by ID |
| `launa_discovery_urls` | Gateway OpenAPI / well-known discovery URLs |
| `launa_set_discovery_guidance` | Set discovery guidance / contact / OpenAPI version |
| `launa_create_api` | Create API with default subdomain (optional discovery fields) |
| `launa_list_endpoints` | List endpoints for an API |
| `launa_update_endpoint_schemas` | Set request/response JSON Schema on an endpoint |
| `launa_add_endpoint` | Add a paid route |
| `launa_import_openapi` | Import OpenAPI spec as endpoints (schemas when present) |
| `launa_add_domain` | Add custom domain (returns DNS steps) |
| `launa_list_domains` | List domains for an API |
| `launa_verify_domain` | Verify domain DNS TXT |
| `launa_domain_suggest` | Suggest gateway hostname plan |
| `launa_apis_slug_check` | Check slug availability |
| `launa_apis_probe_upstream` | Probe upstream reachability |
| `launa_stats_overview` | Account analytics |
| `launa_stats_api` | Per-API analytics |
| `launa_settlements_list` | List settlements |
| `launa_settlements_export` | Export settlement history (CSV/JSON) |
| `launa_billing_overview` | Billing overview |
| `launa_billing_catalog` | Public billing catalog (no auth) |
| `launa_income_summary` | Seller income summary |
| `launa_facilitator_stats` | Facilitator verify/settle stats |
| `launa_scopes_list` | List assignable API key scopes |
| `launa_supported_networks` | Facilitator supported networks |
| `launa_platform_config` | Platform domain and gateway settings (public) |
| `launa_inspect_url` | Parse HTTP 402 requirements (no wallet) |
| `launa_pay_url` | Sign payment and retry gateway URL |

Tool access follows your API key scopes. Create keys with the permissions you need in the [Launa dashboard](https://launa.io).

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `LAUNA_API_KEY` | Yes | Control-plane API key (`launa_test_...` for Sandbox) |
| `LAUNA_BASE_URL` | No | API base URL (default `https://api.launa.io`) |
| `LAUNA_ENVIRONMENT` | No | `development` for Sandbox / Test mode (fork USDC accepts) |
| `LAUNA_SANDBOX` | No | `1` / `true` — alias for development |
| `LAUNA_EVM_PRIVATE_KEY` | For `launa_pay_url` | EVM key with funds on the gateway network |
| `HEDERA_ACCOUNT_ID` | For `launa_pay_url` | Hedera payer account id |
| `HEDERA_PRIVATE_KEY` | For `launa_pay_url` | Hedera private key |

Sandbox wallet retrieval is CLI + JWT only (`launa --sandbox sandbox-wallet get`); MCP does not expose it.

## Links

- [Full MCP docs](https://github.com/AxLabs/launa-sdks/blob/main/docs/mcp/README.md)
- [Agent guide](https://github.com/AxLabs/launa-sdks/blob/main/docs/agents/README.md)
- [CLI alternative](https://www.npmjs.com/package/@launa/cli)

## License

Apache-2.0

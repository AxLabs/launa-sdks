# @ax402/mcp-server

[Model Context Protocol](https://modelcontextprotocol.io/) server for the [Ax402](https://ax402.io) platform. Exposes seller control-plane operations and x402 buyer helpers as MCP tools for Cursor, Claude Desktop, and other MCP clients.

Runs over **stdio**. Uses `@ax402/sdk` under the hood.

## Install / run

```bash
npx @ax402/mcp-server
```

Requires Node.js 18+.

## Configuration

Set `AX402_API_KEY` (scoped `ax402_live_...` key from the Ax402 dashboard). Optional: `AX402_BASE_URL` (default `https://api.ax402.io`). For paying gateway URLs, set `AX402_EVM_PRIVATE_KEY` and/or `HEDERA_ACCOUNT_ID` + `HEDERA_PRIVATE_KEY`.

### Cursor

Add to `.cursor/mcp.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "ax402": {
      "command": "npx",
      "args": ["-y", "@ax402/mcp-server"],
      "env": {
        "AX402_BASE_URL": "https://api.ax402.io",
        "AX402_API_KEY": "ax402_live_..."
      }
    }
  }
}
```

To enable `ax402_pay_url`, add `AX402_EVM_PRIVATE_KEY` and/or `HEDERA_ACCOUNT_ID` + `HEDERA_PRIVATE_KEY` to `env`.

Example config: [examples/agent-mcp/cursor-mcp.json.example](https://github.com/AxLabs/ax402-sdks/blob/main/examples/agent-mcp/cursor-mcp.json.example).

## Tools

| Tool | Description |
|------|-------------|
| `ax402_list_apis` | List wrapped APIs |
| `ax402_get_api` | Get API by ID |
| `ax402_create_api` | Create API with default subdomain |
| `ax402_list_endpoints` | List endpoints for an API |
| `ax402_add_endpoint` | Add a paid route |
| `ax402_import_openapi` | Import OpenAPI spec as endpoints |
| `ax402_add_domain` | Add custom domain (returns DNS steps) |
| `ax402_list_domains` | List domains for an API |
| `ax402_verify_domain` | Verify domain DNS TXT |
| `ax402_domain_suggest` | Suggest gateway hostname plan |
| `ax402_apis_slug_check` | Check slug availability |
| `ax402_apis_probe_upstream` | Probe upstream reachability |
| `ax402_stats_overview` | Account analytics |
| `ax402_stats_api` | Per-API analytics |
| `ax402_settlements_list` | List settlements |
| `ax402_settlements_export` | Export settlement history (CSV/JSON) |
| `ax402_billing_overview` | Billing overview |
| `ax402_billing_catalog` | Public billing catalog (no auth) |
| `ax402_income_summary` | Seller income summary |
| `ax402_facilitator_stats` | Facilitator verify/settle stats |
| `ax402_scopes_list` | List assignable API key scopes |
| `ax402_supported_networks` | Facilitator supported networks |
| `ax402_platform_config` | Platform domain and gateway settings (public) |
| `ax402_inspect_url` | Parse HTTP 402 requirements (no wallet) |
| `ax402_pay_url` | Sign payment and retry gateway URL |

Tool access follows your API key scopes. Create keys with the permissions you need in the [Ax402 dashboard](https://ax402.io).

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `AX402_API_KEY` | Yes | Control-plane API key |
| `AX402_BASE_URL` | No | API base URL (default `https://api.ax402.io`) |
| `AX402_EVM_PRIVATE_KEY` | For `ax402_pay_url` | EVM key with funds on the gateway network |
| `HEDERA_ACCOUNT_ID` | For `ax402_pay_url` | Hedera payer account id |
| `HEDERA_PRIVATE_KEY` | For `ax402_pay_url` | Hedera private key |

## Links

- [Full MCP docs](https://github.com/AxLabs/ax402-sdks/blob/main/docs/mcp/README.md)
- [Agent guide](https://github.com/AxLabs/ax402-sdks/blob/main/docs/agents/README.md)
- [CLI alternative](https://www.npmjs.com/package/@ax402/cli)

## License

Apache-2.0

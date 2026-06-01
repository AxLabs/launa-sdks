# Ax402 Agent Guide

Machine-readable contract: [openapi/control-plane.yaml](./openapi/control-plane.yaml).

## Bootstrap flow

1. `POST /auth/signup` or `POST /auth/login` → JWT (interactive)
2. `POST /auth/verify-email` with token from email (required before writes)
3. `POST /auth/api-keys` with scopes (JWT only) → `ax402_live_...` key (shown once)
4. Use API key for automation: header `X-API-Key: ax402_live_...`

## Scope presets

| Preset | Scopes |
|--------|--------|
| `readonly` | `apis:read`, `endpoints:read`, `domains:read`, `stats:read`, `settlements:read`, `openapi:read` |
| `apiManager` | `apis:read`, `apis:write`, `endpoints:read`, `endpoints:write`, `domains:read`, `domains:write`, `openapi:read` |
| `analytics` | `stats:read`, `settlements:read` |

## Common recipes

### Wrap an upstream API

```
1. GET /config/platform
2. POST /apis { name, slug, upstream_base_url, pay_to_mode, pay_to_address? }
3. POST /apis/{id}/endpoints { method, path_pattern, accepts[] }
4. Gateway URL: http://{slug}.{platform_domain}:{gateway_port}{path}
```

### Import OpenAPI

```
1. POST /openapi/parse { spec: "<yaml or json>" }  → operations[]
2. POST /apis/{id}/openapi/import { operations[], accepts[] }
```

### Custom domain

```
1. POST /apis/{id}/domains { hostname }
2. Response includes verification_record, cname_target, verification_token
3. POST /apis/{id}/domains/{domainId}/verify
```

## MCP tools

Run `tools/mcp-server` with `AX402_API_KEY` and `AX402_BASE_URL`. Example config: [examples/agent-mcp/cursor-mcp.json.example](./examples/agent-mcp/cursor-mcp.json.example).

| Tool | Scope |
|------|-------|
| `ax402_list_apis` | `apis:read` |
| `ax402_create_api` | `apis:write` + verified email |
| `ax402_add_endpoint` | `endpoints:write` |
| `ax402_import_openapi` | `openapi:read` |
| `ax402_add_domain` | `domains:write` |
| `ax402_verify_domain` | `domains:write` |
| `ax402_domain_suggest` | `domains:read` |
| `ax402_stats_overview` | `stats:read` |
| `ax402_supported_networks` | auth |
| `ax402_platform_config` | public |
| `ax402_pay_url` | buyer (external wallet) |

## CLI

```bash
ax402 apis list --json
ax402 apis create --name "My API" --slug my-api --upstream https://api.example.com --json
ax402 endpoints create --api-id ID --method GET --path "/v1/*" --price-usdc 0.10 --json
ax402 endpoints update --api-id ID --endpoint-id EP --enabled true --json
ax402 endpoints delete --api-id ID --endpoint-id EP --json
ax402 domains suggest --apex example.com --json
ax402 domains add --api-id ID --hostname api.example.com --json
ax402 domains verify --api-id ID --domain-id DOM --json
ax402 keys list --json
ax402 keys create --name ci --scopes apis:read,apis:write --json
ax402 keys revoke --id KEY --json
ax402 auth login --email you@example.com --password secret --json
ax402 pay url --url https://gateway.example/v1/foo --json
```

Exit codes: 0 success, 1 API error, 2 usage error.

## Errors

JSON body: `{"error":"message"}`. Common:

- `401 unauthorized` / `invalid token`
- `403 insufficient scope` / `email verification required` / `jwt required`
- `409 email already registered` / `slug already exists`

## Buyer payments

Pay **gateway URLs** (not the control plane) using the buyer subpackage:

| SDK | Install | Usage |
|-----|---------|-------|
| TypeScript | `npm install @x402/fetch @x402/evm viem` | `import { BuyerClient, buyerClientFromEnv } from "@axlabs/ax402-sdk/buyer"` |
| Go | `go get github.com/x402-foundation/x402/go` | `buyer.NewFromPrivateKey(os.Getenv("AX402_EVM_PRIVATE_KEY"))` |
| Python | `pip install "ax402-sdk[buyer]"` | `BuyerClient.from_env().get(gateway_url)` |

CLI: `ax402 pay url --url https://gateway.example/v1/foo` with `AX402_EVM_PRIVATE_KEY` set.

MCP: `ax402_pay_url` uses the same env var when configured.

Underlying protocol: [x402-foundation/x402](https://github.com/x402-foundation/x402).

## Idempotency

- `POST /apis` with duplicate slug → 409
- OpenAPI import skips existing method+path keys
- Domain verify on already-verified domain → `{ status: "already verified" }`

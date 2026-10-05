# Launa Agent Guide

Seller control-plane reference for agents. API surface: public seller routes on the Launa control-plane API (`https://api.launa.io`).

## Bootstrap flow

1. `POST /auth/signup` or `POST /auth/login` → JWT (interactive)
2. `POST /auth/verify-email` with token from email (required before writes)
3. `POST /auth/api-keys` with scopes (JWT only) → `launa_live_...` key (shown once)
4. Use API key for automation: header `X-API-Key: launa_live_...`

## Scope presets

| Preset | Scopes |
|--------|--------|
| `readonly` | `apis:read`, `endpoints:read`, `domains:read`, `stats:read`, `settlements:read`, `openapi:read`, `billing:read`, `income:read` |
| `apiManager` | `apis:read`, `apis:write`, `endpoints:read`, `endpoints:write`, `domains:read`, `domains:write`, `openapi:read` |
| `analytics` | `stats:read`, `settlements:read`, `billing:read`, `income:read` |

## Common recipes

### Wrap an upstream API

```
1. GET /config/platform
2. POST /apis { name, slug, upstream_base_url, pay_to_mode, pay_to_address?, pay_to_addresses? }
3. POST /apis/{id}/endpoints { method, path_pattern, accepts[], ttl? }
   - omit `ttl` for permanent endpoints; set `ttl` (seconds) for one-time/ephemeral routes
4. Gateway URL: http://{slug}.{platform_domain}:{gateway_port}{path}
```

### Import OpenAPI

```
1. POST /openapi/parse { spec: "<yaml or json>" }  → operations[] (includes request_schema/response_schema when present)
2. POST /apis/{id}/openapi/import { operations[], accepts[] }
```

### Discovery

```
1. GET /apis/{id}/discovery → openapi_url, well_known_url for all verified hosts
2. GET https://{host}/openapi.json  (AgentCash)
3. GET https://{host}/.well-known/x402.json
4. npx -y @agentcash/discovery@latest check "https://{host}/"
```

Optional on create/update: `discovery_guidance`, `discovery_contact_email`, `openapi_version`. Endpoint schemas: `request_schema`, `response_schema`.

### Custom domain

```
1. POST /apis/{id}/domains { hostname }
2. Response includes verification_record, cname_target, verification_token
3. POST /apis/{id}/domains/{domainId}/verify
```

## MCP tools

Install: `npx @launa/mcp-server` (or build from repo). Example config: [examples/agent-mcp/cursor-mcp.json.example](./examples/agent-mcp/cursor-mcp.json.example).

| Tool | Scope |
|------|-------|
| `launa_list_apis` | `apis:read` |
| `launa_get_api` | `apis:read` |
| `launa_discovery_urls` | `apis:read` |
| `launa_set_discovery_guidance` | `apis:write` |
| `launa_list_endpoints` | `endpoints:read` |
| `launa_update_endpoint_schemas` | `endpoints:write` |
| `launa_create_api` | `apis:write` + verified email (optional pay_to_addresses, discovery fields) |
| `launa_add_endpoint` | `endpoints:write` |
| `launa_import_openapi` | `openapi:read` |
| `launa_add_domain` | `domains:write` |
| `launa_verify_domain` | `domains:write` |
| `launa_domain_suggest` | `domains:read` |
| `launa_stats_overview` | `stats:read` |
| `launa_supported_networks` | auth |
| `launa_platform_config` | public |
| `launa_pay_url` | buyer (external wallet) |

## CLI

Install: `npm install -g @launa/cli`

```bash
launa apis list --json
launa --sandbox apis create --name "My API" --slug my-api --upstream https://api.example.com \
  --discovery-guidance "Use GET /v1/*." --json
launa --sandbox endpoints create --api-id ID --method GET --path "/v1/*" --price-usdc 0.10 --json
launa --sandbox sandbox-wallet get --json --wait   # JWT; export private_key for pay url
launa apis discovery --id ID --json
launa discovery urls --api-id ID --json
launa endpoints create --api-id ID --method GET --path "/v1/*" --price-usdc 0.10 --json
launa endpoints update --api-id ID --endpoint-id EP --request-schema '{"type":"object"}' --json
launa endpoints delete --api-id ID --endpoint-id EP --json
launa domains suggest --apex example.com --json
launa domains add --api-id ID --hostname api.example.com --json
launa domains verify --api-id ID --domain-id DOM --json
launa keys list --json
launa keys create --name ci --scopes apis:read,apis:write --json
launa keys revoke --id KEY --json
launa auth login --email you@example.com --password secret --json
launa openapi parse --file spec.yaml --json
launa openapi import --api-id ID --file spec.yaml --price-usdc 0.10 --json
launa stats overview --days 30 --json
launa config platform --json
launa networks supported --json
launa scopes presets --json
launa pay url --url https://gateway.example/v1/foo --json
```

`--sandbox` (or `LAUNA_ENVIRONMENT=development` / `LAUNA_SANDBOX=1`) targets Test mode: development APIs and fork USDC accepts (`eip155:845320402`). Use `launa_test_...` keys (not `launa_live_...`).
Exit codes: 0 success, 1 API error, 2 usage error.

MCP uses `LAUNA_API_KEY` only (no JWT).

## Errors

JSON body: `{"error":"message"}`. Common:

- `401 unauthorized` / `invalid token`
- `403 insufficient scope` / `email verification required` / `jwt required`
- `409 email already registered` / `slug already exists`

## Buyer payments

Pay **gateway URLs** (not the control plane) using the buyer subpackage:

| SDK | Install | Usage |
|-----|---------|-------|
| TypeScript | `npm install @x402/fetch @x402/evm viem` | `import { BuyerClient, buyerClientFromEnv } from "@launa/sdk/buyer"` |
| Go | `go get github.com/AxLabs/launa-sdks/go/buyer` | `buyer.NewFromPrivateKey(os.Getenv("LAUNA_EVM_PRIVATE_KEY"))` |
| Python | `pip install "launa-sdk[buyer]"` | `BuyerClient.from_env().get(gateway_url)` |

CLI: `launa pay url --url https://gateway.example/v1/foo` with `LAUNA_EVM_PRIVATE_KEY` set.

MCP: `launa_pay_url` uses the same env var when configured.

Underlying protocol: [x402-foundation/x402](https://github.com/x402-foundation/x402).

## Idempotency

- `POST /apis` with duplicate slug → 409
- OpenAPI import skips existing method+path keys
- Domain verify on already-verified domain → `{ status: "already verified" }`

# Examples

Runnable scripts for control-plane automation (seller) and gateway payments (buyer).

## Prerequisites

| Language | Install | Env vars |
|----------|---------|----------|
| TypeScript | `pnpm install && pnpm --filter @axlabs/ax402-sdk build` | `LAUNA_API_KEY`, `LAUNA_BASE_URL` (seller) · `LAUNA_EVM_PRIVATE_KEY` (buyer) |
| Python | `pip install -e "packages/python[buyer,dev]"` | same |
| Go | `cd examples/go && go mod tidy` | same |

## TypeScript

From repository root:

```bash
# Create API + paid endpoint
npx tsx examples/typescript/setup-api.ts my-api https://httpbin.org 0.01

# Pay a gateway URL (exact scheme)
npx tsx examples/typescript/pay-gateway.ts https://my-api.launa.io/v1/echo?test=1

# Batch-settlement gateway
npx tsx examples/typescript/pay-gateway.ts --batch https://my-api.launa.io/v1/echo?test=1

# Platform stats
npx tsx examples/typescript/stats-overview.ts 30

# Import OpenAPI as paid endpoints
npx tsx examples/typescript/wrap-openapi.ts path/to/openapi.yaml YOUR_API_ID 0.10
```

## Python

```bash
python examples/python/setup_api.py my-api https://httpbin.org 0.01
python examples/python/pay_gateway.py https://my-api.launa.io/v1/echo?test=1
python examples/python/pay_gateway.py --batch https://my-api.launa.io/v1/echo?test=1
python examples/python/stats_overview.py 30
python examples/python/wrap_openapi.py path/to/openapi.yaml YOUR_API_ID 0.10
```

## Go

```bash
cd examples/go

go run ./setup_api/ my-api https://httpbin.org 0.01
go run ./pay_gateway/ https://my-api.launa.io/v1/echo?test=1
go run ./pay_gateway/ -batch https://my-api.launa.io/v1/echo?test=1
go run ./stats_overview/ 30
go run ./wrap_openapi/ path/to/openapi.yaml YOUR_API_ID 0.10
```

## agent-mcp

Configure Cursor MCP with `tools/mcp-server` — see [docs/agents/README.md](../docs/agents/README.md).

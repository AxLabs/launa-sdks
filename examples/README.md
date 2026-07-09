# Examples

Runnable scripts for control-plane automation (seller) and gateway payments (buyer).

## Prerequisites

| Language | Install (published) | Install (from source) | Env vars |
|----------|---------------------|----------------------|----------|
| TypeScript | `npm install @ax402/sdk` | `pnpm install && pnpm --filter @ax402/sdk build` | `AX402_API_KEY`, `AX402_BASE_URL` (seller) · `AX402_EVM_PRIVATE_KEY` (buyer) |
| Python | `pip install "ax402-sdk[buyer]"` | `pip install -e "packages/python[buyer,dev]"` | same |
| Go | `go get github.com/AxLabs/ax402-sdks/go@latest` | `cd examples/go && go mod tidy` (uses local `replace`) | same |

## TypeScript

From repository root (source) or any project with `@ax402/sdk` installed:

```bash
# Create API + paid endpoint
npx tsx examples/typescript/setup-api.ts my-api https://httpbin.org 0.01

# Pay a gateway URL (exact scheme)
npx tsx examples/typescript/pay-gateway.ts https://my-api.ax402.io/v1/echo?test=1

# Batch-settlement gateway
npx tsx examples/typescript/pay-gateway.ts --batch https://my-api.ax402.io/v1/echo?test=1

# Platform stats
npx tsx examples/typescript/stats-overview.ts 30

# Import OpenAPI as paid endpoints
npx tsx examples/typescript/wrap-openapi.ts path/to/openapi.yaml YOUR_API_ID 0.10
```

## Python

```bash
python examples/python/setup_api.py my-api https://httpbin.org 0.01
python examples/python/pay_gateway.py https://my-api.ax402.io/v1/echo?test=1
python examples/python/pay_gateway.py --batch https://my-api.ax402.io/v1/echo?test=1
python examples/python/stats_overview.py 30
python examples/python/wrap_openapi.py path/to/openapi.yaml YOUR_API_ID 0.10
```

## Go

```bash
cd examples/go

go run ./setup_api/ my-api https://httpbin.org 0.01
go run ./pay_gateway/ https://my-api.ax402.io/v1/echo?test=1
go run ./pay_gateway/ -batch https://my-api.ax402.io/v1/echo?test=1
go run ./stats_overview/ 30
go run ./wrap_openapi/ path/to/openapi.yaml YOUR_API_ID 0.10
```

## agent-mcp

Configure Cursor with the published MCP server — see [examples/agent-mcp/cursor-mcp.json.example](./agent-mcp/cursor-mcp.json.example) and [docs/agents/README.md](../docs/agents/README.md).

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

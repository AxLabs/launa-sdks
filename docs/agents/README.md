# MCP tools and CLI recipes

Agent automation combines the [CLI](../cli/README.md) and [MCP server](../mcp/README.md).

Platform guide (dashboard, gateway, MCP setup): [ax402-frontend `/docs/agents`](https://github.com/AxLabs/ax402-frontend).

Run pnpm commands below from the **ax402-sdk** repository root.

## MCP server

```bash
pnpm --filter @axlabs/ax402-mcp-server build
AX402_API_KEY=ax402_live_... AX402_BASE_URL=http://api.localhost:8090 node tools/mcp-server/dist/index.js
```

Full tool list: [../mcp/README.md](../mcp/README.md).

## CLI

```bash
pnpm --filter @axlabs/ax402-cli build
export AX402_API_KEY=ax402_live_...
ax402 apis list --json
ax402 endpoints create --api-id ID --method GET --path "/wp-json/wp/v2/posts" --price-usdc 0.01 --json
```

See [../cli/README.md](../cli/README.md).

## Scope presets

See `packages/typescript/src/scopes.ts` — `readonly`, `apiManager`, `analytics`.

Use `apiManager` for plugin automation keys:

```
apis:read, apis:write, endpoints:read, endpoints:write, domains:read, domains:write, openapi:read
```

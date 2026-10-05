# MCP tools and CLI recipes

Agent automation combines the [CLI](../cli/README.md) and [MCP server](../mcp/README.md).

Dashboard guide (gateway, MCP setup): [launa.io/docs/agents](https://launa.io/docs/agents).

Run pnpm commands below from the **ax402-sdk** repository root.

## MCP server

```bash
pnpm --filter @axlabs/launa-mcp-server build
LAUNA_API_KEY=launa_live_... LAUNA_BASE_URL=https://api.launa.io node tools/mcp-server/dist/index.js
```

Full tool list: [../mcp/README.md](../mcp/README.md).

## CLI

```bash
pnpm --filter @axlabs/launa-cli build
export LAUNA_API_KEY=launa_live_...
launa apis list --json
launa endpoints create --api-id ID --method GET --path "/wp-json/wp/v2/posts" --price-usdc 0.01 --json
```

See [../cli/README.md](../cli/README.md).

## Scope presets

See `packages/typescript/src/scopes.ts` — `readonly`, `apiManager`, `analytics`.

Use `apiManager` for API automation keys:

```
apis:read, apis:write, endpoints:read, endpoints:write, domains:read, domains:write, openapi:read
```

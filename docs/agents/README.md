# MCP tools and CLI recipes

Agent automation combines the [CLI](../cli/README.md) and [MCP server](../mcp/README.md).

Dashboard guide (gateway, MCP setup): [launa.io/docs/agents](https://launa.io/docs/agents).

## MCP server

```bash
npx @launa/mcp-server
```

Full tool list: [../mcp/README.md](../mcp/README.md).

## CLI

```bash
npm install -g @launa/cli
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

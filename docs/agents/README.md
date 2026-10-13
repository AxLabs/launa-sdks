# MCP tools and CLI recipes

Agent automation combines the [CLI](../cli/README.md) and [MCP server](../mcp/README.md).

Dashboard guide (gateway, MCP setup): [launa.io/docs/agents](https://launa.io/docs/agents).

## MCP server

```bash
npx @launaio/mcp-server
```

Full tool list: [../mcp/README.md](../mcp/README.md).

## CLI

```bash
npm install -g @launaio/cli
export LAUNA_API_KEY=launa_live_...
launa apis list --json
launa apis create --name "My API" --slug my-api --upstream https://api.example.com \
  --discovery-guidance "Use GET /v1/*." --json
launa discovery urls --api-id ID --json
launa endpoints create --api-id ID --method GET --path "/wp-json/wp/v2/posts" --price-usdc 0.01 --json
```

See [../cli/README.md](../cli/README.md). Discovery: seller [API discovery](https://launa.io/docs/guides/discovery).

## Scope presets

See `packages/typescript/src/scopes.ts` — `readonly`, `apiManager`, `analytics`.

Use `apiManager` for API automation keys:

```
apis:read, apis:write, endpoints:read, endpoints:write, domains:read, domains:write, openapi:read
```

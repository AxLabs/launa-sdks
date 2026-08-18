# MCP tools and CLI recipes

Agent automation combines the [CLI](../cli/README.md) and [MCP server](../mcp/README.md).

Dashboard guide (gateway, MCP setup): [ax402.io/docs/agents](https://ax402.io/docs/agents).

## MCP server

```bash
npx @ax402/mcp-server
```

Full tool list: [../mcp/README.md](../mcp/README.md).

## CLI

```bash
npm install -g @ax402/cli
export AX402_API_KEY=ax402_live_...
ax402 commands --json
ax402 apis list --json
ax402 apis create --name "My API" --slug my-api --upstream https://api.example.com \
  --discovery-guidance "Use GET /v1/*." --json
ax402 discovery urls --api-id ID --json
ax402 endpoints create --api-id ID --method GET --path "/wp-json/wp/v2/posts" --price-usdc 0.01 --json
```

See [../cli/README.md](../cli/README.md). Discovery: seller [API discovery](https://ax402.io/docs/guides/discovery).

## Scope presets

See `packages/typescript/src/scopes.ts` — `readonly`, `apiManager`, `analytics`.

Use `apiManager` for API automation keys:

```
apis:read, apis:write, endpoints:read, endpoints:write, domains:read, domains:write, openapi:read
```

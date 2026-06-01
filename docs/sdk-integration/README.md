# SDK integration

Programmatic control of the Ax402 control plane from your codebase.

## Control plane vs buyer

- **Control plane** — APIs, endpoints, domains, keys, stats (seller automation)
- **Buyer** — pay wrapped gateway URLs from your application

## TypeScript

```typescript
import { Ax402Client } from "@axlabs/ax402-sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY!,
});
```

See [sdks/typescript](../sdks/typescript/README.md).

## When to use

- CI/CD provisions APIs and endpoints
- Custom admin UIs or internal tools
- Agents that manage the platform and pay gateway URLs

## Tools

Same API surface as [CLI](../cli/README.md) and [MCP](../mcp/README.md).

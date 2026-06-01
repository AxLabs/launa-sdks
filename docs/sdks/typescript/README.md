# TypeScript SDK

Package: `@axlabs/ax402-sdk` in `packages/typescript/`.

## Install

```bash
pnpm add @axlabs/ax402-sdk
```

## Control plane

```typescript
import { Ax402Client } from "@axlabs/ax402-sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY,
});
```

## Buyer

```typescript
import { payAndFetch } from "@axlabs/ax402-sdk/buyer";

const res = await payAndFetch("https://myapi.localhost:8090/v1/data");
```

## Build & test

```bash
pnpm --filter @axlabs/ax402-sdk build
pnpm --filter @axlabs/ax402-sdk test
```

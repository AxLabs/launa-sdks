# TypeScript SDK

Package: `@ax402/sdk` in `packages/typescript/`.

Subpaths: main entry, `/buyer`, `/platform`.

## Install

```bash
pnpm add @ax402/sdk
# Buyer (optional)
pnpm add @x402/fetch @x402/evm viem
```

## Control plane

```typescript
import { Ax402Client, buildUsdcAccept, usdcToAtomic } from "@ax402/sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY,
});

const apis = await client.apis.list();
```

Resources: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `billing`, `income`, `exchangeRates`, `config`.

## Buyer

Pay gateway URLs — not the control plane. Full guide: [buyers](../buyers/README.md).

```typescript
import { buyerClientFromEnv } from "@ax402/sdk/buyer";

const client = await buyerClientFromEnv();
const { response, payment } = await client.pay({
  url: "https://my-api.ax402.io/v1/echo?test=1",
});
```

Batch-settlement gateways:

```typescript
const client = await buyerClientFromEnv({ batch: { depositMultiplier: 5 } });
```

Browser wallet: `createEvmSignerFromBrowserProvider()` + `BuyerClient.create(signer)`.

## Platform helpers

`SCOPE_PRESETS`, `usdcToAtomic`, `atomicToUsdc`, `buildUsdcAccept`, `gatewayURL`, `setupApiWithDefaultDomain`, `wrapOpenAPI`.

## Build & test

```bash
pnpm --filter @ax402/sdk build
pnpm --filter @ax402/sdk test
```

## Examples

See [examples/typescript/](../../examples/typescript/) — setup API, pay gateway, stats, wrap OpenAPI. Run with `npx tsx examples/typescript/<script>.ts`.

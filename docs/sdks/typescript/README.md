# TypeScript SDK

Package: `@axlabs/launa-sdk` in `packages/typescript/`.

Subpaths: main entry, `/buyer`, `/platform`.

## Install

```bash
pnpm add @axlabs/launa-sdk
# Buyer (optional)
pnpm add @x402/fetch @x402/evm viem
```

## Control plane

```typescript
import { LaunaClient, buildUsdcAccept, usdcToAtomic } from "@axlabs/launa-sdk";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL!,
  apiKey: process.env.LAUNA_API_KEY,
});

const apis = await client.apis.list();
```

Resources: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `billing`, `income`, `exchangeRates`, `config`.

## Buyer

Pay gateway URLs — not the control plane. Full guide: [buyers](../buyers/README.md).

```typescript
import { buyerClientFromEnv } from "@axlabs/launa-sdk/buyer";

const client = await buyerClientFromEnv();
const { response, payment } = await client.pay({
  url: "https://my-api.launa.io/v1/echo?test=1",
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
pnpm --filter @axlabs/launa-sdk build
pnpm --filter @axlabs/launa-sdk test
```

## Examples

See [examples/typescript/](../../examples/typescript/) — setup API, pay gateway, stats, wrap OpenAPI. Run with `npx tsx examples/typescript/<script>.ts`.

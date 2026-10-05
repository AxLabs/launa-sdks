# TypeScript SDK

Package: `@axlabs/ax402-sdk` in `packages/typescript/`.

Subpaths: main entry, `/buyer`, `/platform`.

## Install

```bash
pnpm add @axlabs/ax402-sdk
# Buyer (optional)
pnpm add @x402/fetch @x402/evm viem
```

## Control plane

```typescript
import { LaunaClient, buildUsdcAccept, usdcToAtomic } from "@axlabs/ax402-sdk";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL!,
  apiKey: process.env.LAUNA_API_KEY,
});

const apis = await client.apis.list();
```

Resources: `auth`, `keys`, `apis`, `endpoints`, `domains`, `openapi`, `stats`, `settlements`, `config`.

TypeScript has the broadest control-plane surface (MFA, passkeys, facilitator stats, global payment history). Go and Python target scoped API-key automation — see [buyers](../buyers/README.md) for buyer parity.

## Buyer

Pay gateway URLs — not the control plane. Full guide: [buyers](../buyers/README.md).

```typescript
import { buyerClientFromEnv } from "@axlabs/ax402-sdk/buyer";

const client = await buyerClientFromEnv();
const { response, payment } = await client.pay({
  url: "https://echo.staging.launa.io/echo/get?test=1",
});
```

Batch-settlement gateways:

```typescript
const client = await buyerClientFromEnv({ batch: { depositMultiplier: 5 } });
```

Browser wallet: `createEvmSignerFromBrowserProvider()` + `BuyerClient.create(signer)`.

## Platform helpers

`SCOPE_PRESETS`, `usdcToAtomic`, `buildUsdcAccept`, `buildBatchUsdcAccept`, `gatewayURL`, `setupApiWithDefaultDomain`, `wrapOpenAPI`.

## Build & test

```bash
pnpm --filter @axlabs/ax402-sdk build
pnpm --filter @axlabs/ax402-sdk test
```

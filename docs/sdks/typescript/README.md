# TypeScript SDK

Package: `@ax402/sdk` in `packages/typescript/`.

Subpaths: main entry, `/buyer`, `/platform`.

## Install

```bash
pnpm add @ax402/sdk
# Buyer (optional)
pnpm add @x402/fetch @x402/evm viem
# Hedera buyer (optional)
pnpm add @x402/hedera
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

Settlement webhooks on an API:

```typescript
await client.apis.create({
  name: "Shopify channel",
  slug: "acme-shop",
  upstream_base_url: "https://shopify-app.example",
  webhook_url: "https://shopify-app.example/webhooks/ax402/settlement",
  webhook_secret: "whsec_...",
});
await client.apis.listWebhookDeliveries(apiId);
```

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

Hedera (`hedera:testnet` / `hedera:mainnet`):

```bash
pnpm add @x402/hedera
export HEDERA_ACCOUNT_ID=0.0.xxxx
export HEDERA_PRIVATE_KEY=0x...   # ECDSA preferred
```

```typescript
import { buyerClientFromHederaCredentials, BuyerClient } from "@ax402/sdk/buyer";

const client = await buyerClientFromHederaCredentials({
  accountId: process.env.HEDERA_ACCOUNT_ID!,
  privateKey: process.env.HEDERA_PRIVATE_KEY!,
  network: "hedera:testnet",
});
// Or combined with EVM: BuyerClient.create(evmSigner, { hedera: { ... } })
```

Sellers must use `user_wallet` with a Hedera `0.0.x` payTo (associate HTS USDC). Platform wallet is not supported for Hedera.

## Platform helpers

`SCOPE_PRESETS`, `usdcToAtomic`, `atomicToUsdc`, `buildUsdcAccept`, `gatewayURL`, `setupApiWithDefaultDomain`, `wrapOpenAPI`.

## Build & test

```bash
pnpm --filter @ax402/sdk build
pnpm --filter @ax402/sdk test
```

## Examples

See [examples/typescript/](../../examples/typescript/) — setup API, pay gateway, stats, wrap OpenAPI. Run with `npx tsx examples/typescript/<script>.ts`.

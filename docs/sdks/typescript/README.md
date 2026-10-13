# TypeScript SDK

Package: `@launaio/sdk` in `packages/typescript/`.

Subpaths: main entry, `/buyer`, `/platform`.

## Install

```bash
pnpm add @launaio/sdk
# Buyer (optional)
pnpm add @x402/fetch @x402/evm viem
# Hedera buyer (optional)
pnpm add @x402/hedera
```

## Control plane

```typescript
import { LaunaClient, buildUsdcAccept, usdcToAtomic } from "@launaio/sdk";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL!,
  apiKey: process.env.LAUNA_API_KEY,
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
  pay_to_address: "0xYourWallet",
  pay_to_addresses: { "hedera:testnet": "0.0.1234" },
  webhook_url: "https://shopify-app.example/webhooks/launa/settlement",
  webhook_secret: "whsec_...",
});
await client.apis.listWebhookDeliveries(apiId);
```

### Discovery

```typescript
await client.apis.create({
  name: "Search",
  slug: "search",
  upstream_base_url: "https://upstream.example.com",
  discovery_guidance: "Use POST /search with a query field.",
  discovery_contact_email: "support@example.com",
  openapi_version: "1.0.0",
});
const urls = await client.apis.discovery(apiId); // openapi_url, well_known_url, host_urls
await client.endpoints.update(apiId, endpointId, {
  request_schema: { type: "object", properties: { query: { type: "string" } } },
  response_schema: { type: "object", additionalProperties: true },
});
```

Gateway hosts also serve unpaid `GET /openapi.json` and `GET /.well-known/x402.json`.

## Buyer

Pay gateway URLs — not the control plane. Full guide: [buyers](../buyers/README.md).

```typescript
import { buyerClientFromEnv } from "@launaio/sdk/buyer";

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

Hedera (`hedera:mainnet`):

```bash
pnpm add @x402/hedera
export HEDERA_ACCOUNT_ID=0.0.xxxx
export HEDERA_PRIVATE_KEY=0x...   # ECDSA preferred
```

```typescript
import { buyerClientFromHederaCredentials, BuyerClient } from "@launaio/sdk/buyer";

const client = await buyerClientFromHederaCredentials({
  accountId: process.env.HEDERA_ACCOUNT_ID!,
  privateKey: process.env.HEDERA_PRIVATE_KEY!,
  network: "hedera:mainnet",
});
// Or combined with EVM: BuyerClient.create(evmSigner, { hedera: { ... } })
```

Sellers must use `user_wallet` with a Hedera `0.0.x` payTo (associate HTS USDC). Platform wallet is not supported for Hedera.

## Platform helpers

`SCOPE_PRESETS`, `usdcToAtomic`, `atomicToUsdc`, `buildUsdcAccept`, `gatewayURL`, `setupApiWithDefaultDomain`, `wrapOpenAPI`.

## Build & test

```bash
pnpm --filter @launaio/sdk build
pnpm --filter @launaio/sdk test
```

## Examples

See [examples/typescript/](../../examples/typescript/) — setup API, pay gateway, stats, wrap OpenAPI. Run with `npx tsx examples/typescript/<script>.ts`.

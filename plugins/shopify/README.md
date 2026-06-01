# Ax402 Shopify App (starter)

Remix-based Shopify app skeleton for linking products to ax402 gateway endpoints.

## Prerequisites

- Shopify Partner account
- Node.js 22+
- ax402 API key with `apiManager` scopes

## Setup

```bash
npm create @shopify/app@latest
# Or copy this starter and run:
npm install
cp .env.example .env
npm run dev
```

## Architecture (Phase 1)

```
Merchant OAuth → App stores AX402_API_KEY (encrypted) + API ID
Product mapping UI → ax402 SDK creates/updates gateway endpoints
Buyer (x402 client) → gateway hostname → Shopify Storefront/upstream
```

## Environment

```
AX402_BASE_URL=http://api.localhost:8090
AX402_API_KEY=ax402_live_...
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
```

## Implementation notes

This starter provides structure only. Full Shopify CLI scaffold should be generated with:

```bash
shopify app init --template remix
```

Then add `@axlabs/ax402-sdk` to the app backend:

```typescript
import { Ax402Client, buildUsdcAccept, usdcToAtomic } from "@axlabs/ax402-sdk";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL!,
  apiKey: process.env.AX402_API_KEY!,
});

// Link product variant to paid endpoint
await client.endpoints.create(apiId, {
  method: "GET",
  path_pattern: `/products/${productId}`,
  accepts: [buildUsdcAccept("exact", usdcToAtomic(price))],
});
```

## Phase 2 — checkout hybrid

Shopify Checkout extensibility is limited. Recommended: headless storefront (Hydrogen) with x402 for digital/API tier; native checkout for physical goods.

See [docs/ecommerce/README.md](../../docs/ecommerce/README.md).

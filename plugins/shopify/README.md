# Ax402 Shopify App

Remix app that links Shopify products to ax402 gateway endpoints (Phase 1 gateway wrap).

## Prerequisites

- Node.js 22+
- ax402 API key with SDK `apiManager` scope preset
- Shopify Partner account (for production OAuth)

## Quick start (local dev)

```bash
cd ax402-sdk
pnpm install --frozen-lockfile
pnpm --filter @axlabs/ax402-sdk build

cd plugins/shopify
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173/app?session=offline_dev](http://localhost:5173/app?session=offline_dev) — dev mode uses mock products and an in-memory Shopify session.

Point `AX402_BASE_URL` at your control plane (or the mock server is only used in automated tests).

## Testing

All tests run in CI (`npm test` from `plugins/shopify`).

| Command | What it runs |
|---------|----------------|
| `npm test` | Unit tests (crypto, mapping, actions) + integration test against the SDK mock control plane |
| `npm run test:integration` | Integration flow only (onboard → monetize → dashboard) |
| `npm run test:watch` | Vitest watch mode |

Integration tests live in `app/lib/shopify-actions.integration.test.ts` and use `ax402-sdk/test/fixtures/mock-control-plane.ts` — no Shopify or live ax402 stack required.

Manual UI check:

```bash
npm run dev
# Connect with a real apiManager key, or use onboard with AX402_BASE_URL=http://api.localhost:8090
```

## Configuration

| Variable | Purpose |
|----------|---------|
| `AX402_BASE_URL` | Control plane URL |
| `SHOPIFY_ENCRYPTION_SECRET` | AES-GCM key for stored merchant API keys (required in production) |
| `SHOPIFY_DEV_MODE` | `1` (default): sample products + dev session; `0`: production |
| `SHOPIFY_DEV_SHOP` | Shop domain in dev mode |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Shopify Partner app credentials |

## Merchant workflow

1. **Connect** — paste API key + existing API ID, or **Onboard** to auto-create an API via `setupApiWithDefaultDomain`.
2. **Gateway** — view buyer base URL and existing endpoints.
3. **Monetize** — per product: USDC price, path (`/products/:id` or Storefront JSON), scheme (`exact` or `batch-settlement`).

Traffic:

```
Buyer (x402 client) → gateway hostname → ax402 verify/settle → https://{shop}.myshopify.com
```

## SDK parity

Uses the same helpers as the CLI/MCP: `buildUsdcAccept`, `usdcToAtomic`, `setupApiWithDefaultDomain`, `gatewayURL`, endpoint CRUD, and both `exact` and `batch-settlement` schemes.

## Production Shopify

Generate a full app with Shopify CLI and merge this `app/` tree:

```bash
shopify app init --template remix
```

Wire OAuth (`auth.callback`) to real token exchange and load products from the Admin API when `SHOPIFY_DEV_MODE=0`.

See [docs/ecommerce/README.md](../../docs/ecommerce/README.md).

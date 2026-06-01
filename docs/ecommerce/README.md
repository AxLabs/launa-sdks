# E-commerce integration guide

Ax402 monetizes HTTP APIs via x402 payment gating. E-commerce plugins connect a store to the **control plane** and expose paid resources through the **gateway**.

## Phase 1 — Gateway wrap (recommended first)

Buyers pay with x402-capable clients/wallets to access protected resources.

| Platform | Approach |
|----------|----------|
| WordPress | Plugin stores API key + API ID; sync REST routes as paid endpoints |
| WooCommerce | Extend WP plugin: map product/download URLs to gateway endpoints |
| Shopify | Remix app: OAuth + link products to gateway endpoints |

Traffic flow:

```
Buyer (x402 client) → gateway.{platform} → ax402 verify/settle → upstream (WP/WC/Shopify API)
```

Store admin configures via ax402 dashboard or plugin using `@axlabs/ax402-sdk`.

## Phase 2 — Checkout hybrid (explore)

x402 alongside native checkout for cart flows.

| Platform | Feasibility | Realistic path |
|----------|-------------|----------------|
| WooCommerce | Medium | Custom gateway OR post-checkout webhook unlocks x402-protected download |
| Shopify | Hard | Headless/Hydrogen for x402 tier; Shopify Checkout for physical goods |
| WordPress | Medium | Membership + x402 API tier |

Hybrid pattern: **x402 for programmatic/digital access + traditional checkout for physical goods**.

## Buyer UX

Gateway-wrap requires buyers to use x402 clients (`@x402/fetch`, `x402-go-client-example`). This suits API access, digital downloads, and agent/automation use cases — not typical one-click card checkout.

## Plugin starters

- [`plugins/wordpress/`](../plugins/wordpress/) — PHP settings + endpoint sync skeleton
- [`plugins/woocommerce/`](../plugins/woocommerce/) — WC hooks extension
- [`plugins/shopify/`](../plugins/shopify/) — Remix app starter

## Required scopes (API keys)

Use `apiManager` preset from SDK for plugin automation:

```
apis:read, apis:write, endpoints:read, endpoints:write, domains:read, domains:write, openapi:read
```

## Checkout hybrid POC scope (Phase 2)

1. WooCommerce: order-complete hook → create time-limited gateway token or unlock endpoint
2. Shopify: evaluate Checkout UI extensions vs headless-only x402
3. Document limitations in plugin README before marketplace submission

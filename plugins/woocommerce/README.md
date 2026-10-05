# Launa Gateway for WooCommerce

Extends [Launa Gateway for WordPress](../wordpress/). Monetizes products via gateway endpoints with upsert semantics (no duplicate endpoints on re-save).

## Requirements

- WordPress + WooCommerce
- Launa Gateway plugin active
- USDC prices set per product (store currency is **not** auto-converted)

## Product metabox

Per product (**Launa monetization** sidebar):

| Field | Purpose |
|-------|---------|
| Monetize via x402 | Enable sync on save |
| Price (USDC) | Payment amount (required for sync) |
| Gateway path | REST product (`/wp-json/wc/v3/products/{id}`), download query, or custom pattern |
| Scheme | `exact` or `batch-settlement` |

Shows buyer gateway URL and endpoint ID after successful sync. Errors are stored and shown in the metabox.

## Upstream

Onboard the WordPress site with upstream `https://your-store.com/wp-json` (default onboard path). WooCommerce REST paths are matched under that origin.

## Phase 2

`launa_wc_order_complete` action fires on `woocommerce_order_status_completed` for post-checkout unlock flows. See [docs/ecommerce/README.md](../../docs/ecommerce/README.md).

## Testing

```bash
cd launa-sdk/plugins && composer test
```

Path helpers are covered in `tests/WcPathsTest.php`.

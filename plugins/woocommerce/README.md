# Ax402 WooCommerce extension

Requires [Ax402 Gateway for WordPress](../wordpress/).

## Phase 1

- Syncs downloadable product price to gateway endpoint on product save
- Path pattern: `/wc-api/download-product/{id}` (customize for your setup)

## Phase 2 — checkout hybrid

`woocommerce_order_status_completed` hook stub for post-purchase unlock flows. See [docs/ecommerce/README.md](../../docs/ecommerce/README.md).

## Upstream URL

When creating the ax402 API, set `upstream_base_url` to your WooCommerce store origin, e.g. `https://shop.example.com`.

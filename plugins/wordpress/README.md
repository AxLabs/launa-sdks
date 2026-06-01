# Ax402 Gateway for WordPress

Phase 1 starter plugin — connects WordPress admin to ax402 control plane.

## Install

Copy `ax402-gateway.php` to `wp-content/plugins/ax402-gateway/` and activate.

## Configure

Settings → Ax402:

- Control plane URL (`http://api.localhost:8090`)
- Scoped API key (`apiManager` preset)
- API ID from ax402 dashboard

## Architecture

```
Buyer → gateway.{slug}.localhost → x402 payment → WordPress upstream (REST API)
```

WordPress does not handle x402 directly; the ax402 gateway proxies to your site URL configured as upstream.

## Sync endpoints

Use CLI or call `ax402_sync_endpoint()` from custom code:

```bash
ax402 endpoints create --api-id YOUR_ID --method GET \
  --path "/wp-json/wp/v2/posts" --price-usdc 0.01 --json
```

## Phase 2 (checkout hybrid)

See [docs/ecommerce/README.md](../../docs/ecommerce/README.md) — WooCommerce order hooks can unlock x402-protected download URLs post-purchase.

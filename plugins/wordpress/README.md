# Ax402 Gateway for WordPress

Production plugin — connects WordPress to the ax402 control plane and monetizes REST routes via x402.

## Requirements

- WordPress 6.0+
- PHP 8.0+ with OpenSSL (encrypted API key storage)
- ax402 API key with SDK `apiManager` scope preset

## Install

Copy the plugin folder to `wp-content/plugins/ax402-gateway/`:

```
ax402-gateway/
  ax402-gateway.php
  includes/admin-page.php
../shared/   → symlink or copy shared/ beside wordpress/ (see layout below)
```

Recommended layout in `wp-content/plugins/`:

```
ax402-shared/          ← copy from ax402-sdk/plugins/shared/
ax402-gateway/         ← this plugin (wordpress/)
ax402-woocommerce/     ← optional WooCommerce extension
```

Or bundle `shared/` inside `ax402-gateway/shared/` and change the `require_once` path in `ax402-gateway.php`.

## Configure

**Settings → Ax402**

1. Set control plane URL and API key (stored encrypted).
2. **Create API & gateway** — auto-onboards with upstream `https://yoursite.com/wp-json` and default gateway subdomain.
3. Or paste an existing **API ID** from the dashboard.
4. **Sync REST route** — pick a route, USDC price, and scheme (`exact` or `batch-settlement`).

Re-syncing the same method + path **updates** the endpoint instead of creating duplicates.

## Security

Define in `wp-config.php` for production:

```php
define('AX402_ENCRYPTION_SECRET', 'long-random-string');
```

Falls back to `AUTH_KEY` if unset.

## Testing (no WordPress install required)

```bash
cd ax402-sdk/plugins
composer install
composer test
```

## Architecture

```
Buyer (x402 client) → gateway.{slug}.{platform_domain} → verify/settle → your-site/wp-json/...
```

# Launa Gateway for WordPress

Production plugin — connects WordPress to the launa control plane and monetizes REST routes via x402.

## Requirements

- WordPress 6.0+
- PHP 8.0+ with OpenSSL (encrypted API key storage)
- launa API key with SDK `apiManager` scope preset

## Install

Copy the plugin folder to `wp-content/plugins/launa-gateway/`:

```
launa-gateway/
  launa-gateway.php
  includes/admin-page.php
../shared/   → symlink or copy shared/ beside wordpress/ (see layout below)
```

Recommended layout in `wp-content/plugins/`:

```
launa-shared/          ← copy from ax402-sdk/plugins/shared/
launa-gateway/         ← this plugin (wordpress/)
launa-woocommerce/     ← optional WooCommerce extension
```

Or bundle `shared/` inside `launa-gateway/shared/` and change the `require_once` path in `launa-gateway.php`.

## Configure

**Settings → Launa**

1. Set control plane URL and API key (stored encrypted).
2. **Create API & gateway** — auto-onboards with upstream `https://yoursite.com/wp-json` and default gateway subdomain.
3. Or paste an existing **API ID** from the dashboard.
4. **Sync REST route** — pick a route, USDC price, and scheme (`exact` or `batch-settlement`).

Re-syncing the same method + path **updates** the endpoint instead of creating duplicates.

## Security

Define in `wp-config.php` for production:

```php
define('LAUNA_ENCRYPTION_SECRET', 'long-random-string');
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

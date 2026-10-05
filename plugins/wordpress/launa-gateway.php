<?php
/**
 * Plugin Name: Launa Gateway
 * Description: Connect WordPress to launa — monetize REST routes via x402 payment gateway.
 * Version: 1.0.0
 * Author: AxLabs
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LAUNA_PLUGIN_VERSION', '1.0.0');
define('LAUNA_PLUGIN_DIR', __DIR__);

$launa_bootstrap_loaded = false;
foreach ([LAUNA_PLUGIN_DIR . '/shared/bootstrap.php', LAUNA_PLUGIN_DIR . '/../shared/bootstrap.php'] as $bootstrap) {
    if (is_readable($bootstrap)) {
        require_once $bootstrap;
        $launa_bootstrap_loaded = true;
        break;
    }
}
if (!$launa_bootstrap_loaded) {
    add_action('admin_notices', static function (): void {
        echo '<div class="notice notice-error"><p>Launa Gateway: copy <code>plugins/shared</code> to <code>launa-gateway/shared</code> (see plugin README).</p></div>';
    });
    return;
}
require_once LAUNA_PLUGIN_DIR . '/includes/admin-page.php';

function launa_admin_menu(): void
{
    add_options_page('Launa', 'Launa', 'manage_options', 'launa', 'launa_render_admin_page');
}
add_action('admin_menu', 'launa_admin_menu');

function launa_sync_endpoint(
    string $method,
    string $path_pattern,
    string $amount_atomic,
    string $scheme = 'exact',
    ?string $description = null,
): array|WP_Error {
    return launa_upsert_endpoint($method, $path_pattern, $amount_atomic, $scheme, $description);
}

register_uninstall_hook(__FILE__, 'launa_uninstall');

function launa_uninstall(): void
{
    delete_option(LAUNA_OPTION_KEY);
}

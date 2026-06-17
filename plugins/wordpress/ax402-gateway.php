<?php
/**
 * Plugin Name: Ax402 Gateway
 * Description: Connect WordPress to ax402 — monetize REST routes via x402 payment gateway.
 * Version: 1.0.0
 * Author: AxLabs
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AX402_PLUGIN_VERSION', '1.0.0');
define('AX402_PLUGIN_DIR', __DIR__);

$ax402_bootstrap_loaded = false;
foreach ([AX402_PLUGIN_DIR . '/shared/bootstrap.php', AX402_PLUGIN_DIR . '/../shared/bootstrap.php'] as $bootstrap) {
    if (is_readable($bootstrap)) {
        require_once $bootstrap;
        $ax402_bootstrap_loaded = true;
        break;
    }
}
if (!$ax402_bootstrap_loaded) {
    add_action('admin_notices', static function (): void {
        echo '<div class="notice notice-error"><p>Ax402 Gateway: copy <code>plugins/shared</code> to <code>ax402-gateway/shared</code> (see plugin README).</p></div>';
    });
    return;
}
require_once AX402_PLUGIN_DIR . '/includes/admin-page.php';

function ax402_admin_menu(): void
{
    add_options_page('Ax402', 'Ax402', 'manage_options', 'ax402', 'ax402_render_admin_page');
}
add_action('admin_menu', 'ax402_admin_menu');

function ax402_sync_endpoint(
    string $method,
    string $path_pattern,
    string $amount_atomic,
    string $scheme = 'exact',
    ?string $description = null,
): array|WP_Error {
    return ax402_upsert_endpoint($method, $path_pattern, $amount_atomic, $scheme, $description);
}

register_uninstall_hook(__FILE__, 'ax402_uninstall');

function ax402_uninstall(): void
{
    delete_option(AX402_OPTION_KEY);
}

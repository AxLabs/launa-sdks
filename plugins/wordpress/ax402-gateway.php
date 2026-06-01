<?php
/**
 * Plugin Name: Ax402 Gateway
 * Description: Connect WordPress to ax402 — monetize REST routes via x402 payment gateway.
 * Version: 0.2.0
 * Author: AxLabs
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AX402_PLUGIN_VERSION', '0.2.0');
define('AX402_OPTION_KEY', 'ax402_settings');

require_once __DIR__ . '/../shared/ax402-client.php';

function ax402_get_settings(): array
{
    $defaults = [
        'base_url' => 'http://api.localhost:8090',
        'api_key' => '',
        'api_id' => '',
        'gateway_hostname' => '',
        'onboarding_done' => false,
    ];
    return wp_parse_args(get_option(AX402_OPTION_KEY, []), $defaults);
}

function ax402_admin_menu(): void
{
    add_options_page('Ax402', 'Ax402', 'manage_options', 'ax402', 'ax402_settings_page');
}
add_action('admin_menu', 'ax402_admin_menu');

function ax402_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    if (isset($_POST['ax402_save']) && check_admin_referer('ax402_settings')) {
        update_option(AX402_OPTION_KEY, [
            'base_url' => esc_url_raw($_POST['base_url'] ?? ''),
            'api_key' => sanitize_text_field($_POST['api_key'] ?? ''),
            'api_id' => sanitize_text_field($_POST['api_id'] ?? ''),
            'gateway_hostname' => sanitize_text_field($_POST['gateway_hostname'] ?? ''),
            'onboarding_done' => !empty($_POST['onboarding_done']),
        ]);
        echo '<div class="updated"><p>Settings saved.</p></div>';
    }
    if (isset($_POST['ax402_onboard']) && check_admin_referer('ax402_onboard')) {
        $client = ax402_client();
        if ($client) {
            $slug = sanitize_title(get_bloginfo('name'));
            $result = $client->create_api(get_bloginfo('name'), $slug, home_url('/wp-json'));
            if (isset($result['data']['id'])) {
                $s = ax402_get_settings();
                $s['api_id'] = $result['data']['id'];
                $s['onboarding_done'] = true;
                update_option(AX402_OPTION_KEY, $s);
                echo '<div class="updated"><p>API created: ' . esc_html($result['data']['id']) . '</p></div>';
            } else {
                echo '<div class="error"><p>' . esc_html($result['error'] ?? 'Onboarding failed') . '</p></div>';
            }
        }
    }
    if (isset($_POST['ax402_sync_route']) && check_admin_referer('ax402_sync_route')) {
        $route = sanitize_text_field($_POST['route'] ?? '');
        $price = sanitize_text_field($_POST['price_usdc'] ?? '0.01');
        $result = ax402_sync_endpoint('GET', $route, ax402_usdc_to_atomic($price));
        if (is_wp_error($result)) {
            echo '<div class="error"><p>' . esc_html($result->get_error_message()) . '</p></div>';
        } else {
            echo '<div class="updated"><p>Endpoint synced.</p></div>';
        }
    }
    $s = ax402_get_settings();
    $routes = ax402_discover_rest_routes();
    ?>
    <div class="wrap">
        <h1>Ax402 Gateway</h1>
        <?php if (!$s['onboarding_done']) : ?>
            <h2>Onboarding</h2>
            <form method="post">
                <?php wp_nonce_field('ax402_onboard'); ?>
                <p>Create an ax402 API for <code><?php echo esc_html(home_url('/wp-json')); ?></code></p>
                <p class="submit"><input type="submit" name="ax402_onboard" class="button-primary" value="Create API" /></p>
            </form>
        <?php endif; ?>
        <form method="post">
            <?php wp_nonce_field('ax402_settings'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="base_url">Control plane URL</label></th>
                    <td><input name="base_url" id="base_url" type="url" class="regular-text" value="<?php echo esc_attr($s['base_url']); ?>" /></td>
                </tr>
                <tr>
                    <th><label for="api_key">API key</label></th>
                    <td><input name="api_key" id="api_key" type="password" class="regular-text" value="<?php echo esc_attr($s['api_key']); ?>" autocomplete="off" /></td>
                </tr>
                <tr>
                    <th><label for="api_id">API ID</label></th>
                    <td><input name="api_id" id="api_id" type="text" class="regular-text" value="<?php echo esc_attr($s['api_id']); ?>" /></td>
                </tr>
                <tr>
                    <th><label for="gateway_hostname">Gateway hostname</label></th>
                    <td><input name="gateway_hostname" id="gateway_hostname" type="text" class="regular-text" value="<?php echo esc_attr($s['gateway_hostname']); ?>" /></td>
                </tr>
            </table>
            <p class="submit"><input type="submit" name="ax402_save" class="button-primary" value="Save" /></p>
        </form>
        <h2>Route picker</h2>
        <form method="post">
            <?php wp_nonce_field('ax402_sync_route'); ?>
            <select name="route">
                <?php foreach (array_slice($routes, 0, 50) as $route) : ?>
                    <option value="<?php echo esc_attr($route); ?>"><?php echo esc_html($route); ?></option>
                <?php endforeach; ?>
            </select>
            <label>Price (USDC) <input name="price_usdc" value="0.01" /></label>
            <button type="submit" name="ax402_sync_route" class="button">Sync route</button>
        </form>
    </div>
    <?php
}

function ax402_sync_endpoint(string $method, string $path_pattern, string $amount_atomic): array|WP_Error
{
    $s = ax402_get_settings();
    if (empty($s['api_key']) || empty($s['api_id'])) {
        return new WP_Error('ax402_config', 'API key and API ID required');
    }
    $client = new Ax402_Http_Client($s['base_url'], $s['api_key']);
    $result = $client->create_endpoint($s['api_id'], $method, $path_pattern, $amount_atomic);
    if (isset($result['error'])) {
        return new WP_Error('ax402_api', $result['error'], ['status' => $result['status'] ?? 0]);
    }
    return $result['data'];
}

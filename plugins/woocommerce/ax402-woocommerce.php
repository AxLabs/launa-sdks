<?php
/**
 * Plugin Name: Ax402 Gateway for WooCommerce
 * Description: Monetize WooCommerce products via ax402 gateway endpoints.
 * Version: 1.0.0
 * Author: AxLabs
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Requires Plugins: woocommerce, ax402-gateway
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AX402_WC_VERSION', '1.0.0');

foreach ([__DIR__ . '/shared/bootstrap.php', dirname(__DIR__) . '/shared/bootstrap.php'] as $bootstrap) {
    if (is_readable($bootstrap)) {
        require_once $bootstrap;
        break;
    }
}
require_once __DIR__ . '/includes/product-paths.php';

function ax402_wc_product_metabox(): void
{
    add_meta_box('ax402_monetize', 'Ax402 monetization', 'ax402_wc_metabox_render', 'product', 'side');
}
add_action('add_meta_boxes', 'ax402_wc_product_metabox');

function ax402_wc_metabox_render(WP_Post $post): void
{
    $enabled = get_post_meta($post->ID, '_ax402_monetize', true);
    $override = get_post_meta($post->ID, '_ax402_price_usdc', true);
    $path_kind = get_post_meta($post->ID, '_ax402_path_kind', true) ?: 'rest';
    $custom_path = get_post_meta($post->ID, '_ax402_path_custom', true);
    $scheme = get_post_meta($post->ID, '_ax402_scheme', true) ?: 'exact';
    $endpoint_id = get_post_meta($post->ID, '_ax402_endpoint_id', true);
    $last_error = get_post_meta($post->ID, '_ax402_last_error', true);

    $settings = function_exists('ax402_get_settings') ? ax402_get_settings() : [];
    $gateway_url = '';
    if (!empty($settings['gateway_host'])) {
        $path = ax402_wc_resolve_path_pattern((int) $post->ID, (string) $path_kind, (string) $custom_path);
        $gateway_url = ax402_gateway_url((string) $settings['gateway_host'], $path);
    }

    wp_nonce_field('ax402_wc_product', 'ax402_wc_nonce');
    ?>
    <p>
        <label>
            <input type="checkbox" name="ax402_monetize" value="1" <?php checked($enabled, '1'); ?> />
            Monetize via x402
        </label>
    </p>
    <p>
        <label>Price (USDC)
            <input type="text" name="ax402_price_usdc" value="<?php echo esc_attr((string) $override); ?>" placeholder="e.g. 0.50" />
        </label>
        <span class="description">WooCommerce store currency is not converted automatically.</span>
    </p>
    <p>
        <label>Gateway path
            <select name="ax402_path_kind">
                <option value="rest" <?php selected($path_kind, 'rest'); ?>>REST product</option>
                <option value="download_query" <?php selected($path_kind, 'download_query'); ?>>Download query</option>
                <option value="custom" <?php selected($path_kind, 'custom'); ?>>Custom</option>
            </select>
        </label>
    </p>
    <p>
        <label>Custom path pattern
            <input type="text" name="ax402_path_custom" class="widefat" value="<?php echo esc_attr((string) $custom_path); ?>" placeholder="/wp-json/wc/v3/products/123" />
        </label>
    </p>
    <p>
        <label>Scheme
            <select name="ax402_scheme">
                <option value="exact" <?php selected($scheme, 'exact'); ?>>exact</option>
                <option value="batch-settlement" <?php selected($scheme, 'batch-settlement'); ?>>batch-settlement</option>
            </select>
        </label>
    </p>
    <?php if ($gateway_url !== '') : ?>
        <p><strong>Buyer URL:</strong><br /><a href="<?php echo esc_url($gateway_url); ?>" target="_blank" rel="noopener"><?php echo esc_html($gateway_url); ?></a></p>
    <?php endif; ?>
    <?php if ($endpoint_id !== '') : ?>
        <p class="description">Endpoint ID: <code><?php echo esc_html((string) $endpoint_id); ?></code></p>
    <?php endif; ?>
    <?php if ($last_error !== '') : ?>
        <p style="color:#b32d2e"><?php echo esc_html((string) $last_error); ?></p>
    <?php endif; ?>
    <?php
}

function ax402_wc_save_product(int $product_id): void
{
    if (!isset($_POST['ax402_wc_nonce']) || !wp_verify_nonce($_POST['ax402_wc_nonce'], 'ax402_wc_product')) {
        return;
    }

    update_post_meta($product_id, '_ax402_monetize', isset($_POST['ax402_monetize']) ? '1' : '0');
    update_post_meta($product_id, '_ax402_price_usdc', sanitize_text_field($_POST['ax402_price_usdc'] ?? ''));
    update_post_meta($product_id, '_ax402_path_kind', sanitize_text_field($_POST['ax402_path_kind'] ?? 'rest'));
    update_post_meta($product_id, '_ax402_path_custom', sanitize_text_field($_POST['ax402_path_custom'] ?? ''));
    update_post_meta($product_id, '_ax402_scheme', sanitize_text_field($_POST['ax402_scheme'] ?? 'exact'));

    delete_post_meta($product_id, '_ax402_last_error');

    if (get_post_meta($product_id, '_ax402_monetize', true) === '1') {
        ax402_wc_sync_product_endpoint($product_id);
    }
}
add_action('woocommerce_update_product', 'ax402_wc_save_product');

function ax402_wc_sync_product_endpoint(int $product_id): void
{
    if (!function_exists('ax402_upsert_endpoint')) {
        update_post_meta($product_id, '_ax402_last_error', 'Ax402 Gateway plugin is not active.');
        return;
    }

    $product = function_exists('wc_get_product') ? wc_get_product($product_id) : null;
    if (!$product) {
        update_post_meta($product_id, '_ax402_last_error', 'Product not found.');
        return;
    }

    $override = get_post_meta($product_id, '_ax402_price_usdc', true);
    $price = is_string($override) && $override !== '' ? $override : (string) $product->get_price();
    if ($price === '' || !is_numeric($price)) {
        update_post_meta($product_id, '_ax402_last_error', 'Set a USDC price in the metabox.');
        return;
    }

    try {
        $atomic = ax402_usdc_to_atomic($price);
    } catch (InvalidArgumentException $e) {
        update_post_meta($product_id, '_ax402_last_error', $e->getMessage());
        return;
    }

    $path_kind = (string) get_post_meta($product_id, '_ax402_path_kind', true);
    $custom = (string) get_post_meta($product_id, '_ax402_path_custom', true);
    $path = ax402_wc_resolve_path_pattern($product_id, $path_kind, $custom);
    $scheme = (string) get_post_meta($product_id, '_ax402_scheme', true);
    if (!in_array($scheme, ['exact', 'batch-settlement'], true)) {
        $scheme = 'exact';
    }

    $result = ax402_upsert_endpoint(
        'GET',
        $path,
        $atomic,
        $scheme,
        $product->get_name(),
    );

    if (is_wp_error($result)) {
        update_post_meta($product_id, '_ax402_last_error', $result->get_error_message());
        return;
    }

    if (!empty($result['id'])) {
        update_post_meta($product_id, '_ax402_endpoint_id', (string) $result['id']);
    }
    delete_post_meta($product_id, '_ax402_last_error');
}

function ax402_wc_order_complete(int $order_id): void
{
    /**
     * Phase 2: grant time-limited access or unlock download endpoints after traditional checkout.
     *
     * @param int $order_id WooCommerce order ID
     */
    do_action('ax402_wc_order_complete', $order_id);
}
add_action('woocommerce_order_status_completed', 'ax402_wc_order_complete');

<?php
/**
 * Plugin Name: Ax402 Gateway for WooCommerce
 * Description: Extend Ax402 Gateway with WooCommerce product → paid endpoint mapping.
 * Version: 0.2.0
 * Requires Plugins: woocommerce, ax402-gateway
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__DIR__) . '/shared/ax402-client.php';

function ax402_wc_price_to_atomic(string $price): string
{
    return ax402_usdc_to_atomic($price);
}

function ax402_wc_product_metabox(): void
{
    add_meta_box('ax402_monetize', 'Ax402 monetization', 'ax402_wc_metabox_render', 'product', 'side');
}
add_action('add_meta_boxes', 'ax402_wc_product_metabox');

function ax402_wc_metabox_render(WP_Post $post): void
{
    $enabled = get_post_meta($post->ID, '_ax402_monetize', true);
    $override = get_post_meta($post->ID, '_ax402_price_usdc', true);
    wp_nonce_field('ax402_wc_product', 'ax402_wc_nonce');
    ?>
    <p>
        <label>
            <input type="checkbox" name="ax402_monetize" value="1" <?php checked($enabled, '1'); ?> />
            Monetize via x402
        </label>
    </p>
    <p>
        <label>Price override (USDC)
            <input type="text" name="ax402_price_usdc" value="<?php echo esc_attr($override); ?>" placeholder="uses product price" />
        </label>
    </p>
    <?php
}

function ax402_wc_save_product(int $product_id): void
{
    if (!isset($_POST['ax402_wc_nonce']) || !wp_verify_nonce($_POST['ax402_wc_nonce'], 'ax402_wc_product')) {
        return;
    }
    update_post_meta($product_id, '_ax402_monetize', isset($_POST['ax402_monetize']) ? '1' : '0');
    if (isset($_POST['ax402_price_usdc'])) {
        update_post_meta($product_id, '_ax402_price_usdc', sanitize_text_field($_POST['ax402_price_usdc']));
    }
    if (get_post_meta($product_id, '_ax402_monetize', true) === '1') {
        ax402_wc_sync_product_endpoint($product_id);
    }
}
add_action('woocommerce_update_product', 'ax402_wc_save_product');

function ax402_wc_sync_product_endpoint(int $product_id): void
{
    if (!function_exists('ax402_sync_endpoint')) {
        return;
    }
    $product = wc_get_product($product_id);
    if (!$product) {
        return;
    }
    $override = get_post_meta($product_id, '_ax402_price_usdc', true);
    $price = $override !== '' ? $override : $product->get_price();
    $path = '/wc-api/download-product/' . $product_id;
    ax402_sync_endpoint('GET', $path, ax402_wc_price_to_atomic((string) $price));
}

function ax402_wc_order_complete(int $order_id): void
{
    do_action('ax402_wc_order_complete', $order_id);
}
add_action('woocommerce_order_status_completed', 'ax402_wc_order_complete');

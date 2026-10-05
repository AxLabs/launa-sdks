<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

function launa_render_admin_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    $notice = '';
    $error = '';

    if (isset($_POST['launa_save']) && check_admin_referer('launa_settings')) {
        launa_save_settings([
            'base_url' => $_POST['base_url'] ?? '',
            'api_key' => $_POST['api_key'] ?? '',
            'api_id' => $_POST['api_id'] ?? '',
            'gateway_host' => $_POST['gateway_host'] ?? '',
            'onboarding_done' => !empty($_POST['onboarding_done']),
            'default_scheme' => $_POST['default_scheme'] ?? 'exact',
        ]);
        $notice = 'Settings saved.';
    }

    if (isset($_POST['launa_onboard']) && check_admin_referer('launa_onboard')) {
        $pay_to = sanitize_text_field($_POST['pay_to_address'] ?? '');
        $slug = sanitize_title(get_bloginfo('name'));
        if ($slug === '') {
            $slug = 'wp-site';
        }
        $result = launa_onboard_site(
            get_bloginfo('name'),
            $slug,
            home_url('/wp-json'),
            $pay_to !== '' ? $pay_to : null,
        );
        if (is_wp_error($result)) {
            $error = $result->get_error_message();
        } else {
            launa_save_settings([
                'api_id' => $result['api_id'],
                'gateway_host' => $result['gateway_host'],
                'onboarding_done' => true,
            ]);
            $notice = 'API created. Gateway: ' . $result['gateway_url'];
        }
    }

    if (isset($_POST['launa_sync_route']) && check_admin_referer('launa_sync_route')) {
        $route = sanitize_text_field($_POST['route'] ?? '');
        $price = sanitize_text_field($_POST['price_usdc'] ?? '0.01');
        $scheme = sanitize_text_field($_POST['scheme'] ?? 'exact');
        try {
            $atomic = launa_usdc_to_atomic($price);
        } catch (InvalidArgumentException $e) {
            $error = $e->getMessage();
        }
        if ($error === '' && $route !== '') {
            $settings = launa_get_settings();
            $result = launa_upsert_endpoint('GET', $route, $atomic, $scheme);
            if (is_wp_error($result)) {
                $error = $result->get_error_message();
            } else {
                $notice = 'Endpoint synced.';
            }
        }
    }

    if (isset($_POST['launa_delete_endpoint']) && check_admin_referer('launa_delete_endpoint')) {
        $endpoint_id = sanitize_text_field($_POST['endpoint_id'] ?? '');
        $client = launa_client();
        $settings = launa_get_settings();
        if ($client && $endpoint_id !== '' && !empty($settings['api_id'])) {
            $del = $client->delete_endpoint((string) $settings['api_id'], $endpoint_id);
            if (isset($del['error'])) {
                $error = (string) $del['error'];
            } else {
                $notice = 'Endpoint removed.';
            }
        }
    }

    $settings = launa_get_settings();
    $dashboard = null;
    $dashboard_error = '';
    if (!empty($settings['api_id']) && launa_get_api_key() !== '') {
        $loaded = launa_load_dashboard();
        if (is_wp_error($loaded)) {
            $dashboard_error = $loaded->get_error_message();
        } else {
            $dashboard = $loaded;
        }
    }

    $routes = launa_discover_rest_routes();
    ?>
    <div class="wrap">
        <h1>Launa Gateway</h1>
        <p>Monetize WordPress REST routes via x402. Buyers pay through your launa gateway hostname.</p>

        <?php if ($notice !== '') : ?>
            <div class="notice notice-success"><p><?php echo esc_html($notice); ?></p></div>
        <?php endif; ?>
        <?php if ($error !== '') : ?>
            <div class="notice notice-error"><p><?php echo esc_html($error); ?></p></div>
        <?php endif; ?>

        <h2>Connection</h2>
        <form method="post">
            <?php wp_nonce_field('launa_settings'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="base_url">Control plane URL</label></th>
                    <td><input name="base_url" id="base_url" type="url" class="regular-text" value="<?php echo esc_attr($settings['base_url']); ?>" /></td>
                </tr>
                <tr>
                    <th><label for="api_key">API key</label></th>
                    <td>
                        <input name="api_key" id="api_key" type="password" class="regular-text" value="" autocomplete="off" placeholder="<?php echo launa_get_api_key() !== '' ? '•••••••• (unchanged)' : ''; ?>" />
                        <p class="description">Use an <code>apiManager</code> scoped key. Stored encrypted (requires OpenSSL).</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="api_id">API ID</label></th>
                    <td><input name="api_id" id="api_id" type="text" class="regular-text" value="<?php echo esc_attr($settings['api_id']); ?>" /></td>
                </tr>
                <tr>
                    <th><label for="gateway_host">Gateway hostname</label></th>
                    <td>
                        <input name="gateway_host" id="gateway_host" type="text" class="regular-text" value="<?php echo esc_attr($settings['gateway_host']); ?>" />
                        <p class="description">Filled automatically on onboard (e.g. <code>yoursite.localhost</code>).</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="default_scheme">Default payment scheme</label></th>
                    <td>
                        <select name="default_scheme" id="default_scheme">
                            <option value="exact" <?php selected($settings['default_scheme'], 'exact'); ?>>exact (instant)</option>
                            <option value="batch-settlement" <?php selected($settings['default_scheme'], 'batch-settlement'); ?>>batch-settlement</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Onboarding</th>
                    <td><label><input type="checkbox" name="onboarding_done" value="1" <?php checked(!empty($settings['onboarding_done'])); ?> /> Mark setup complete</label></td>
                </tr>
            </table>
            <p class="submit"><input type="submit" name="launa_save" class="button-primary" value="Save settings" /></p>
        </form>

        <?php if (!$settings['onboarding_done']) : ?>
            <h2>Auto-onboard</h2>
            <form method="post">
                <?php wp_nonce_field('launa_onboard'); ?>
                <p>Creates an launa API for upstream <code><?php echo esc_html(home_url('/wp-json')); ?></code> with default gateway subdomain.</p>
                <p>
                    <label>Pay-to address (optional)
                        <input type="text" name="pay_to_address" class="regular-text" placeholder="0x… user_wallet" />
                    </label>
                </p>
                <p class="submit"><input type="submit" name="launa_onboard" class="button-primary" value="Create API &amp; gateway" /></p>
            </form>
        <?php endif; ?>

        <?php if ($dashboard !== null) : ?>
            <h2>Gateway</h2>
            <?php if ($dashboard_error !== '') : ?>
                <p class="description"><?php echo esc_html($dashboard_error); ?></p>
            <?php else : ?>
                <p>Buyer base URL: <a href="<?php echo esc_url($dashboard['gateway_url']); ?>" target="_blank" rel="noopener"><?php echo esc_html($dashboard['gateway_url']); ?></a></p>
            <?php endif; ?>

            <h3>Monetized endpoints</h3>
            <?php if (count($dashboard['endpoints']) === 0) : ?>
                <p>No endpoints yet.</p>
            <?php else : ?>
                <table class="widefat striped">
                    <thead><tr><th>Method</th><th>Path</th><th>Price</th><th></th></tr></thead>
                    <tbody>
                    <?php
                    $platform_cfg = null;
                    $dash_client = launa_client();
                    if ($dash_client !== null) {
                        $platform_cfg = $dash_client->get_platform_config();
                    }
                    foreach ($dashboard['endpoints'] as $ep) :
                        $accept = is_array($ep['accepts'][0] ?? null) ? $ep['accepts'][0] : [];
                        $amount = (string) ($accept['amount'] ?? '0');
                        $scheme = (string) ($accept['scheme'] ?? 'exact');
                        $buyer = launa_gateway_url(
                            $dashboard['gateway_host'],
                            (string) $ep['path_pattern'],
                            $platform_cfg,
                        );
                        ?>
                        <tr>
                            <td><?php echo esc_html((string) $ep['method']); ?></td>
                            <td><code><?php echo esc_html((string) $ep['path_pattern']); ?></code></td>
                            <td><?php echo esc_html(launa_atomic_to_usdc($amount)); ?> USDC (<?php echo esc_html($scheme); ?>)</td>
                            <td>
                                <?php if ($buyer !== '') : ?>
                                    <a href="<?php echo esc_url($buyer); ?>" target="_blank" rel="noopener">Test URL</a>
                                <?php endif; ?>
                                <form method="post" style="display:inline;margin-left:8px">
                                    <?php wp_nonce_field('launa_delete_endpoint'); ?>
                                    <input type="hidden" name="endpoint_id" value="<?php echo esc_attr((string) ($ep['id'] ?? '')); ?>" />
                                    <button type="submit" name="launa_delete_endpoint" class="button-link-delete" onclick="return confirm('Remove this endpoint?');">Delete</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        <?php endif; ?>

        <h2>Sync REST route</h2>
        <form method="post">
            <?php wp_nonce_field('launa_sync_route'); ?>
            <p>
                <select name="route" style="min-width:320px">
                    <?php foreach (array_slice($routes, 0, 100) as $route) : ?>
                        <option value="<?php echo esc_attr($route); ?>"><?php echo esc_html($route); ?></option>
                    <?php endforeach; ?>
                </select>
            </p>
            <p>
                <label>Price (USDC) <input name="price_usdc" value="0.01" /></label>
                <label style="margin-left:12px">Scheme
                    <select name="scheme">
                        <option value="exact">exact</option>
                        <option value="batch-settlement">batch-settlement</option>
                    </select>
                </label>
            </p>
            <p class="submit"><button type="submit" name="launa_sync_route" class="button button-primary">Sync route</button></p>
        </form>
    </div>
    <?php
}

<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/crypto.php';
require_once __DIR__ . '/class-ax402-http-client.php';

const AX402_OPTION_KEY = 'ax402_settings';

function ax402_default_settings(): array
{
    return [
        'base_url' => 'http://api.localhost:8090',
        'api_key_enc' => '',
        'api_id' => '',
        'gateway_host' => '',
        'onboarding_done' => false,
        'default_scheme' => 'exact',
    ];
}

function ax402_get_settings(): array
{
    $stored = [];
    if (function_exists('get_option')) {
        $stored = get_option(AX402_OPTION_KEY, []);
    }
    if (!is_array($stored)) {
        $stored = [];
    }

    $settings = array_merge(ax402_default_settings(), $stored);

    if (!empty($stored['api_key']) && empty($settings['api_key_enc'])) {
        try {
            $settings['api_key_enc'] = ax402_encrypt_secret((string) $stored['api_key']);
            unset($settings['api_key']);
            if (function_exists('update_option')) {
                update_option(AX402_OPTION_KEY, $settings);
            }
        } catch (Throwable) {
            // keep legacy plaintext until next save
        }
    }

    return $settings;
}

function ax402_get_api_key(): string
{
    $settings = ax402_get_settings();
    if (!empty($settings['api_key_enc'])) {
        try {
            return ax402_decrypt_secret((string) $settings['api_key_enc']);
        } catch (Throwable $e) {
            return '';
        }
    }
    return (string) ($settings['api_key'] ?? '');
}

function ax402_save_settings(array $input): void
{
    $current = ax402_get_settings();
    $next = array_merge($current, [
        'base_url' => esc_url_raw((string) ($input['base_url'] ?? $current['base_url'])),
        'api_id' => sanitize_text_field((string) ($input['api_id'] ?? $current['api_id'])),
        'gateway_host' => sanitize_text_field((string) ($input['gateway_host'] ?? $current['gateway_host'])),
        'onboarding_done' => !empty($input['onboarding_done']),
        'default_scheme' => in_array($input['default_scheme'] ?? '', ['exact', 'batch-settlement'], true)
            ? $input['default_scheme']
            : $current['default_scheme'],
    ]);

    $api_key = (string) ($input['api_key'] ?? '');
    if ($api_key !== '') {
        $next['api_key_enc'] = ax402_encrypt_secret($api_key);
    }
    unset($next['api_key']);

    update_option(AX402_OPTION_KEY, $next);
}

function ax402_client(): ?Ax402_Http_Client
{
    $api_key = ax402_get_api_key();
    if ($api_key === '') {
        return null;
    }
    $settings = ax402_get_settings();
    return new Ax402_Http_Client((string) $settings['base_url'], $api_key);
}

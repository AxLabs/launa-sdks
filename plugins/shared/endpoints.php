<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/class-ax402-http-client.php';

function ax402_find_endpoint_by_path(array $endpoints, string $method, string $path_pattern): ?array
{
    $method = strtoupper($method);
    foreach ($endpoints as $ep) {
        if (!is_array($ep)) {
            continue;
        }
        if (strtoupper((string) ($ep['method'] ?? '')) === $method
            && (string) ($ep['path_pattern'] ?? '') === $path_pattern) {
            return $ep;
        }
    }
    return null;
}

/**
 * @return array<string, mixed>|WP_Error
 */
function ax402_upsert_endpoint(
    string $method,
    string $path_pattern,
    string $amount_atomic,
    string $scheme = 'exact',
    ?string $description = null,
): array|WP_Error {
    $client = ax402_client();
    if ($client === null) {
        return new WP_Error('ax402_config', 'API key required');
    }
    $settings = ax402_get_settings();
    $api_id = $settings['api_id'] ?? '';
    if ($api_id === '') {
        return new WP_Error('ax402_config', 'API ID required');
    }

    $existing = ax402_find_endpoint_by_path($client->list_endpoints($api_id), $method, $path_pattern);
    if ($existing !== null && !empty($existing['id'])) {
        $result = $client->update_endpoint(
            $api_id,
            (string) $existing['id'],
            $method,
            $path_pattern,
            $amount_atomic,
            $scheme,
            $description,
        );
    } else {
        $result = $client->create_endpoint(
            $api_id,
            $method,
            $path_pattern,
            $amount_atomic,
            $scheme,
            $description,
        );
    }

    if (isset($result['error'])) {
        return new WP_Error('ax402_api', (string) $result['error'], ['status' => $result['status'] ?? 0]);
    }
    return is_array($result['data'] ?? null) ? $result['data'] : [];
}

/**
 * @return array{api_id:string,gateway_host:string,gateway_url:string,api:array<string,mixed>}|WP_Error
 */
function ax402_onboard_site(string $name, string $slug, string $upstream, ?string $pay_to_address = null): array|WP_Error
{
    $client = ax402_client();
    if ($client === null) {
        return new WP_Error('ax402_config', 'API key required');
    }

    $platform = $client->get_platform_config();
    $created = $client->create_api($name, $slug, $upstream, $pay_to_address);
    if (isset($created['error'])) {
        return new WP_Error('ax402_api', (string) $created['error'], ['status' => $created['status'] ?? 0]);
    }
    $api = is_array($created['data'] ?? null) ? $created['data'] : [];
    if (empty($api['id'])) {
        return new WP_Error('ax402_api', 'API creation returned no id');
    }

    $domains = is_array($api['domains'] ?? null) ? $api['domains'] : [];
    $primary = null;
    foreach ($domains as $domain) {
        if (is_array($domain) && !empty($domain['is_primary'])) {
            $primary = $domain;
            break;
        }
    }
    if ($primary === null && isset($domains[0]) && is_array($domains[0])) {
        $primary = $domains[0];
    }

    $platform_domain = (string) ($platform['platform_domain'] ?? 'localhost');
    $gateway_host = (string) ($primary['hostname'] ?? ($slug . '.' . $platform_domain));

    return [
        'api_id' => (string) $api['id'],
        'gateway_host' => $gateway_host,
        'gateway_url' => ax402_gateway_base_url($gateway_host, $platform),
        'api' => $api,
    ];
}

/**
 * @return array{gateway_host:string,gateway_url:string,endpoints:array<int,array<string,mixed>>}|WP_Error
 */
function ax402_load_dashboard(): array|WP_Error
{
    $client = ax402_client();
    if ($client === null) {
        return new WP_Error('ax402_config', 'API key required');
    }
    $settings = ax402_get_settings();
    $api_id = $settings['api_id'] ?? '';
    if ($api_id === '') {
        return new WP_Error('ax402_config', 'API ID required');
    }

    $api_result = $client->get_api($api_id);
    if (isset($api_result['error'])) {
        return new WP_Error('ax402_api', (string) $api_result['error']);
    }
    $api = is_array($api_result['data'] ?? null) ? $api_result['data'] : [];
    $platform = $client->get_platform_config();
    $gateway_host = (string) ($settings['gateway_host'] ?? '');
    if ($gateway_host === '') {
        $domains = is_array($api['domains'] ?? null) ? $api['domains'] : [];
        foreach ($domains as $domain) {
            if (is_array($domain) && !empty($domain['is_primary'])) {
                $gateway_host = (string) ($domain['hostname'] ?? '');
                break;
            }
        }
        if ($gateway_host === '' && isset($domains[0]['hostname'])) {
            $gateway_host = (string) $domains[0]['hostname'];
        }
    }

    return [
        'gateway_host' => $gateway_host,
        'gateway_url' => ax402_gateway_base_url($gateway_host, $platform),
        'endpoints' => $client->list_endpoints($api_id),
        'api' => $api,
    ];
}

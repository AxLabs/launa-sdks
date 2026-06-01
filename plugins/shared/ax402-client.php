<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

class Ax402_Http_Client
{
    public function __construct(
        private string $base_url,
        private string $api_key,
    ) {
    }

    public function request(string $method, string $path, ?array $body = null): array
    {
        $args = [
            'method' => $method,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key,
            ],
            'timeout' => 30,
        ];
        if ($body !== null) {
            $args['body'] = wp_json_encode($body);
        }
        $response = wp_remote_request(rtrim($this->base_url, '/') . $path, $args);
        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message(), 'status' => 0];
        }
        $code = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if ($code >= 400) {
            return ['error' => $data['error'] ?? 'Request failed', 'status' => $code];
        }
        return ['data' => $data, 'status' => $code];
    }

    public function create_api(string $name, string $slug, string $upstream): array
    {
        return $this->request('POST', '/apis', [
            'name' => $name,
            'slug' => $slug,
            'upstream_base_url' => $upstream,
        ]);
    }

    public function create_endpoint(string $api_id, string $method, string $path_pattern, string $amount_atomic): array
    {
        return $this->request('POST', '/apis/' . rawurlencode($api_id) . '/endpoints', [
            'method' => $method,
            'path_pattern' => $path_pattern,
            'accepts' => [[
                'scheme' => 'exact',
                'network' => 'eip155:84532',
                'asset' => '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                'amount' => $amount_atomic,
                'max_timeout_seconds' => 300,
                'extra' => ['name' => 'USDC', 'version' => '2', 'assetTransferMethod' => 'eip3009'],
            ]],
        ]);
    }
}

function ax402_client(): ?Ax402_Http_Client
{
    $s = ax402_get_settings();
    if (empty($s['api_key'])) {
        return null;
    }
    return new Ax402_Http_Client($s['base_url'], $s['api_key']);
}

function ax402_usdc_to_atomic(string $amount): string
{
    $parts = explode('.', trim($amount));
    $whole = $parts[0] ?? '0';
    $frac = str_pad(substr($parts[1] ?? '', 0, 6), 6, '0');
    $atomic = ltrim($whole . $frac, '0');
    return $atomic === '' ? '0' : $atomic;
}

function ax402_discover_rest_routes(): array
{
    global $wp_rest_server;
    if (!$wp_rest_server instanceof WP_REST_Server) {
        $wp_rest_server = rest_get_server();
    }
    $routes = [];
    foreach ($wp_rest_server->get_routes() as $route => $handlers) {
        if (str_starts_with($route, '/')) {
            $routes[] = '/wp-json' . $route;
        }
    }
    return array_values(array_unique($routes));
}

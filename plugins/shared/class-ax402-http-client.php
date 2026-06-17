<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/helpers.php';

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
        $code = (int) wp_remote_retrieve_response_code($response);
        $raw = wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);
        if ($code >= 400) {
            $message = is_array($data) && isset($data['error']) ? (string) $data['error'] : 'Request failed';
            return ['error' => $message, 'status' => $code];
        }
        return ['data' => $data, 'status' => $code];
    }

    public function get_platform_config(): array
    {
        $result = $this->request('GET', '/config/platform');
        return is_array($result['data'] ?? null) ? $result['data'] : [];
    }

    public function create_api(string $name, string $slug, string $upstream, ?string $pay_to_address = null): array
    {
        $body = [
            'name' => $name,
            'slug' => $slug,
            'upstream_base_url' => $upstream,
        ];
        if ($pay_to_address !== null && $pay_to_address !== '') {
            $body['pay_to_mode'] = 'user_wallet';
            $body['pay_to_address'] = $pay_to_address;
        }
        return $this->request('POST', '/apis', $body);
    }

    public function get_api(string $api_id): array
    {
        return $this->request('GET', '/apis/' . rawurlencode($api_id));
    }

    /** @return array<int, array<string, mixed>> */
    public function list_endpoints(string $api_id): array
    {
        $result = $this->request('GET', '/apis/' . rawurlencode($api_id) . '/endpoints');
        return is_array($result['data'] ?? null) ? $result['data'] : [];
    }

    public function create_endpoint(
        string $api_id,
        string $method,
        string $path_pattern,
        string $amount_atomic,
        string $scheme = 'exact',
        ?string $description = null,
    ): array {
        return $this->request('POST', '/apis/' . rawurlencode($api_id) . '/endpoints', [
            'method' => $method,
            'path_pattern' => $path_pattern,
            'description' => $description,
            'accepts' => [ax402_build_usdc_accept($scheme, $amount_atomic)],
        ]);
    }

    public function update_endpoint(
        string $api_id,
        string $endpoint_id,
        string $method,
        string $path_pattern,
        string $amount_atomic,
        string $scheme = 'exact',
        ?string $description = null,
    ): array {
        return $this->request('PUT', '/apis/' . rawurlencode($api_id) . '/endpoints/' . rawurlencode($endpoint_id), [
            'method' => $method,
            'path_pattern' => $path_pattern,
            'description' => $description,
            'accepts' => [ax402_build_usdc_accept($scheme, $amount_atomic)],
        ]);
    }

    public function delete_endpoint(string $api_id, string $endpoint_id): array
    {
        return $this->request('DELETE', '/apis/' . rawurlencode($api_id) . '/endpoints/' . rawurlencode($endpoint_id));
    }
}

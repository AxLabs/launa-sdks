<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__);
}

$GLOBALS['launa_test_options'] = [];
$GLOBALS['launa_http_responses'] = [];

class WP_Error
{
    public function __construct(
        public string $code,
        public string $message,
        public mixed $data = null,
    ) {
    }

    public function get_error_message(): string
    {
        return $this->message;
    }
}

function is_wp_error(mixed $thing): bool
{
    return $thing instanceof WP_Error;
}

function get_option(string $option, mixed $default = false): mixed
{
    return $GLOBALS['launa_test_options'][$option] ?? $default;
}

function update_option(string $option, mixed $value): bool
{
    $GLOBALS['launa_test_options'][$option] = $value;
    return true;
}

function delete_option(string $option): bool
{
    unset($GLOBALS['launa_test_options'][$option]);
    return true;
}

function wp_json_encode(mixed $data): string
{
    return json_encode($data, JSON_THROW_ON_ERROR);
}

function wp_remote_request(string $url, array $args = []): array
{
    $key = strtoupper((string) ($args['method'] ?? 'GET')) . ' ' . $url;
    if (isset($GLOBALS['launa_http_responses'][$key])) {
        return $GLOBALS['launa_http_responses'][$key];
    }
    if (isset($GLOBALS['launa_http_responses'][$url])) {
        return $GLOBALS['launa_http_responses'][$url];
    }
    return [
        'response' => ['code' => 404],
        'body' => wp_json_encode(['error' => 'not found']),
    ];
}

function wp_remote_retrieve_response_code(array $response): int
{
    return (int) ($response['response']['code'] ?? 0);
}

function wp_remote_retrieve_body(array $response): string
{
    return (string) ($response['body'] ?? '');
}

function esc_url_raw(string $url): string
{
    return $url;
}

function sanitize_text_field(string $str): string
{
    return $str;
}

require_once dirname(__DIR__) . '/shared/bootstrap.php';

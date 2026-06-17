<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/constants.php';

/**
 * @return array{scheme:string,network:string,asset:string,amount:string,max_timeout_seconds:int,extra:array<string,mixed>}
 */
function ax402_build_usdc_accept(string $scheme, string $amount_atomic, ?int $withdraw_delay = null): array
{
    $extra = [
        'name' => 'USDC',
        'version' => '2',
        'assetTransferMethod' => 'eip3009',
    ];
    if ($scheme === 'batch-settlement') {
        $extra['withdrawDelay'] = $withdraw_delay ?? AX402_DEFAULT_BATCH_WITHDRAW_DELAY;
    }
    return [
        'scheme' => $scheme,
        'network' => AX402_USDC_NETWORK,
        'asset' => AX402_USDC_ASSET,
        'amount' => $amount_atomic,
        'max_timeout_seconds' => 300,
        'extra' => $extra,
    ];
}

function ax402_usdc_to_atomic(string $amount): string
{
    $trimmed = trim($amount);
    if ($trimmed === '') {
        throw new InvalidArgumentException('Price is required');
    }
    if (!preg_match('/^\d+(\.\d+)?$/', $trimmed)) {
        throw new InvalidArgumentException('Enter a valid USDC amount (e.g. 0.10)');
    }
    $parts = explode('.', $trimmed, 2);
    $whole = $parts[0];
    $frac = str_pad(substr($parts[1] ?? '', 0, AX402_USDC_DECIMALS), AX402_USDC_DECIMALS, '0');
    $atomic = ltrim($whole . $frac, '0');
    if ($atomic === '' || $atomic === '0') {
        throw new InvalidArgumentException('Price must be greater than 0');
    }
    return $atomic;
}

function ax402_atomic_to_usdc(string $atomic): string
{
    if ($atomic === '' || !preg_match('/^\d+$/', $atomic)) {
        return '0';
    }
    $s = str_pad($atomic, AX402_USDC_DECIMALS + 1, '0', STR_PAD_LEFT);
    $whole = ltrim(substr($s, 0, -AX402_USDC_DECIMALS), '0') ?: '0';
    $frac = rtrim(substr($s, -AX402_USDC_DECIMALS), '0');
    return $frac !== '' ? $whole . '.' . $frac : $whole;
}

/**
 * @param array{platform_domain?:string,gateway_port?:int}|null $platform
 */
function ax402_gateway_base_url(string $host, ?array $platform = null): string
{
    if ($host === '') {
        return '';
    }
    $is_local = str_ends_with($host, '.localhost') || $host === 'localhost';
    $port = (int) ($platform['gateway_port'] ?? 8090);
    if ($is_local && $port !== 80 && $port !== 443) {
        return 'http://' . $host . ':' . $port;
    }
    return 'https://' . $host;
}

/**
 * @param array{platform_domain?:string,gateway_port?:int}|null $platform
 */
function ax402_gateway_url(string $host, string $path, ?array $platform = null): string
{
    $base = ax402_gateway_base_url($host, $platform);
    if ($base === '') {
        return '';
    }
    if (!str_starts_with($path, '/')) {
        $path = '/' . $path;
    }
    return $base . $path;
}

function ax402_discover_rest_routes(): array
{
    global $wp_rest_server;
    if (!function_exists('rest_get_server')) {
        return [];
    }
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

<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

function ax402_wc_default_path_pattern(int $product_id): string
{
    return '/wp-json/wc/v3/products/' . $product_id;
}

function ax402_wc_download_path_pattern(int $product_id): string
{
    return '/?download_file=' . $product_id;
}

/**
 * @return list<string>
 */
function ax402_wc_path_choices(int $product_id): array
{
    return [
        'rest' => ax402_wc_default_path_pattern($product_id),
        'download_query' => ax402_wc_download_path_pattern($product_id),
    ];
}

function ax402_wc_resolve_path_pattern(int $product_id, string $kind, string $custom): string
{
    if ($kind === 'custom' && $custom !== '') {
        return $custom;
    }
    $choices = ax402_wc_path_choices($product_id);
    return $choices[$kind] ?? ax402_wc_default_path_pattern($product_id);
}

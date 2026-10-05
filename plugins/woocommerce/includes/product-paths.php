<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

function launa_wc_default_path_pattern(int $product_id): string
{
    return '/wp-json/wc/v3/products/' . $product_id;
}

function launa_wc_download_path_pattern(int $product_id): string
{
    return '/?download_file=' . $product_id;
}

/**
 * @return list<string>
 */
function launa_wc_path_choices(int $product_id): array
{
    return [
        'rest' => launa_wc_default_path_pattern($product_id),
        'download_query' => launa_wc_download_path_pattern($product_id),
    ];
}

function launa_wc_resolve_path_pattern(int $product_id, string $kind, string $custom): string
{
    if ($kind === 'custom' && $custom !== '') {
        return $custom;
    }
    $choices = launa_wc_path_choices($product_id);
    return $choices[$kind] ?? launa_wc_default_path_pattern($product_id);
}

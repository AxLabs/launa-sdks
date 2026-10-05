<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__) . '/woocommerce/includes/product-paths.php';

final class WcPathsTest extends TestCase
{
    public function test_default_rest_path(): void
    {
        $this->assertSame('/wp-json/wc/v3/products/42', launa_wc_default_path_pattern(42));
    }

    public function test_resolve_custom_path(): void
    {
        $this->assertSame(
            '/custom/path',
            launa_wc_resolve_path_pattern(1, 'custom', '/custom/path'),
        );
    }
}

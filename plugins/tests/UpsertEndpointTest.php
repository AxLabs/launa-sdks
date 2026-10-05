<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class UpsertEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        $GLOBALS['launa_test_options'] = [];
        $GLOBALS['launa_http_responses'] = [];
        if (!defined('LAUNA_ENCRYPTION_SECRET')) {
            define('LAUNA_ENCRYPTION_SECRET', 'test-secret');
        }
        update_option(LAUNA_OPTION_KEY, [
            'base_url' => 'http://api.test',
            'api_key_enc' => launa_encrypt_secret('launa_live_test'),
            'api_id' => 'api1',
            'gateway_host' => 'shop.localhost',
        ]);
    }

    public function test_creates_endpoint_when_missing(): void
    {
        $list_url = 'http://api.test/apis/api1/endpoints';
        $GLOBALS['launa_http_responses']['GET ' . $list_url] = [
            'response' => ['code' => 200],
            'body' => wp_json_encode([]),
        ];
        $GLOBALS['launa_http_responses']['POST ' . $list_url] = [
            'response' => ['code' => 201],
            'body' => wp_json_encode(['id' => 'ep1', 'method' => 'GET', 'path_pattern' => '/wp-json/wp/v2/posts']),
        ];

        $result = launa_upsert_endpoint('GET', '/wp-json/wp/v2/posts', '10000', 'exact');
        $this->assertSame('ep1', $result['id']);
    }

    public function test_updates_endpoint_when_exists(): void
    {
        $list_url = 'http://api.test/apis/api1/endpoints';
        $GLOBALS['launa_http_responses']['GET ' . $list_url] = [
            'response' => ['code' => 200],
            'body' => wp_json_encode([
                ['id' => 'ep9', 'method' => 'GET', 'path_pattern' => '/wp-json/wp/v2/posts'],
            ]),
        ];
        $update_url = 'http://api.test/apis/api1/endpoints/ep9';
        $GLOBALS['launa_http_responses']['PUT ' . $update_url] = [
            'response' => ['code' => 200],
            'body' => wp_json_encode(['id' => 'ep9', 'method' => 'GET', 'path_pattern' => '/wp-json/wp/v2/posts']),
        ];

        $result = launa_upsert_endpoint('GET', '/wp-json/wp/v2/posts', '20000', 'batch-settlement');
        $this->assertSame('ep9', $result['id']);
    }
}

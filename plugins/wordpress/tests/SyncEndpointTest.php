<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__) . '/shared/ax402-client.php';
require_once dirname(__DIR__) . '/wordpress/ax402-gateway.php';

final class Ax402SyncEndpointTest extends TestCase
{
    public function test_sync_endpoint_payload_shape(): void
    {
        $captured = null;
        add_filter('pre_http_request', function ($pre, $args, $url) use (&$captured) {
            $captured = ['url' => $url, 'args' => $args];
            return [
                'response' => ['code' => 201],
                'body' => wp_json_encode(['id' => 'ep1']),
            ];
        }, 10, 3);

        update_option(AX402_OPTION_KEY, [
            'base_url' => 'http://api.test',
            'api_key' => 'ax402_live_test',
            'api_id' => 'api1',
        ]);

        $result = ax402_sync_endpoint('GET', '/wp-json/wp/v2/posts', '10000');
        $this->assertSame('ep1', $result['id']);
        $this->assertStringContainsString('/apis/api1/endpoints', $captured['url']);
        $body = json_decode($captured['args']['body'], true);
        $this->assertSame('GET', $body['method']);
        $this->assertSame('/wp-json/wp/v2/posts', $body['path_pattern']);
        $this->assertSame('10000', $body['accepts'][0]['amount']);
    }
}

<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class HelpersTest extends TestCase
{
    public function test_usdc_to_atomic(): void
    {
        $this->assertSame('100000', ax402_usdc_to_atomic('0.10'));
        $this->assertSame('1500000', ax402_usdc_to_atomic('1.5'));
    }

    public function test_usdc_to_atomic_rejects_invalid(): void
    {
        $this->expectException(InvalidArgumentException::class);
        ax402_usdc_to_atomic('abc');
    }

    public function test_atomic_to_usdc(): void
    {
        $this->assertSame('0.1', ax402_atomic_to_usdc('100000'));
        $this->assertSame('1.5', ax402_atomic_to_usdc('1500000'));
    }

    public function test_build_usdc_accept_exact(): void
    {
        $accept = ax402_build_usdc_accept('exact', '100000');
        $this->assertSame('exact', $accept['scheme']);
        $this->assertSame(AX402_USDC_NETWORK, $accept['network']);
        $this->assertSame('100000', $accept['amount']);
    }

    public function test_build_usdc_accept_batch(): void
    {
        $accept = ax402_build_usdc_accept('batch-settlement', '100000');
        $this->assertSame('batch-settlement', $accept['scheme']);
        $this->assertArrayHasKey('withdrawDelay', $accept['extra']);
    }

    public function test_gateway_urls(): void
    {
        $platform = ['gateway_port' => 8090];
        $this->assertSame(
            'http://shop.localhost:8090/path',
            ax402_gateway_url('shop.localhost', '/path', $platform),
        );
        $this->assertSame(
            'https://api.example.com/path',
            ax402_gateway_url('api.example.com', '/path', $platform),
        );
    }
}

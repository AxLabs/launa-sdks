<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/shared/ax402-client.php';

final class Ax402ClientTest extends TestCase
{
    public function test_usdc_to_atomic(): void
    {
        $this->assertSame('100000', ax402_usdc_to_atomic('0.10'));
    }
}

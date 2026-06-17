<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class CryptoTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('AX402_ENCRYPTION_SECRET')) {
            define('AX402_ENCRYPTION_SECRET', 'test-secret-for-phpunit');
        }
    }

    public function test_encrypt_decrypt_roundtrip(): void
    {
        $enc = ax402_encrypt_secret('ax402_live_test_key');
        $this->assertSame('ax402_live_test_key', ax402_decrypt_secret($enc));
    }
}

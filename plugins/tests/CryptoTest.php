<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class CryptoTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('LAUNA_ENCRYPTION_SECRET')) {
            define('LAUNA_ENCRYPTION_SECRET', 'test-secret-for-phpunit');
        }
    }

    public function test_encrypt_decrypt_roundtrip(): void
    {
        $enc = launa_encrypt_secret('launa_live_test_key');
        $this->assertSame('launa_live_test_key', launa_decrypt_secret($enc));
    }
}

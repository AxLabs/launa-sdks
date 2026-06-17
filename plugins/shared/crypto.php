<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

function ax402_encryption_secret(): string
{
    if (defined('AX402_ENCRYPTION_SECRET') && is_string(AX402_ENCRYPTION_SECRET) && AX402_ENCRYPTION_SECRET !== '') {
        return AX402_ENCRYPTION_SECRET;
    }
    if (defined('AUTH_KEY') && is_string(AUTH_KEY) && AUTH_KEY !== '') {
        return AUTH_KEY;
    }
    return 'ax402-dev-insecure-change-me';
}

function ax402_encrypt_secret(string $plaintext): string
{
    $key = hash('sha256', ax402_encryption_secret(), true);
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) {
        throw new RuntimeException('Encryption failed');
    }
    return base64_encode($iv . $tag . $cipher);
}

function ax402_decrypt_secret(string $payload): string
{
    $raw = base64_decode($payload, true);
    if ($raw === false || strlen($raw) < 29) {
        throw new RuntimeException('Invalid encrypted payload');
    }
    $key = hash('sha256', ax402_encryption_secret(), true);
    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $cipher = substr($raw, 28);
    $plain = openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($plain === false) {
        throw new RuntimeException('Decryption failed');
    }
    return $plain;
}

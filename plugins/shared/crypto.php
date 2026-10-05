<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

function launa_encryption_secret(): string
{
    if (defined('LAUNA_ENCRYPTION_SECRET') && is_string(LAUNA_ENCRYPTION_SECRET) && LAUNA_ENCRYPTION_SECRET !== '') {
        return LAUNA_ENCRYPTION_SECRET;
    }
    if (defined('AUTH_KEY') && is_string(AUTH_KEY) && AUTH_KEY !== '') {
        return AUTH_KEY;
    }
    return 'launa-dev-insecure-change-me';
}

function launa_encrypt_secret(string $plaintext): string
{
    $key = hash('sha256', launa_encryption_secret(), true);
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) {
        throw new RuntimeException('Encryption failed');
    }
    return base64_encode($iv . $tag . $cipher);
}

function launa_decrypt_secret(string $payload): string
{
    $raw = base64_decode($payload, true);
    if ($raw === false || strlen($raw) < 29) {
        throw new RuntimeException('Invalid encrypted payload');
    }
    $key = hash('sha256', launa_encryption_secret(), true);
    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $cipher = substr($raw, 28);
    $plain = openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($plain === false) {
        throw new RuntimeException('Decryption failed');
    }
    return $plain;
}

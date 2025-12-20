<?php

use Gnikyt\BasicShopifyAPI\Options;
use Gnikyt\BasicShopifyAPI\Session;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Osiset\ShopifyApp\Util;


use App\Models\User; 

/**
 * Call Shopify REST API
 *
 * @param string $shop
 * @param \App\Models\User $shopModel
 * @param string $method GET|POST|PUT|DELETE
 * @param string $apiRoute Shopify REST endpoint (e.g., '/admin/api/2023-01/products.json')
 * @param array $payload Request payload
 * @param string $version API version
 * @return array ['status' => int, 'body' => array]
 */
function callShopifyApi($shop, $shopModel, $method, $apiRoute, $payload = [], $version = '2023-01')
{
    $opts = new Options();
    $opts->setApiKey(Util::getShopifyConfig('api_key', $shop));
    $opts->setApiSecret(Util::getShopifyConfig('api_secret', $shop));
    $opts->setVersion($version);

    $api = new BasicShopifyAPI($opts);
    $api->setSession(new Session($shop, $shopModel->password));

    $response = $api->rest($method, $apiRoute, $payload);

    return [
        'status' => is_array($response) ? ($response['status'] ?? null) : $response->getStatusCode(),
        'body' => is_array($response) ? ($response['body'] ?? []) : $response->getDecodedBody(),
    ];
}


/**
 * Call Shopify GraphQL API
 *
 * @param string $shop
 * @param \App\Models\User $shopModel
 * @param string $query GraphQL query string
 * @param array $variables Optional variables for query
 * @param string $version API version
 * @return array ['status' => int, 'body' => array]
 */
function callShopifyGraphQL($shop, $shopModel, $query, $variables = [], $version = '2025-04')
{
    $opts = new Options();
    $opts->setApiKey(Util::getShopifyConfig('api_key', $shop));
    $opts->setApiSecret(Util::getShopifyConfig('api_secret', $shop));
    $opts->setVersion($version);

    $api = new BasicShopifyAPI($opts);
    $api->setSession(new Session($shop, $shopModel->password));

    $response = $api->graph($query, $variables);

    return [
        'status' => is_array($response) ? ($response['status'] ?? 200) : $response->getStatusCode(),
        'body' => $response['body'] ?? [],
    ];
}

function callShopifyGraphQL1($shop, $shopModel, $query, $variables = [], $version = '2025-04')
{
    $opts = new Options();
    $opts->setApiKey(Util::getShopifyConfig('api_key', $shop));
    $opts->setApiSecret(Util::getShopifyConfig('api_secret', $shop));
    $opts->setVersion($version);

    $api = new BasicShopifyAPI($opts);
    $api->setSession(new Session($shop, $shopModel->password));
    // dd($variables);
    $response = $api->graph($query, $variables);

    return [
        'status' => is_array($response) ? ($response['status'] ?? 200) : $response->getStatusCode(),
        'body' => $response['body'] ?? [],
    ];
}

/** * Insert Activity Log */
function log_activity(array $data): ActivityLog
{
    return ActivityLog::create($data);
}


function templates($emailNotificationId)
{
    $template = EmailNotification::where('id', $emailNotificationId)->first();
    return $template ? $template->email_body : null;
}
function custom_encrypt($value, $salt = 'cgc%$vc%^$')
{
    try {
        // Derive a 32-byte key from the salt using PBKDF2
        $key = hash_pbkdf2('sha256', $salt, 'laravel_custom_encryption', 10000, 32, true);

        // Generate a random IV (16 bytes for AES-256-CBC)
        $iv = openssl_random_pseudo_bytes(16);

        // Encrypt the value using AES-256-CBC
        $encrypted = openssl_encrypt(
            $value,
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($encrypted === false) {
            throw new \Exception('Encryption failed: ' . openssl_error_string());
        }

        // Combine IV and encrypted data, then encode to base64 for safe storage
        return base64_encode($iv . $encrypted);
    } catch (\Exception $e) {
        throw new \Exception('Encryption failed: ' . $e->getMessage());
    }
}

function custom_decrypt($encrypted, $salt = 'cgc%$vc%^$')
{
    try {
        // Decode the base64 string
        $data = base64_decode($encrypted, true);
        if ($data === false) {
            throw new \Exception('Invalid base64 encoding');
        }

        // Extract IV (first 16 bytes) and encrypted data
        $iv = substr($data, 0, 16);
        $encryptedData = substr($data, 16);

        // Derive the same key from the salt using PBKDF2
        $key = hash_pbkdf2('sha256', $salt, 'laravel_custom_encryption', 10000, 32, true);

        // Decrypt the data
        $decrypted = openssl_decrypt(
            $encryptedData,
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($decrypted === false) {
            throw new \Exception('Decryption failed: ' . openssl_error_string());
        }

        return $decrypted;
    } catch (\Exception $e) {
        throw new \Exception('Decryption failed: ' . $e->getMessage());
    }
}
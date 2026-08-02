<?php

declare(strict_types=1);

/**
 * Disabled-by-default MarkAI provider configuration.
 *
 * Contains no secrets. Real credentials must never be committed.
 * Optional private overrides may live in ProviderConfiguration.local.php
 * (gitignored) and are loaded only by server-side runtime code.
 *
 * @return array{
 *   enabled: bool,
 *   provider: string,
 *   model: string,
 *   accountId: string,
 *   apiToken: string,
 *   baseUrl: string,
 *   connectTimeoutSeconds: float,
 *   totalTimeoutSeconds: float,
 *   maxResponseBytes: int,
 *   temperature: float,
 *   maxTokens: int,
 *   stream: bool
 * }
 */
function markai_default_provider_configuration(): array
{
    return [
        'enabled' => false,
        'provider' => 'cloudflare-workers-ai',
        'model' => '@cf/openai/gpt-oss-120b',
        'accountId' => '',
        'apiToken' => '',
        'baseUrl' => 'https://api.cloudflare.com/client/v4/accounts',
        'connectTimeoutSeconds' => 5.0,
        'totalTimeoutSeconds' => 20.0,
        'maxResponseBytes' => 200000,
        'temperature' => 0.2,
        'maxTokens' => 900,
        'stream' => false,
    ];
}

/**
 * Merge optional overrides into disabled defaults.
 *
 * @param array<string, mixed>|null $overrides
 * @return array<string, mixed>
 */
function markai_load_provider_configuration(?array $overrides = null): array
{
    $config = markai_default_provider_configuration();
    if (is_array($overrides)) {
        foreach ($overrides as $key => $value) {
            if (array_key_exists($key, $config)) {
                $config[$key] = $value;
            }
        }
    }

    return $config;
}

/**
 * @param array<string, mixed> $configuration
 */
function markai_provider_configuration_contains_placeholder(array $configuration): bool
{
    $accountId = trim((string) ($configuration['accountId'] ?? ''));
    $apiToken = trim((string) ($configuration['apiToken'] ?? ''));
    $placeholders = [
        'your_cloudflare_account_id',
        'your_cloudflare_workers_ai_token',
        'ACCOUNT_ID',
        'API_TOKEN',
        'changeme',
        'replace_me',
    ];
    $haystack = strtolower($accountId . ' ' . $apiToken);
    foreach ($placeholders as $placeholder) {
        if (str_contains($haystack, strtolower($placeholder))) {
            return true;
        }
    }

    return false;
}

/**
 * @param array<string, mixed> $configuration
 */
function markai_provider_configuration_is_usable(array $configuration): bool
{
    if (($configuration['enabled'] ?? false) !== true) {
        return false;
    }

    $accountId = trim((string) ($configuration['accountId'] ?? ''));
    $apiToken = trim((string) ($configuration['apiToken'] ?? ''));
    if ($accountId === '' || $apiToken === '') {
        return false;
    }

    if (markai_provider_configuration_contains_placeholder($configuration)) {
        return false;
    }

    $model = trim((string) ($configuration['model'] ?? ''));
    if ($model !== '@cf/openai/gpt-oss-120b') {
        return false;
    }

    $baseUrl = trim((string) ($configuration['baseUrl'] ?? ''));
    if ($baseUrl !== '' && !str_starts_with($baseUrl, 'https://api.cloudflare.com/')) {
        return false;
    }

    return true;
}

if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool
    {
        if ($needle === '') {
            return true;
        }

        return strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

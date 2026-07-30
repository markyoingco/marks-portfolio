<?php

declare(strict_types=1);

/**
 * Example-only Cloudflare Workers AI configuration placeholders.
 *
 * Copy to ProviderConfiguration.local.php (gitignored) for private runtime use.
 * Do not put real credentials in this example file.
 *
 * Expected private local file shape:
 *
 * return [
 *   'enabled' => false,
 *   'accountId' => '',
 *   'apiToken' => '',
 *   'model' => '@cf/openai/gpt-oss-120b',
 * ];
 *
 * Placeholders only:
 * - your_cloudflare_account_id
 * - your_cloudflare_workers_ai_token
 *
 * @return array<string, mixed>
 */
function markai_example_provider_configuration(): array
{
    return [
        'enabled' => false,
        'provider' => 'cloudflare-workers-ai',
        'model' => '@cf/openai/gpt-oss-120b',
        'accountId' => 'your_cloudflare_account_id',
        'apiToken' => 'your_cloudflare_workers_ai_token',
        'baseUrl' => 'https://api.cloudflare.com/client/v4/accounts',
        'connectTimeoutSeconds' => 5.0,
        'totalTimeoutSeconds' => 20.0,
        'maxResponseBytes' => 200000,
        'temperature' => 0.2,
        'maxTokens' => 900,
        'stream' => false,
    ];
}

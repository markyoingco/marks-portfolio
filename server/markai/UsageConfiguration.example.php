<?php

declare(strict_types=1);

/**
 * Example-only MarkAI usage-limiter configuration.
 *
 * Copy to UsageConfiguration.local.php (gitignored) for private overrides.
 * Do not put secrets in this example file.
 *
 * @return array<string, mixed>
 */
function markai_example_usage_configuration(): array
{
    return [
        'enabled' => true,
        'cookieName' => 'markai_sid',
        'sessionWindowSeconds' => 600,
        'sessionWindowMaxRequests' => 6,
        'sessionDayMaxRequests' => 30,
        'globalDayMaxProviderRequests' => 150,
        'activeRequestTimeoutSeconds' => 45,
        'stateRetentionDays' => 7,
        'stateDirectory' => __DIR__ . DIRECTORY_SEPARATOR . 'runtime-state' . DIRECTORY_SEPARATOR . 'usage',
    ];
}

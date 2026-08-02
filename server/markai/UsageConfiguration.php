<?php

declare(strict_types=1);

/**
 * Disabled-by-default MarkAI usage-limiter configuration.
 *
 * Contains no secrets. Optional private overrides may live in
 * UsageConfiguration.local.php (gitignored).
 *
 * @return array{
 *   enabled: bool,
 *   cookieName: string,
 *   sessionWindowSeconds: int,
 *   sessionWindowMaxRequests: int,
 *   sessionDayMaxRequests: int,
 *   globalDayMaxProviderRequests: int,
 *   activeRequestTimeoutSeconds: int,
 *   stateRetentionDays: int,
 *   stateDirectory: string
 * }
 */
function markai_default_usage_configuration(): array
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

/**
 * @param array<string, mixed>|null $overrides
 * @return array<string, mixed>
 */
function markai_load_usage_configuration(?array $overrides = null): array
{
    $config = markai_default_usage_configuration();
    if ($overrides === null) {
        $overrides = markai_read_local_usage_configuration();
    }
    if (is_array($overrides)) {
        foreach ($overrides as $key => $value) {
            if (array_key_exists($key, $config)) {
                $config[$key] = $value;
            }
        }
    }

    $config['sessionWindowSeconds'] = max(1, (int) $config['sessionWindowSeconds']);
    $config['sessionWindowMaxRequests'] = max(1, (int) $config['sessionWindowMaxRequests']);
    $config['sessionDayMaxRequests'] = max(1, (int) $config['sessionDayMaxRequests']);
    $config['globalDayMaxProviderRequests'] = max(1, (int) $config['globalDayMaxProviderRequests']);
    $config['activeRequestTimeoutSeconds'] = max(1, (int) $config['activeRequestTimeoutSeconds']);
    $config['stateRetentionDays'] = max(1, (int) $config['stateRetentionDays']);
    $config['cookieName'] = trim((string) $config['cookieName']) !== ''
        ? trim((string) $config['cookieName'])
        : 'markai_sid';
    $config['stateDirectory'] = (string) $config['stateDirectory'];
    $config['enabled'] = ($config['enabled'] ?? true) === true;

    return $config;
}

/**
 * @return array<string, mixed>|null
 */
function markai_read_local_usage_configuration(): ?array
{
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'UsageConfiguration.local.php';
    if (!is_readable($path)) {
        return null;
    }

    /** @var mixed $loaded */
    $loaded = include $path;
    if (!is_array($loaded)) {
        return null;
    }

    return $loaded;
}

/**
 * Create or reuse an anonymous session identifier for the usage limiter.
 * Never derived from IP, user-agent, or device data.
 */
function markai_usage_resolve_anonymous_session_id(array $configuration, ?array $cookieBag = null): string
{
    $cookieName = (string) ($configuration['cookieName'] ?? 'markai_sid');
    $bag = is_array($cookieBag) ? $cookieBag : $_COOKIE;
    $existing = isset($bag[$cookieName]) && is_string($bag[$cookieName]) ? trim($bag[$cookieName]) : '';
    if ($existing !== '' && preg_match('/^[a-f0-9]{64}$/', $existing) === 1) {
        return $existing;
    }

    try {
        return bin2hex(random_bytes(32));
    } catch (Throwable $e) {
        return hash('sha256', uniqid('markai', true) . microtime(true));
    }
}

/**
 * Emit the anonymous session cookie. Safe for HTTPS DreamHost deployments.
 */
function markai_usage_emit_anonymous_session_cookie(string $rawSessionId, array $configuration): void
{
    if (headers_sent()) {
        return;
    }

    $cookieName = (string) ($configuration['cookieName'] ?? 'markai_sid');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443)
        || (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');

    setcookie($cookieName, $rawSessionId, [
        'expires' => time() + 60 * 60 * 24 * 7,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function markai_usage_hash_session_id(string $rawSessionId): string
{
    return hash('sha256', $rawSessionId);
}

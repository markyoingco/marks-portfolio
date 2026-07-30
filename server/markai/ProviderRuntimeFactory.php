<?php

declare(strict_types=1);

require_once __DIR__ . '/ProviderConfiguration.php';
require_once __DIR__ . '/CurlHttpTransport.php';
require_once __DIR__ . '/HttpTransport.php';
require_once __DIR__ . '/CloudflareWorkersAiProvider.php';

/**
 * Build an optional MarkAI provider runtime.
 *
 * Defaults to disabled. Never reads visitor input, cookies, query params,
 * React/Vite env vars, or public JSON for credentials.
 *
 * @param array<string, mixed>|null $configurationOverride Test-only override.
 * @param HttpTransport|null $transportOverride Test-only transport.
 *
 * @return array{
 *   configuration: array<string, mixed>,
 *   transport: callable|null,
 *   status: string,
 *   providerName: string,
 *   model: string
 * }
 */
function markai_create_provider_runtime(
    ?array $configurationOverride = null,
    ?HttpTransport $transportOverride = null
): array {
    $defaults = markai_default_provider_configuration();
    $configuration = markai_resolve_provider_configuration($configurationOverride);

    $model = (string) ($configuration['model'] ?? CloudflareWorkersAiProvider::MODEL_NAME);
    $providerName = (string) ($configuration['provider'] ?? CloudflareWorkersAiProvider::PROVIDER_NAME);

    $disabled = static function (array $configuration, string $status) use ($defaults, $providerName, $model): array {
        // Never return usable secrets when runtime is not ready.
        $safe = $defaults;
        $safe['enabled'] = false;
        $safe['accountId'] = '';
        $safe['apiToken'] = '';
        $safe['model'] = $model !== '' ? $model : $defaults['model'];
        $safe['provider'] = $providerName !== '' ? $providerName : $defaults['provider'];

        return [
            'configuration' => $safe,
            'transport' => null,
            'status' => $status,
            'providerName' => (string) $safe['provider'],
            'model' => (string) $safe['model'],
        ];
    };

    if (($configuration['enabled'] ?? false) !== true) {
        return $disabled($configuration, 'disabled');
    }

    if (!markai_provider_model_is_allowed($configuration)) {
        return $disabled($configuration, 'invalid_model');
    }

    if (!markai_provider_configuration_is_usable($configuration)) {
        return $disabled($configuration, 'invalid_configuration');
    }

    $transport = $transportOverride ?? new CurlHttpTransport();
    if (!$transport->isAvailable()) {
        return $disabled($configuration, 'transport_unavailable');
    }

    $callable = markai_wrap_http_transport_for_provider($transport, $configuration);

    return [
        'configuration' => $configuration,
        'transport' => $callable,
        'status' => 'ready',
        'providerName' => $providerName,
        'model' => $model,
    ];
}

/**
 * @param array<string, mixed>|null $configurationOverride
 * @return array<string, mixed>
 */
function markai_resolve_provider_configuration(?array $configurationOverride = null): array
{
    if (is_array($configurationOverride)) {
        return markai_load_provider_configuration($configurationOverride);
    }

    return markai_load_provider_configuration(markai_read_local_provider_configuration());
}

/**
 * @return array<string, mixed>|null
 */
function markai_read_local_provider_configuration(): ?array
{
    $path = markai_provider_local_configuration_path();
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

function markai_provider_local_configuration_path(): string
{
    return __DIR__ . DIRECTORY_SEPARATOR . 'ProviderConfiguration.local.php';
}

/**
 * @param array<string, mixed> $configuration
 */
function markai_provider_model_is_allowed(array $configuration): bool
{
    $model = trim((string) ($configuration['model'] ?? ''));

    return $model === CloudflareWorkersAiProvider::MODEL_NAME;
}

/**
 * Adapt HttpTransport into the callable shape expected by CloudflareWorkersAiProvider.
 *
 * @param array<string, mixed> $configuration
 */
function markai_wrap_http_transport_for_provider(HttpTransport $transport, array $configuration): callable
{
    return static function (
        string $method,
        string $url,
        array $headers,
        string $body,
        array $options
    ) use ($transport, $configuration): array {
        $result = $transport->request([
            'url' => $url,
            'method' => $method,
            'headers' => $headers,
            'body' => $body,
            'connectTimeoutSeconds' => (float) ($options['connect_timeout']
                ?? $configuration['connectTimeoutSeconds']
                ?? 5.0),
            'totalTimeoutSeconds' => (float) ($options['timeout']
                ?? $configuration['totalTimeoutSeconds']
                ?? 20.0),
            'maxResponseBytes' => (int) ($options['max_response_bytes']
                ?? $configuration['maxResponseBytes']
                ?? CurlHttpTransport::DEFAULT_MAX_RESPONSE_BYTES),
            'allowRedirects' => false,
            'allowedHost' => (string) ($options['allowed_host']
                ?? CloudflareWorkersAiProvider::ALLOWED_HOST),
            'requireJson' => (bool) ($options['require_json'] ?? true),
        ]);

        // Map transport result into the existing provider callable contract.
        // Never include Authorization or other secrets.
        if (($result['success'] ?? false) === true) {
            return [
                'status' => (int) ($result['httpStatus'] ?? 0),
                'body' => (string) ($result['body'] ?? ''),
                'headers' => [
                    'Content-Type' => (string) ($result['contentType'] ?? 'application/json'),
                ],
            ];
        }

        $status = (int) ($result['httpStatus'] ?? 0);
        $errorCategory = (string) ($result['errorCategory'] ?? 'transport_error');

        // Preserve status codes when available so the provider can normalize them.
        if ($status <= 0) {
            if ($errorCategory === 'timeout') {
                $status = 408;
            } elseif ($errorCategory === 'response_too_large') {
                $status = 413;
            } elseif ($errorCategory === 'authentication_failed') {
                $status = 401;
            } elseif ($errorCategory === 'rate_limited') {
                $status = 429;
            } elseif ($errorCategory === 'not_found') {
                $status = 404;
            } elseif ($errorCategory === 'upstream_error') {
                $status = 503;
            } else {
                $status = 0;
            }
        }

        return [
            'status' => $status,
            'body' => (string) ($result['body'] ?? ''),
            'headers' => [
                'Content-Type' => (string) ($result['contentType'] ?? ''),
            ],
            'errorCategory' => $errorCategory,
        ];
    };
}

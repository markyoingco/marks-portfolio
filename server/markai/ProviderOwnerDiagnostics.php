<?php

declare(strict_types=1);

/**
 * Owner-safe MarkAI provider diagnostics.
 *
 * Writes compact, allowlisted lines to the PHP error log so DreamHost logs can
 * distinguish failure categories without exposing secrets, tokens, account IDs,
 * Authorization headers, prompts, or raw provider bodies to visitors.
 */
final class ProviderOwnerDiagnostics
{
    /** @var list<string> */
    private const ALLOWED_EVENTS = [
        'runtime_not_ready',
        'provider_attempt_failed',
        'provider_validator_rejected',
        'provider_fallback_served',
        'provider_success',
    ];

    /** @var list<string> */
    private const ALLOWED_CATEGORIES = [
        'provider_disabled',
        'invalid_configuration',
        'invalid_model',
        'transport_unavailable',
        'curl_unavailable',
        'private_configuration_missing',
        'authentication_failed',
        'not_found',
        'rate_limited',
        'timeout',
        'http_server_error',
        'http_client_error',
        'dns_failed',
        'connection_failed',
        'tls_failed',
        'empty_response',
        'response_too_large',
        'invalid_content_type',
        'invalid_json',
        'unsupported_schema',
        'incomplete_response',
        'provider_success_false',
        'unrecognized_response',
        'conflicting_answers',
        'reasoning_only_output',
        'tool_only_output',
        'unsafe_answer',
        'unknown_transport_error',
        'invalid_endpoint',
        'invalid_request_payload',
        'payload_too_large',
        'runtime_not_ready',
        'none',
    ];

    /** @var list<string> */
    private const ALLOWED_PUBLIC_CODES = [
        'provider_unavailable',
        'provider_timeout',
        'provider_disabled',
        'network_error',
        'internal_error',
        'session_window_limit',
        'session_daily_limit',
        'global_daily_limit',
        'none',
    ];

    /**
     * @param array{
     *   event?: string,
     *   category?: ?string,
     *   publicErrorCode?: ?string,
     *   runtimeStatus?: ?string,
     *   httpStatus?: ?int,
     *   model?: ?string,
     *   provider?: ?string,
     *   fallbackUsed?: ?bool,
     *   validationReason?: ?string
     * } $fields
     */
    public static function record(array $fields): void
    {
        $event = self::allowlisted(
            (string) ($fields['event'] ?? 'provider_attempt_failed'),
            self::ALLOWED_EVENTS,
            'provider_attempt_failed'
        );
        $category = self::allowlisted(
            strtolower(trim((string) ($fields['category'] ?? 'none'))),
            self::ALLOWED_CATEGORIES,
            'none'
        );
        $publicCode = self::allowlisted(
            strtolower(trim((string) ($fields['publicErrorCode'] ?? 'none'))),
            self::ALLOWED_PUBLIC_CODES,
            'none'
        );
        $runtimeStatus = self::safeToken((string) ($fields['runtimeStatus'] ?? 'unknown'), 48);
        $model = self::safeToken((string) ($fields['model'] ?? ''), 96);
        $provider = self::safeToken((string) ($fields['provider'] ?? ''), 64);
        $validationReason = self::safeToken((string) ($fields['validationReason'] ?? ''), 64);
        $httpStatus = isset($fields['httpStatus']) && is_int($fields['httpStatus'])
            ? max(0, min(599, $fields['httpStatus']))
            : 0;
        $fallbackUsed = ($fields['fallbackUsed'] ?? false) === true ? 'yes' : 'no';

        $line = implode(' ', [
            'markai_provider_diag',
            'event=' . $event,
            'category=' . $category,
            'public_error_code=' . $publicCode,
            'runtime_status=' . ($runtimeStatus !== '' ? $runtimeStatus : 'unknown'),
            'http_status=' . (string) $httpStatus,
            'fallback_used=' . $fallbackUsed,
            'provider=' . ($provider !== '' ? $provider : 'unknown'),
            'model=' . ($model !== '' ? $model : 'unknown'),
            'validation_reason=' . ($validationReason !== '' ? $validationReason : 'none'),
        ]);

        // Refuse to log anything that looks like a bearer token or long secret.
        if (preg_match('/Bearer\s+[A-Za-z0-9_\-\.]+/i', $line) === 1) {
            error_log('markai_provider_diag event=provider_attempt_failed category=none public_error_code=internal_error detail=log_sanitized');
            return;
        }

        error_log($line);
    }

    /**
     * Collapse provider categories into owner-facing buckets.
     */
    public static function ownerBucket(?string $category): string
    {
        $category = strtolower(trim((string) $category));

        return match ($category) {
            'provider_disabled', 'invalid_configuration', 'disabled',
            'private_configuration_missing', 'curl_unavailable', 'transport_unavailable' => 'configuration',
            'authentication_failed' => 'authentication',
            'not_found', 'invalid_endpoint', 'invalid_model' => 'account_or_model',
            'rate_limited' => 'quota_or_rate_limit',
            'timeout' => 'timeout',
            'http_server_error', 'dns_failed', 'connection_failed', 'tls_failed',
            'unknown_transport_error', 'upstream_or_network' => 'upstream_or_network',
            'empty_response', 'invalid_content_type', 'invalid_json', 'unsupported_schema',
            'incomplete_response', 'provider_success_false', 'unrecognized_response',
            'conflicting_answers', 'reasoning_only_output', 'tool_only_output',
            'payload_too_large', 'response_too_large', 'http_client_error',
            'invalid_request_payload', 'malformed_or_unsupported_response' => 'malformed_or_unsupported_response',
            'unsafe_answer', 'validator_rejected' => 'validator_rejected',
            'none' => 'none',
            default => 'other',
        };
    }

    /**
     * @param list<string> $allowed
     */
    private static function allowlisted(string $value, array $allowed, string $fallback): string
    {
        return in_array($value, $allowed, true) ? $value : $fallback;
    }

    private static function safeToken(string $value, int $maxLen): string
    {
        $value = preg_replace('/[^a-zA-Z0-9@\/_\-\.]/', '', $value) ?? '';
        if (strlen($value) > $maxLen) {
            return substr($value, 0, $maxLen);
        }

        return $value;
    }
}

<?php

declare(strict_types=1);

/**
 * Safe MarkAI user-facing status messages.
 * Never includes credentials, paths, exception text, or internal usage totals.
 */
final class MarkAiUserFacingStatus
{
    public const CODE_SESSION_WINDOW = 'session_window_limit';
    public const CODE_SESSION_DAILY = 'session_daily_limit';
    public const CODE_GLOBAL_DAILY = 'global_daily_limit';
    public const CODE_PROVIDER_UNAVAILABLE = 'provider_unavailable';
    public const CODE_PROVIDER_TIMEOUT = 'provider_timeout';
    public const CODE_PROVIDER_DISABLED = 'provider_disabled';
    public const CODE_NETWORK_ERROR = 'network_error';
    public const CODE_INTERNAL_ERROR = 'internal_error';

    public const FALLBACK_NOTE =
        'Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.';

    /**
     * @return array{errorCode: string, userMessage: string, userNote: string, retryAfterSeconds: ?int}
     */
    public static function forErrorCode(string $errorCode, ?int $retryAfterSeconds = null): array
    {
        $code = self::normalizeCode($errorCode);
        $retryAfterSeconds = self::normalizeRetryAfter($retryAfterSeconds);

        return match ($code) {
            self::CODE_SESSION_WINDOW => [
                'errorCode' => $code,
                'userMessage' => 'MarkAI’s short-term chat limit has been reached.',
                'userNote' => self::sessionWindowNote($retryAfterSeconds),
                'retryAfterSeconds' => $retryAfterSeconds,
            ],
            self::CODE_SESSION_DAILY => [
                'errorCode' => $code,
                'userMessage' => 'Today’s chat limit has been reached for this browser.',
                'userNote' => 'Please try again tomorrow.',
                'retryAfterSeconds' => null,
            ],
            self::CODE_GLOBAL_DAILY => [
                'errorCode' => $code,
                'userMessage' => 'MarkAI has reached today’s shared AI limit.',
                'userNote' => 'Please try again tomorrow. Approved portfolio answers may still be available.',
                'retryAfterSeconds' => null,
            ],
            self::CODE_PROVIDER_TIMEOUT => [
                'errorCode' => $code,
                'userMessage' => 'MarkAI’s AI provider is temporarily unavailable.',
                'userNote' => 'Please try again shortly.',
                'retryAfterSeconds' => null,
            ],
            self::CODE_PROVIDER_UNAVAILABLE => [
                'errorCode' => $code,
                'userMessage' => 'MarkAI’s AI provider is temporarily unavailable.',
                'userNote' => 'Please try again shortly.',
                'retryAfterSeconds' => null,
            ],
            self::CODE_PROVIDER_DISABLED => [
                'errorCode' => $code,
                'userMessage' => 'Live AI responses are temporarily unavailable.',
                'userNote' => 'MarkAI can still use approved portfolio information when a verified fallback exists.',
                'retryAfterSeconds' => null,
            ],
            self::CODE_NETWORK_ERROR => [
                'errorCode' => $code,
                'userMessage' => 'MarkAI could not complete that request.',
                'userNote' => 'Check your connection and try again.',
                'retryAfterSeconds' => null,
            ],
            default => [
                'errorCode' => self::CODE_INTERNAL_ERROR,
                'userMessage' => 'Something went wrong. Please try again.',
                'userNote' => '',
                'retryAfterSeconds' => null,
            ],
        };
    }

    /**
     * Map usage-limiter internal reasons to public error codes.
     */
    public static function fromUsageReason(string $reason): string
    {
        return match ($reason) {
            'session_window', 'active_request' => self::CODE_SESSION_WINDOW,
            'session_daily' => self::CODE_SESSION_DAILY,
            'global_daily' => self::CODE_GLOBAL_DAILY,
            default => self::CODE_INTERNAL_ERROR,
        };
    }

    /**
     * Map provider failure categories to public error codes.
     *
     * Public codes stay coarse. Owner-safe diagnostics retain the finer category.
     */
    public static function fromProviderCategory(?string $category): string
    {
        $category = is_string($category) ? strtolower(trim($category)) : '';

        return match ($category) {
            'provider_disabled',
            'invalid_configuration',
            'invalid_model' => self::CODE_PROVIDER_DISABLED,
            'timeout' => self::CODE_PROVIDER_TIMEOUT,
            'transport_unavailable',
            'curl_unavailable',
            'rate_limited',
            'http_server_error',
            'dns_failed',
            'connection_failed',
            'tls_failed',
            'unknown_transport_error',
            'authentication_failed',
            'not_found',
            'invalid_endpoint',
            'empty_response',
            'invalid_content_type',
            'invalid_json',
            'unsupported_schema',
            'incomplete_response',
            'provider_success_false',
            'unrecognized_response',
            'conflicting_answers',
            'reasoning_only_output',
            'tool_only_output',
            'http_client_error',
            'payload_too_large',
            'response_too_large',
            'unsafe_answer' => self::CODE_PROVIDER_UNAVAILABLE,
            default => self::CODE_PROVIDER_UNAVAILABLE,
        };
    }

    /**
     * Attach safe status fields to a public MarkAI payload.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public static function attach(
        array $payload,
        ?string $errorCode = null,
        ?int $retryAfterSeconds = null,
        bool $fallbackUsed = false,
        bool $preferLimitAsAnswer = false
    ): array {
        $payload['fallbackUsed'] = $fallbackUsed === true;

        if ($errorCode === null || $errorCode === '') {
            $payload['errorCode'] = null;
            $payload['userMessage'] = null;
            $payload['userNote'] = $fallbackUsed ? self::FALLBACK_NOTE : null;
            $payload['retryAfterSeconds'] = null;

            return $payload;
        }

        $status = self::forErrorCode($errorCode, $retryAfterSeconds);
        $payload['errorCode'] = $status['errorCode'];
        $payload['userMessage'] = $status['userMessage'];
        $payload['retryAfterSeconds'] = $status['retryAfterSeconds'];

        $answer = trim((string) ($payload['answer'] ?? ''));
        if ($preferLimitAsAnswer || $answer === '') {
            $payload['answer'] = $status['userMessage'];
            $answer = $status['userMessage'];
        }

        $isUsageLimit = in_array($status['errorCode'], [
            self::CODE_SESSION_WINDOW,
            self::CODE_SESSION_DAILY,
            self::CODE_GLOBAL_DAILY,
        ], true);

        if ($status['errorCode'] === self::CODE_INTERNAL_ERROR) {
            // Unknown errors stay generic — never invent an explanation note.
            $payload['userNote'] = null;
        } elseif ($isUsageLimit) {
            $payload['userNote'] = $status['userNote'] !== '' ? $status['userNote'] : null;
        } elseif ($fallbackUsed && $answer !== '') {
            $payload['userNote'] = self::FALLBACK_NOTE;
        } else {
            $payload['userNote'] = $status['userNote'] !== '' ? $status['userNote'] : null;
        }

        return $payload;
    }

    private static function sessionWindowNote(?int $retryAfterSeconds): string
    {
        if ($retryAfterSeconds === null || $retryAfterSeconds < 1) {
            return 'Please try again in a few minutes.';
        }

        $minutes = (int) max(1, (int) ceil($retryAfterSeconds / 60));

        return 'Please try again in about ' . $minutes . ' minute' . ($minutes === 1 ? '' : 's') . '.';
    }

    private static function normalizeCode(string $errorCode): string
    {
        $allowed = [
            self::CODE_SESSION_WINDOW,
            self::CODE_SESSION_DAILY,
            self::CODE_GLOBAL_DAILY,
            self::CODE_PROVIDER_UNAVAILABLE,
            self::CODE_PROVIDER_TIMEOUT,
            self::CODE_PROVIDER_DISABLED,
            self::CODE_NETWORK_ERROR,
            self::CODE_INTERNAL_ERROR,
        ];

        return in_array($errorCode, $allowed, true) ? $errorCode : self::CODE_INTERNAL_ERROR;
    }

    private static function normalizeRetryAfter(?int $retryAfterSeconds): ?int
    {
        if ($retryAfterSeconds === null || $retryAfterSeconds < 1) {
            return null;
        }

        return min(86400, $retryAfterSeconds);
    }
}

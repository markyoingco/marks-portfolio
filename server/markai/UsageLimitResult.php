<?php

declare(strict_types=1);

/**
 * Safe usage-limit decision. Never includes paths, hashes, or quota totals.
 */
final class UsageLimitResult
{
    private bool $allowed;
    private string $reason;
    private string $answerStatus;
    private ?int $retryAfterSeconds;

    private function __construct(
        bool $allowed,
        string $reason,
        string $answerStatus,
        ?int $retryAfterSeconds = null
    ) {
        $this->allowed = $allowed;
        $this->reason = $reason;
        $this->answerStatus = $answerStatus;
        $this->retryAfterSeconds = $retryAfterSeconds;
    }

    public static function allow(): self
    {
        return new self(true, 'allowed', 'answered', null);
    }

    public static function deny(string $reason, ?int $retryAfterSeconds = null): self
    {
        $safeReason = match ($reason) {
            'session_window',
            'session_daily',
            'global_daily',
            'active_request',
            'lock_failed',
            'corrupt_state',
            'unavailable' => $reason,
            default => 'unavailable',
        };

        $answerStatus = in_array($safeReason, ['session_daily', 'global_daily'], true)
            ? 'daily_limit'
            : 'rate_limited';

        $safeRetry = null;
        if (is_int($retryAfterSeconds) && $retryAfterSeconds >= 1) {
            $safeRetry = min(86400, $retryAfterSeconds);
        }

        return new self(false, $safeReason, $answerStatus, $safeRetry);
    }

    public function isAllowed(): bool
    {
        return $this->allowed;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getAnswerStatus(): string
    {
        return $this->answerStatus;
    }

    public function getRetryAfterSeconds(): ?int
    {
        return $this->retryAfterSeconds;
    }
}

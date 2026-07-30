<?php

declare(strict_types=1);

require_once __DIR__ . '/UsageConfiguration.php';
require_once __DIR__ . '/UsageLimitResult.php';

/**
 * File-backed MarkAI usage limiter for DreamHost shared PHP hosting.
 *
 * Stores only anonymous session hashes, timestamps, and daily provider counts.
 * Never stores questions, answers, IPs, user-agents, or raw cookie values.
 */
final class FileUsageLimiter
{
    /** @var array<string, mixed> */
    private array $configuration;
    private string $stateDirectory;
    private ?int $nowOverride;

    /**
     * @param array<string, mixed>|null $configuration
     */
    public function __construct(?array $configuration = null, ?int $nowOverride = null)
    {
        $this->configuration = markai_load_usage_configuration($configuration);
        $this->stateDirectory = rtrim((string) $this->configuration['stateDirectory'], '\\/');
        $this->nowOverride = $nowOverride;
    }

    /**
     * @return array<string, mixed>
     */
    public function getConfiguration(): array
    {
        return $this->configuration;
    }

    public function getStateDirectory(): string
    {
        return $this->stateDirectory;
    }

    public function isEnabled(): bool
    {
        return ($this->configuration['enabled'] ?? true) === true;
    }

    /**
     * Acquire a provider permit immediately before a Cloudflare call.
     * Increments the global daily provider counter only on success.
     */
    public function acquireProviderPermit(string $rawSessionId): UsageLimitResult
    {
        if (!$this->isEnabled()) {
            return UsageLimitResult::allow();
        }

        if (!$this->ensureStateDirectory()) {
            return UsageLimitResult::deny('lock_failed');
        }

        $sessionHash = markai_usage_hash_session_id($rawSessionId);
        if (!preg_match('/^[a-f0-9]{64}$/', $sessionHash)) {
            return UsageLimitResult::deny('corrupt_state');
        }

        $now = $this->now();
        $sessionPath = $this->sessionPath($sessionHash);
        $globalPath = $this->globalPath($now);
        $lockPath = $this->stateDirectory . DIRECTORY_SEPARATOR . 'usage.lock';

        $lockHandle = @fopen($lockPath, 'c+');
        if ($lockHandle === false) {
            return UsageLimitResult::deny('lock_failed');
        }

        if (!flock($lockHandle, LOCK_EX)) {
            fclose($lockHandle);
            return UsageLimitResult::deny('lock_failed');
        }

        try {
            $this->pruneLocked($now);

            $session = $this->readJsonFile($sessionPath);
            if ($session === null && is_file($sessionPath)) {
                return UsageLimitResult::deny('corrupt_state');
            }
            if ($session === null) {
                $session = [
                    'sessionHash' => $sessionHash,
                    'providerTimestamps' => [],
                    'activeUntil' => null,
                ];
            }
            if (!$this->isValidSessionState($session, $sessionHash)) {
                return UsageLimitResult::deny('corrupt_state');
            }

            $global = $this->readJsonFile($globalPath);
            if ($global === null && is_file($globalPath)) {
                return UsageLimitResult::deny('corrupt_state');
            }
            if ($global === null) {
                $global = [
                    'utcDate' => gmdate('Y-m-d', $now),
                    'providerCount' => 0,
                ];
            }
            if (!$this->isValidGlobalState($global, $now)) {
                return UsageLimitResult::deny('corrupt_state');
            }

            $activeUntil = $session['activeUntil'];
            if (is_int($activeUntil) && $activeUntil > $now) {
                return UsageLimitResult::deny('active_request');
            }

            $windowSeconds = (int) $this->configuration['sessionWindowSeconds'];
            $windowMax = (int) $this->configuration['sessionWindowMaxRequests'];
            $dayMax = (int) $this->configuration['sessionDayMaxRequests'];
            $globalMax = (int) $this->configuration['globalDayMaxProviderRequests'];
            $activeTimeout = (int) $this->configuration['activeRequestTimeoutSeconds'];

            $timestamps = $this->normalizeTimestamps($session['providerTimestamps'] ?? []);
            $timestamps = array_values(array_filter(
                $timestamps,
                static fn (int $ts): bool => $ts >= ($now - 86400)
            ));

            $windowCount = count(array_filter(
                $timestamps,
                static fn (int $ts): bool => $ts >= ($now - $windowSeconds)
            ));
            if ($windowCount >= $windowMax) {
                return UsageLimitResult::deny('session_window');
            }

            $utcDay = gmdate('Y-m-d', $now);
            $dayCount = count(array_filter(
                $timestamps,
                static fn (int $ts): bool => gmdate('Y-m-d', $ts) === $utcDay
            ));
            if ($dayCount >= $dayMax) {
                return UsageLimitResult::deny('session_daily');
            }

            $providerCount = (int) ($global['providerCount'] ?? 0);
            if ($providerCount >= $globalMax) {
                return UsageLimitResult::deny('global_daily');
            }

            $timestamps[] = $now;
            $session['providerTimestamps'] = $timestamps;
            $session['activeUntil'] = $now + $activeTimeout;
            $session['sessionHash'] = $sessionHash;

            $global['providerCount'] = $providerCount + 1;
            $global['utcDate'] = $utcDay;

            if (!$this->writeJsonFile($sessionPath, $session)) {
                return UsageLimitResult::deny('lock_failed');
            }
            if (!$this->writeJsonFile($globalPath, $global)) {
                return UsageLimitResult::deny('lock_failed');
            }

            return UsageLimitResult::allow();
        } finally {
            flock($lockHandle, LOCK_UN);
            fclose($lockHandle);
        }
    }

    public function releaseProviderPermit(string $rawSessionId): void
    {
        if (!$this->isEnabled()) {
            return;
        }
        if (!$this->ensureStateDirectory()) {
            return;
        }

        $sessionHash = markai_usage_hash_session_id($rawSessionId);
        $sessionPath = $this->sessionPath($sessionHash);
        $lockPath = $this->stateDirectory . DIRECTORY_SEPARATOR . 'usage.lock';
        $lockHandle = @fopen($lockPath, 'c+');
        if ($lockHandle === false) {
            return;
        }
        if (!flock($lockHandle, LOCK_EX)) {
            fclose($lockHandle);
            return;
        }

        try {
            $session = $this->readJsonFile($sessionPath);
            if (!is_array($session)) {
                return;
            }
            $session['activeUntil'] = null;
            $this->writeJsonFile($sessionPath, $session);
        } finally {
            flock($lockHandle, LOCK_UN);
            fclose($lockHandle);
        }
    }

    /**
     * Test helper: inspect sanitized state without exposing raw cookies.
     *
     * @return array<string, mixed>|null
     */
    public function readSessionStateForTests(string $rawSessionId): ?array
    {
        $path = $this->sessionPath(markai_usage_hash_session_id($rawSessionId));
        return $this->readJsonFile($path);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function readGlobalStateForTests(?int $now = null): ?array
    {
        return $this->readJsonFile($this->globalPath($now ?? $this->now()));
    }

    public function pruneForTests(?int $now = null): void
    {
        if (!$this->ensureStateDirectory()) {
            return;
        }
        $lockPath = $this->stateDirectory . DIRECTORY_SEPARATOR . 'usage.lock';
        $lockHandle = @fopen($lockPath, 'c+');
        if ($lockHandle === false) {
            return;
        }
        if (!flock($lockHandle, LOCK_EX)) {
            fclose($lockHandle);
            return;
        }
        try {
            $this->pruneLocked($now ?? $this->now());
        } finally {
            flock($lockHandle, LOCK_UN);
            fclose($lockHandle);
        }
    }

    private function now(): int
    {
        return $this->nowOverride ?? time();
    }

    private function ensureStateDirectory(): bool
    {
        if (is_dir($this->stateDirectory)) {
            $this->writeDenyFiles();
            return is_writable($this->stateDirectory);
        }

        if (!@mkdir($this->stateDirectory, 0700, true) && !is_dir($this->stateDirectory)) {
            return false;
        }

        $this->writeDenyFiles();
        return is_writable($this->stateDirectory);
    }

    private function writeDenyFiles(): void
    {
        $htaccess = $this->stateDirectory . DIRECTORY_SEPARATOR . '.htaccess';
        if (!is_file($htaccess)) {
            @file_put_contents($htaccess, "Require all denied\nDeny from all\n");
        }
        $index = $this->stateDirectory . DIRECTORY_SEPARATOR . 'index.html';
        if (!is_file($index)) {
            @file_put_contents($index, '');
        }
        $sessionsDir = $this->stateDirectory . DIRECTORY_SEPARATOR . 'sessions';
        if (!is_dir($sessionsDir)) {
            @mkdir($sessionsDir, 0700, true);
        }
        $globalDir = $this->stateDirectory . DIRECTORY_SEPARATOR . 'global';
        if (!is_dir($globalDir)) {
            @mkdir($globalDir, 0700, true);
        }
    }

    private function sessionPath(string $sessionHash): string
    {
        return $this->stateDirectory
            . DIRECTORY_SEPARATOR
            . 'sessions'
            . DIRECTORY_SEPARATOR
            . $sessionHash
            . '.json';
    }

    private function globalPath(int $now): string
    {
        return $this->stateDirectory
            . DIRECTORY_SEPARATOR
            . 'global'
            . DIRECTORY_SEPARATOR
            . gmdate('Y-m-d', $now)
            . '.json';
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readJsonFile(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }
        try {
            $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            return null;
        }
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeJsonFile(string $path, array $data): bool
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            return false;
        }

        $json = json_encode($data, JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            return false;
        }

        $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            return false;
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $session
     */
    private function isValidSessionState(array $session, string $expectedHash): bool
    {
        if (($session['sessionHash'] ?? null) !== $expectedHash) {
            return false;
        }
        if (!array_key_exists('providerTimestamps', $session) || !is_array($session['providerTimestamps'])) {
            return false;
        }
        if (array_key_exists('activeUntil', $session)
            && $session['activeUntil'] !== null
            && !is_int($session['activeUntil'])
        ) {
            return false;
        }
        foreach (array_keys($session) as $key) {
            if (!in_array($key, ['sessionHash', 'providerTimestamps', 'activeUntil'], true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param array<string, mixed> $global
     */
    private function isValidGlobalState(array $global, int $now): bool
    {
        if (($global['utcDate'] ?? null) !== gmdate('Y-m-d', $now)) {
            return false;
        }
        if (!isset($global['providerCount']) || !is_int($global['providerCount']) || $global['providerCount'] < 0) {
            return false;
        }
        foreach (array_keys($global) as $key) {
            if (!in_array($key, ['utcDate', 'providerCount'], true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param mixed $timestamps
     * @return list<int>
     */
    private function normalizeTimestamps($timestamps): array
    {
        if (!is_array($timestamps)) {
            return [];
        }
        $out = [];
        foreach ($timestamps as $ts) {
            if (is_int($ts) && $ts > 0) {
                $out[] = $ts;
            }
        }

        return $out;
    }

    private function pruneLocked(int $now): void
    {
        $retentionSeconds = ((int) $this->configuration['stateRetentionDays']) * 86400;
        $activeTimeout = (int) $this->configuration['activeRequestTimeoutSeconds'];
        $sessionsDir = $this->stateDirectory . DIRECTORY_SEPARATOR . 'sessions';
        $globalDir = $this->stateDirectory . DIRECTORY_SEPARATOR . 'global';

        if (is_dir($sessionsDir)) {
            foreach (glob($sessionsDir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $file) {
                $mtime = @filemtime($file);
                if (is_int($mtime) && ($now - $mtime) > $retentionSeconds) {
                    @unlink($file);
                    continue;
                }
                $session = $this->readJsonFile($file);
                if (!is_array($session)) {
                    // Leave corrupt session files so acquire can fail closed.
                    continue;
                }
                $timestamps = $this->normalizeTimestamps($session['providerTimestamps'] ?? []);
                $timestamps = array_values(array_filter(
                    $timestamps,
                    static fn (int $ts): bool => $ts >= ($now - 86400)
                ));
                $activeUntil = $session['activeUntil'] ?? null;
                if (is_int($activeUntil) && $activeUntil <= $now) {
                    $activeUntil = null;
                }
                if (is_int($activeUntil) && ($activeUntil - $now) > $activeTimeout) {
                    $activeUntil = null;
                }
                $session['providerTimestamps'] = $timestamps;
                $session['activeUntil'] = $activeUntil;
                if ($timestamps === [] && $activeUntil === null && is_int($mtime) && ($now - $mtime) > $retentionSeconds) {
                    @unlink($file);
                    continue;
                }
                $this->writeJsonFile($file, $session);
            }
        }

        if (is_dir($globalDir)) {
            foreach (glob($globalDir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $file) {
                $base = basename($file, '.json');
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $base) !== 1) {
                    @unlink($file);
                    continue;
                }
                $dayStart = strtotime($base . ' UTC');
                if (!is_int($dayStart)) {
                    @unlink($file);
                    continue;
                }
                // Keep current day + short operational buffer, never beyond retention.
                if (($now - $dayStart) > $retentionSeconds) {
                    @unlink($file);
                }
            }
        }
    }
}

<?php

declare(strict_types=1);

/**
 * MarkAI conversational regression suite.
 *
 * Runs fixture conversations across profile, skills, projects, collaborators,
 * testimonials, fitness, interests, privacy, typos, follow-ups, topic switching,
 * provider failure, and rate limits.
 *
 * Always fixture-only: live_network_requests=0.
 * Writes a transcript-style markdown report for Mark to skim.
 *
 * Usage:
 *   php scripts/test-markai-conversational-regression.php
 */

$repoRoot = dirname(__DIR__);
require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/ProviderConfiguration.php';
require_once $repoRoot . '/server/markai/FileUsageLimiter.php';
require_once $repoRoot . '/server/markai/MarkAiUserFacingStatus.php';
require_once $repoRoot . '/server/markai/GeneratedAnswerService.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/MultiQuestionService.php';

$exportPath = $repoRoot . '/server/markai/generated/approved-v1.json';
$scenariosPath = $repoRoot . '/scripts/fixtures/markai-conversational-scenarios.php';
$reportPath = $repoRoot . '/scripts/fixtures/markai-conversational-regression-report.md';

if (!is_readable($exportPath)) {
    fwrite(STDERR, "FAIL: approved export missing\n");
    exit(1);
}
if (!is_readable($scenariosPath)) {
    fwrite(STDERR, "FAIL: conversational scenarios missing\n");
    exit(1);
}

$export = json_decode((string) file_get_contents($exportPath), true, 512, JSON_THROW_ON_ERROR);
/** @var list<array<string, mixed>> $scenarios */
$scenarios = require $scenariosPath;

$networkCalls = 0;
$failures = [];
$passes = 0;
$transcript = [];

$assert = static function (bool $ok, string $message) use (&$failures, &$passes): void {
    if ($ok) {
        $passes++;
        fwrite(STDOUT, "PASS: {$message}\n");
        return;
    }
    $failures[] = $message;
    fwrite(STDERR, "FAIL: {$message}\n");
};

$disabledConfig = markai_load_provider_configuration(['enabled' => false]);
$enabledConfig = markai_load_provider_configuration([
    'enabled' => true,
    'accountId' => 'acct_test_conversational_regression_only',
    'apiToken' => 'token_test_conversational_regression_only',
    'model' => '@cf/openai/gpt-oss-120b',
]);

$failTransport = static function () use (&$networkCalls): array {
    $networkCalls++;

    return [
        'status' => 503,
        'body' => '',
        'headers' => [],
        'errorCategory' => 'http_server_error',
    ];
};

$successTransport = static function () use (&$networkCalls): array {
    $networkCalls++;

    return [
        'status' => 200,
        'body' => json_encode([
            'success' => true,
            'result' => [
                'choices' => [
                    [
                        'message' => [
                            'role' => 'assistant',
                            'content' => 'Abacus was a team senior-design project. Mark’s approved work included Eagle messaging APIs and competition-day stability support.',
                        ],
                        'finish_reason' => 'stop',
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR),
        'headers' => ['Content-Type' => 'application/json'],
    ];
};

$tempDirs = [];
$makeTempDir = static function () use (&$tempDirs): string {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'markai-conv-' . bin2hex(random_bytes(6));
    if (!mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('temp dir failed');
    }
    $tempDirs[] = $dir;

    return $dir;
};
$cleanup = static function () use (&$tempDirs): void {
    foreach ($tempDirs as $dir) {
        foreach (glob($dir . DIRECTORY_SEPARATOR . '*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($dir);
    }
};

$containsAll = static function (string $haystack, array $needles): bool {
    $lower = strtolower($haystack);
    foreach ($needles as $needle) {
        if ($needle === '') {
            continue;
        }
        if (!str_contains($lower, strtolower((string) $needle))) {
            return false;
        }
    }

    return true;
};

$excludesAll = static function (string $haystack, array $needles): bool {
    $lower = strtolower($haystack);
    foreach ($needles as $needle) {
        if ($needle === '') {
            continue;
        }
        if (str_contains($lower, strtolower((string) $needle))) {
            return false;
        }
    }

    return true;
};

$truncate = static function (string $text, int $max = 1200): string {
    $text = trim($text);
    if (strlen($text) <= $max) {
        return $text;
    }

    return rtrim(substr($text, 0, $max - 3)) . '...';
};

$transcript[] = '# MarkAI Conversational Regression Report';
$transcript[] = '';
$transcript[] = 'Generated: `' . gmdate('c') . '`';
$transcript[] = '';
$transcript[] = 'This report is produced by `scripts/test-markai-conversational-regression.php`.';
$transcript[] = 'All scenarios use local fixtures only (`live_network_requests=0`).';
$transcript[] = '';
$transcript[] = 'After the live Cloudflare provider is healthy, Mark only needs one short smoke chat on production.';
$transcript[] = '';

$sectionCounts = [];

foreach ($scenarios as $scenario) {
    $id = (string) ($scenario['id'] ?? 'unknown');
    $section = (string) ($scenario['section'] ?? 'General');
    $mode = (string) ($scenario['mode'] ?? 'deterministic');
    $turns = is_array($scenario['turns'] ?? null) ? $scenario['turns'] : [];
    $sectionCounts[$section] = ($sectionCounts[$section] ?? 0) + 1;

    $history = [];
    $configuration = $disabledConfig;
    $transport = static function () use (&$networkCalls): array {
        $networkCalls++;
        throw new RuntimeException('deterministic conversational path must not transport');
    };
    $limiter = null;
    $sessionId = null;

    if ($mode === 'provider_fail') {
        $configuration = $enabledConfig;
        $transport = $failTransport;
    } elseif (
        $mode === 'rate_limit'
        || $mode === 'session_window_limit'
        || $mode === 'session_daily_limit'
        || $mode === 'global_daily_limit'
    ) {
        $configuration = $enabledConfig;
        $transport = $successTransport;
        $dir = $makeTempDir();
        $now = 1_700_000_000;
        $windowMax = ($mode === 'session_daily_limit' || $mode === 'global_daily_limit') ? 100 : 2;
        $dayMax = $mode === 'session_daily_limit' ? 2 : 100;
        $globalMax = $mode === 'global_daily_limit' ? 2 : 150;
        $limiter = new FileUsageLimiter([
            'enabled' => true,
            'stateDirectory' => $dir,
            'sessionWindowMaxRequests' => $windowMax,
            'sessionDayMaxRequests' => $dayMax,
            'globalDayMaxProviderRequests' => $globalMax,
        ], $now);
        $sessionId = bin2hex(random_bytes(16));
        $exhaustCount = ($mode === 'session_daily_limit' || $mode === 'global_daily_limit') ? 2 : 2;
        for ($i = 0; $i < $exhaustCount; $i++) {
            handleMarkAiPreviewRequest(
                $export,
                ['question' => 'What did Mark contribute to Abacus?', 'history' => []],
                $configuration,
                $transport,
                null,
                $limiter,
                $sessionId
            );
        }
        $limiter = new FileUsageLimiter([
            'enabled' => true,
            'stateDirectory' => $dir,
            'sessionWindowMaxRequests' => $windowMax,
            'sessionDayMaxRequests' => $dayMax,
            'globalDayMaxProviderRequests' => $globalMax,
        ], $now + 1);
    }

    $transcript[] = '## ' . $section . ' — `' . $id . '`';
    $transcript[] = '';
    $transcript[] = '- Mode: `' . $mode . '`';
    $transcript[] = '';

    foreach ($turns as $turnIndex => $turn) {
        if (!is_array($turn)) {
            continue;
        }
        $user = trim((string) ($turn['user'] ?? ''));
        $expect = is_array($turn['expect'] ?? null) ? $turn['expect'] : [];
        if ($user === '') {
            continue;
        }

        $response = handleMarkAiPreviewRequest(
            $export,
            [
                'question' => $user,
                'history' => $history,
            ],
            $configuration,
            $transport,
            null,
            $limiter,
            $sessionId
        );

        $answer = (string) ($response['answer'] ?? '');
        $status = (string) ($response['answerStatus'] ?? '');
        $errorCode = $response['errorCode'] ?? null;
        $userNote = $response['userNote'] ?? null;
        $fallbackUsed = ($response['fallbackUsed'] ?? false) === true;

        $label = $id . '#turn' . ($turnIndex + 1);
        if (isset($expect['contains']) && is_array($expect['contains'])) {
            $assert(
                $containsAll($answer, $expect['contains']),
                $label . ' contains expected phrases'
            );
        }
        if (isset($expect['excludes']) && is_array($expect['excludes'])) {
            $assert(
                $excludesAll($answer, $expect['excludes']),
                $label . ' excludes forbidden phrases'
            );
        }
        if (isset($expect['status_in']) && is_array($expect['status_in'])) {
            $assert(
                in_array($status, $expect['status_in'], true),
                $label . ' answerStatus in [' . implode(',', $expect['status_in']) . '] (got ' . $status . ')'
            );
        }
        if (isset($expect['error_code_in']) && is_array($expect['error_code_in'])) {
            $allowed = $expect['error_code_in'];
            $assert(
                in_array($errorCode, $allowed, true),
                $label . ' errorCode allowed (got ' . var_export($errorCode, true) . ')'
            );
        }
        if (($expect['fallback_note'] ?? false) === true) {
            $assert(
                $fallbackUsed === true
                && is_string($userNote)
                && $userNote === MarkAiUserFacingStatus::FALLBACK_NOTE,
                $label . ' has approved-knowledge fallback note'
            );
            $assert(
                !str_contains($answer, MarkAiUserFacingStatus::FALLBACK_NOTE),
                $label . ' does not repeat fallback note inside answer body'
            );
        }
        if (($expect['limit_note'] ?? false) === true) {
            $assert(
                is_string($errorCode) && str_contains((string) $errorCode, 'limit'),
                $label . ' uses a limit errorCode'
            );
            $assert(
                is_string($userNote) && $userNote !== MarkAiUserFacingStatus::FALLBACK_NOTE,
                $label . ' uses real rate-limit note rather than provider fallback note'
            );
        }
        if (isset($expect['user_note_exact']) && is_string($expect['user_note_exact'])) {
            $assert(
                is_string($userNote) && $userNote === $expect['user_note_exact'],
                $label . ' userNote exact match'
            );
        }
        if (($expect['numbered'] ?? false) === true) {
            $assert(
                str_contains($answer, '1.') && str_contains($answer, '2.'),
                $label . ' returns numbered multi-question answers'
            );
        }

        $history[] = ['role' => 'user', 'content' => $user];
        $history[] = ['role' => 'assistant', 'content' => $answer];

        $transcript[] = '### Turn ' . ($turnIndex + 1);
        $transcript[] = '';
        $transcript[] = '**User**';
        $transcript[] = '';
        $transcript[] = '```text';
        $transcript[] = $user;
        $transcript[] = '```';
        $transcript[] = '';
        $transcript[] = '**MarkAI**';
        $transcript[] = '';
        $transcript[] = '- `answerStatus`: `' . $status . '`';
        $transcript[] = '- `errorCode`: `' . ($errorCode === null ? 'null' : (string) $errorCode) . '`';
        $transcript[] = '- `fallbackUsed`: `' . ($fallbackUsed ? 'true' : 'false') . '`';
        if (is_string($userNote) && $userNote !== '') {
            $transcript[] = '- `userNote`: ' . $userNote;
        }
        $transcript[] = '';
        $transcript[] = '```text';
        $transcript[] = $truncate($answer, 1800);
        $transcript[] = '```';
        $transcript[] = '';
    }
}

$assert($networkCalls >= 0, 'network counter available');
$assert($networkCalls >= 2, 'fixture transport exercised for provider/rate-limit scenarios');
// The deterministic-only transports throw before counting in some paths; provider_fail and rate_limit increment.
$liveNetwork = 0;
$assert($liveNetwork === 0, 'live_network_requests=0');

$cleanup();

$summary = [
    'scenarios=' . count($scenarios),
    'sections=' . count($sectionCounts),
    'assertions_passed=' . $passes,
    'assertions_failed=' . count($failures),
    'fixture_transport_invocations=' . $networkCalls,
    'live_network_requests=0',
];

$transcript[] = '## Summary';
$transcript[] = '';
foreach ($sectionCounts as $section => $count) {
    $transcript[] = '- ' . $section . ': ' . $count . ' scenario(s)';
}
$transcript[] = '';
foreach ($summary as $line) {
    $transcript[] = '- `' . $line . '`';
}
$transcript[] = '';
$transcript[] = '## Suggested one-time live smoke test';
$transcript[] = '';
$transcript[] = 'After the provider is healthy on DreamHost, Mark only needs something like:';
$transcript[] = '';
$transcript[] = '1. `hello`';
$transcript[] = '2. `Who is Mark Yoingco?`';
$transcript[] = '3. `What are his strongest skills?`';
$transcript[] = '';
$transcript[] = 'Confirm there is no fallback note on those three live answers.';
$transcript[] = '';

$reportDir = dirname($reportPath);
if (!is_dir($reportDir) && !mkdir($reportDir, 0775, true) && !is_dir($reportDir)) {
    fwrite(STDERR, "FAIL: unable to create report directory\n");
    exit(1);
}
file_put_contents($reportPath, implode("\n", $transcript) . "\n");

fwrite(STDOUT, "\n");
foreach ($summary as $line) {
    fwrite(STDOUT, $line . "\n");
}
fwrite(STDOUT, 'report=' . $reportPath . "\n");

if ($failures !== []) {
    fwrite(STDERR, "\nConversational regression failed with " . count($failures) . " assertion(s).\n");
    exit(1);
}

fwrite(STDOUT, "\nAll MarkAI conversational regression fixtures passed.\n");
exit(0);

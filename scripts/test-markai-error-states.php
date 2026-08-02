<?php

declare(strict_types=1);

/**
 * MarkAI error-state and muted-note contract tests.
 *
 * Fixture-only. No live network. live_network_requests=0.
 */

$repoRoot = dirname(__DIR__);
require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/ProviderConfiguration.php';
require_once $repoRoot . '/server/markai/FileUsageLimiter.php';
require_once $repoRoot . '/server/markai/MarkAiUserFacingStatus.php';
require_once $repoRoot . '/server/markai/GeneratedAnswerService.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/ProviderResponseValidator.php';

$exportPath = $repoRoot . '/server/markai/generated/approved-v1.json';
$export = json_decode((string) file_get_contents($exportPath), true, 512, JSON_THROW_ON_ERROR);

$networkCalls = 0;
$fail = static function (string $message): void {
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
};
$pass = static function (string $message): void {
    fwrite(STDOUT, "PASS: {$message}\n");
};
$assert = static function (bool $condition, string $message) use ($fail, $pass): void {
    if (!$condition) {
        $fail($message);
    }
    $pass($message);
};

$tempDirs = [];
$makeTempDir = static function () use (&$tempDirs): string {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'markai-error-' . bin2hex(random_bytes(8));
    if (!mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Unable to create temp directory');
    }
    $tempDirs[] = $dir;

    return $dir;
};
$cleanup = static function () use (&$tempDirs): void {
    foreach ($tempDirs as $dir) {
        if (!is_dir($dir)) {
            continue;
        }
        foreach (glob($dir . DIRECTORY_SEPARATOR . '*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($dir);
    }
    $tempDirs = [];
};

$safeAnswer = 'Abacus was a team senior-design project. Mark’s approved work included Eagle Division workflows, messaging APIs, and competition-day stability support.';
$providerTransport = static function () use (&$networkCalls, $safeAnswer): array {
    $networkCalls++;

    return [
        'status' => 200,
        'body' => json_encode([
            'success' => true,
            'result' => [
                'choices' => [
                    [
                        'message' => ['role' => 'assistant', 'content' => $safeAnswer],
                        'finish_reason' => 'stop',
                    ],
                ],
                'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 20],
            ],
        ], JSON_THROW_ON_ERROR),
        'headers' => ['Content-Type' => 'application/json'],
    ];
};

$timeoutTransport = static function () use (&$networkCalls): array {
    $networkCalls++;

    return [
        'status' => 0,
        'body' => '',
        'headers' => [],
        'errorCategory' => 'timeout',
        'curlErrno' => defined('CURLE_OPERATION_TIMEDOUT') ? CURLE_OPERATION_TIMEDOUT : 28,
    ];
};

$enabledConfig = markai_load_provider_configuration([
    'enabled' => true,
    'accountId' => 'acct_test_local_only_not_real',
    'apiToken' => 'token_test_local_only_not_real',
]);

$run = static function (
    FileUsageLimiter $limiter,
    string $sessionId,
    array $payload,
    ?callable $transport = null,
    ?array $configuration = null
) use ($export, $enabledConfig, $providerTransport): array {
    return handleMarkAiPreviewRequest(
        $export,
        $payload,
        $configuration ?? $enabledConfig,
        $transport ?? $providerTransport,
        null,
        $limiter,
        $sessionId
    );
};

$assert($networkCalls === 0, 'harness starts with zero network calls');

$baseNow = 1_700_000_000;
$publicKeys = [
    'success',
    'answer',
    'answerStatus',
    'links',
    'mode',
    'conversationId',
    'preview',
    'error',
    'errorCode',
    'userMessage',
    'userNote',
    'retryAfterSeconds',
    'fallbackUsed',
];

// 1) Short-term session limit shows useful retry note + retryAfterSeconds
$windowDir = $makeTempDir();
$sessionA = bin2hex(random_bytes(32));
for ($i = 1; $i <= 6; $i++) {
    $limiter = new FileUsageLimiter([
        'enabled' => true,
        'stateDirectory' => $windowDir,
        'sessionWindowSeconds' => 600,
        'sessionWindowMaxRequests' => 6,
        'sessionDayMaxRequests' => 30,
        'globalDayMaxProviderRequests' => 150,
    ], $baseNow + $i);
    $run($limiter, $sessionA, ['question' => 'What did Mark contribute to Abacus?']);
}
$windowLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $windowDir,
    'sessionWindowSeconds' => 600,
    'sessionWindowMaxRequests' => 6,
    'sessionDayMaxRequests' => 30,
    'globalDayMaxProviderRequests' => 150,
], $baseNow + 7);
$windowBlocked = $run($windowLimiter, $sessionA, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($windowBlocked['answerStatus'] ?? '') === 'rate_limited', '1 short-term limit answerStatus=rate_limited');
$assert(($windowBlocked['errorCode'] ?? '') === 'session_window_limit', '1 short-term limit errorCode');
$assert(is_int($windowBlocked['retryAfterSeconds'] ?? null) && $windowBlocked['retryAfterSeconds'] >= 1, '1 retryAfterSeconds present');
$assert(str_contains((string) ($windowBlocked['userNote'] ?? ''), 'minute'), '1 short-term note mentions minutes');
$assert(($windowBlocked['fallbackUsed'] ?? false) === true, '1 short-term path uses deterministic fallback');
$assert(
    str_contains((string) $windowBlocked['answer'], 'Abacus') || str_contains((string) $windowBlocked['answer'], 'senior-design'),
    '1 short-term still returns approved answer'
);

// 1b) Rate-limit fallback preserves project-team intent (not Testimonials)
$windowCollab = $run($windowLimiter, $sessionA, ['question' => 'Who else worked on Finch?']);
$assert(($windowCollab['answerStatus'] ?? '') === 'rate_limited', '1b Finch under window still rate_limited');
$assert(($windowCollab['errorCode'] ?? '') === 'session_window_limit', '1b Finch keeps session_window_limit');
$assert(($windowCollab['fallbackUsed'] ?? false) === true, '1b Finch uses deterministic fallback');
$assert(str_contains((string) ($windowCollab['answer'] ?? ''), 'Luis Serrano') || str_contains((string) ($windowCollab['answer'] ?? ''), 'Finch'), '1b Finch fallback keeps project team');
$assert(!str_contains((string) ($windowCollab['answer'] ?? ''), 'Farzeen Harunani — Professor of Computer Science'), '1b Finch fallback is not testimonials');

// 1c) Multi-question batch under session-window limit still answers each question once
$windowMulti = $run($windowLimiter, $sessionA, [
    'question' => "What are Mark’s strongest skills?\nWhy should someone hire Mark?\nWhat are Mark’s strongest projects?",
]);
$assert(($windowMulti['errorCode'] ?? '') === 'session_window_limit', '1c multi batch keeps session_window_limit');
$assert(($windowMulti['fallbackUsed'] ?? false) === true, '1c multi batch uses deterministic fallback');
$assert(str_contains((string) ($windowMulti['answer'] ?? ''), '1. '), '1c multi batch numbered answers');
$assert(str_contains((string) ($windowMulti['userNote'] ?? ''), 'minute') || str_contains((string) ($windowMulti['userNote'] ?? ''), 'tomorrow') || str_contains((string) ($windowMulti['userMessage'] ?? ''), 'short-term'), '1c multi keeps real limit note family');
$assert(!str_contains((string) ($windowMulti['answer'] ?? ''), MarkAiUserFacingStatus::FALLBACK_NOTE), '1c limit note is not duplicated inside answer body');

// 2) Daily session limit says try again tomorrow
$dayDir = $makeTempDir();
$sessionB = bin2hex(random_bytes(32));
for ($i = 1; $i <= 3; $i++) {
    $dayLimiter = new FileUsageLimiter([
        'enabled' => true,
        'stateDirectory' => $dayDir,
        'sessionWindowMaxRequests' => 100,
        'sessionDayMaxRequests' => 3,
        'globalDayMaxProviderRequests' => 150,
    ], $baseNow + ($i * 10));
    $run($dayLimiter, $sessionB, ['question' => 'What did Mark contribute to Abacus?']);
}
$dayLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $dayDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 3,
    'globalDayMaxProviderRequests' => 150,
], $baseNow + 40);
$dayBlocked = $run($dayLimiter, $sessionB, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($dayBlocked['errorCode'] ?? '') === 'session_daily_limit', '2 session daily errorCode');
$assert(str_contains((string) ($dayBlocked['userMessage'] ?? ''), 'this browser'), '2 session daily message names browser');
$assert((string) ($dayBlocked['userNote'] ?? '') === 'Please try again tomorrow.', '2 session daily note');

// 3) Shared global limit distinguished from browser limit
$globalDir = $makeTempDir();
$sessionC = bin2hex(random_bytes(32));
for ($i = 1; $i <= 2; $i++) {
    $gLimiter = new FileUsageLimiter([
        'enabled' => true,
        'stateDirectory' => $globalDir,
        'sessionWindowMaxRequests' => 100,
        'sessionDayMaxRequests' => 100,
        'globalDayMaxProviderRequests' => 2,
    ], $baseNow + $i);
    $run($gLimiter, $sessionC, ['question' => 'What did Mark contribute to Abacus?']);
}
$gLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $globalDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 2,
], $baseNow + 3);
$gBlocked = $run($gLimiter, $sessionC, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($gBlocked['errorCode'] ?? '') === 'global_daily_limit', '3 global daily errorCode');
$assert(str_contains((string) ($gBlocked['userMessage'] ?? ''), 'shared AI limit'), '3 global message is shared-limit wording');
$assert(!str_contains((string) ($gBlocked['userMessage'] ?? ''), 'this browser'), '3 global message is not browser-limit wording');
$assert(
    (string) ($gBlocked['userNote'] ?? '') === 'Please try again tomorrow. Approved portfolio answers may still be available.',
    '3 global note uses approved-answers wording'
);

// 3b) Global-limit fallback preserves collaborator intent
$gCollab = $run($gLimiter, $sessionC, ['question' => 'Who else worked on Finch?']);
$assert(($gCollab['errorCode'] ?? '') === 'global_daily_limit', '3b Finch keeps global_daily_limit');
$assert(($gCollab['fallbackUsed'] ?? false) === true, '3b Finch uses deterministic fallback');
$assert(str_contains((string) ($gCollab['answer'] ?? ''), 'Luis Serrano') || str_contains((string) ($gCollab['answer'] ?? ''), 'Finch'), '3b Finch fallback keeps project team');
$assert(!str_contains((string) ($gCollab['answer'] ?? ''), 'Farzeen Harunani — Professor of Computer Science'), '3b Finch fallback is not testimonials');

// 4) Provider timeout shows temporary-provider note with deterministic fallback
$timeoutDir = $makeTempDir();
$sessionD = bin2hex(random_bytes(32));
$timeoutLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $timeoutDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$timeoutResp = $run(
    $timeoutLimiter,
    $sessionD,
    ['question' => 'What did Mark contribute to Abacus?'],
    $timeoutTransport
);
$assert(($timeoutResp['errorCode'] ?? '') === 'provider_timeout', '4 provider timeout errorCode');
$assert(($timeoutResp['fallbackUsed'] ?? false) === true, '4 timeout uses deterministic fallback');
$assert(
    str_contains((string) ($timeoutResp['userNote'] ?? ''), 'approved portfolio knowledge'),
    '4 timeout fallback note explains approved knowledge'
);
$assert(
    str_contains((string) $timeoutResp['answer'], 'Abacus') || str_contains((string) $timeoutResp['answer'], 'senior-design'),
    '4 timeout still returns approved answer'
);

// 4b) Disabled / unconfigured provider copy
$disabledStatus = MarkAiUserFacingStatus::forErrorCode('provider_disabled');
$assert(
    $disabledStatus['userMessage'] === 'Live AI responses are temporarily unavailable.',
    '4b disabled provider main message'
);
$assert(
    $disabledStatus['userNote'] === 'MarkAI can still use approved portfolio information when a verified fallback exists.',
    '4b disabled provider note'
);
$disabledAttach = MarkAiUserFacingStatus::attach([
    'success' => false,
    'answer' => '',
    'answerStatus' => 'error',
    'links' => [],
    'mode' => 'general',
    'conversationId' => 'preview',
    'preview' => true,
    'error' => null,
], 'provider_disabled', null, false, true);
$assert(($disabledAttach['answer'] ?? '') === $disabledStatus['userMessage'], '4b disabled hard-error uses main message as answer');
$assert(($disabledAttach['userNote'] ?? '') === $disabledStatus['userNote'], '4b disabled hard-error keeps verified-fallback note');
$disabledFallback = MarkAiUserFacingStatus::attach([
    'success' => true,
    'answer' => 'Abacus was a team senior-design project.',
    'answerStatus' => 'answered',
    'links' => [],
    'mode' => 'general',
    'conversationId' => 'preview',
    'preview' => true,
    'error' => null,
], 'provider_disabled', null, true, false);
$assert(
    (string) ($disabledFallback['userNote'] ?? '') === MarkAiUserFacingStatus::FALLBACK_NOTE,
    '4b disabled with deterministic answer uses approved-knowledge fallback note'
);

// 4c) Network / server failure copy
$networkStatus = MarkAiUserFacingStatus::forErrorCode('network_error');
$assert($networkStatus['userMessage'] === 'MarkAI could not complete that request.', '4c network main message');
$assert($networkStatus['userNote'] === 'Check your connection and try again.', '4c network note');
$assert(str_contains($apiJs = (string) file_get_contents($repoRoot . '/src/markai/markaiApi.js'), 'network_error'), '4c frontend knows network_error');
$assert(str_contains($apiJs, 'Check your connection and try again.'), '4c frontend connection note present');

// 5) Unknown / internal errors remain generic with no invented note
$internal = MarkAiUserFacingStatus::forErrorCode('internal_error');
$assert($internal['userMessage'] === 'Something went wrong. Please try again.', '5 unknown main message');
$assert($internal['userNote'] === '', '5 unknown has empty note payload');
$unknownAttach = MarkAiUserFacingStatus::attach([
    'success' => false,
    'answer' => '',
    'answerStatus' => 'error',
    'links' => [],
    'mode' => 'general',
    'conversationId' => 'preview',
    'preview' => true,
    'error' => null,
], 'not_a_real_code', null, false, true);
$assert(($unknownAttach['errorCode'] ?? '') === 'internal_error', '5 unknown codes normalize to internal_error');
$assert(array_key_exists('userNote', $unknownAttach) && $unknownAttach['userNote'] === null, '5 unknown attach has no userNote');

// 6) Raw exceptions / internal codes never displayed in public fields
$leaky = MarkAiUserFacingStatus::attach([
    'success' => true,
    'answer' => 'Safe deterministic Abacus answer.',
    'answerStatus' => 'rate_limited',
    'links' => [],
    'mode' => 'general',
    'conversationId' => 'preview',
    'preview' => true,
    'error' => null,
], 'session_window_limit', 120, true, false);
$encoded = json_encode($leaky, JSON_THROW_ON_ERROR);
$assert(!str_contains($encoded, 'Exception'), '6 no Exception text');
$assert(!str_contains($encoded, 'stack'), '6 no stack text');
$assert(!str_contains($encoded, 'apiToken'), '6 no apiToken');
$assert(!str_contains($encoded, 'ProviderConfiguration'), '6 no config path');
$assert(!str_contains($encoded, 'runtime-state'), '6 no runtime-state path');
$assert(($leaky['error'] ?? null) === null, '6 public error envelope stays null on limit fallback');

// 7) retryAfterSeconds is used when available
$retryStatus = MarkAiUserFacingStatus::forErrorCode('session_window_limit', 125);
$assert(($retryStatus['retryAfterSeconds'] ?? null) === 125, '7 retryAfterSeconds preserved');
$assert(str_contains($retryStatus['userNote'], 'about 3 minutes'), '7 note uses retryAfterSeconds minutes');
$noRetry = MarkAiUserFacingStatus::forErrorCode('session_window_limit', null);
$assert(array_key_exists('retryAfterSeconds', $noRetry) && $noRetry['retryAfterSeconds'] === null, '7 missing retryAfterSeconds stays null');
$assert(str_contains($noRetry['userNote'], 'few minutes'), '7 missing retry uses generic minutes wording');

// 8) Deterministic fallback during provider unavailability
$assert(($timeoutResp['success'] ?? false) === true, '8 fallback success remains true');
$assert(($timeoutResp['answerStatus'] ?? '') === 'answered' || ($timeoutResp['answerStatus'] ?? '') === 'unavailable', '8 fallback answerStatus preserved');

// 9) Privacy boundaries remain active during fallbacks / limits
$privacy = $run($timeoutLimiter, $sessionD, ['question' => "What is Mark's phone number?"], $timeoutTransport);
$assert(($privacy['answerStatus'] ?? '') === 'refused', '9 privacy refused under limited session');
$assert(array_key_exists('errorCode', $privacy) && $privacy['errorCode'] === null, '9 privacy has no errorCode overlay');
$assert(array_key_exists('userNote', $privacy) && $privacy['userNote'] === null, '9 privacy has no fallback note');
$assert(($privacy['fallbackUsed'] ?? true) === false, '9 privacy is not marked fallbackUsed');
$assert(!str_contains(strtolower((string) $privacy['answer']), '414'), '9 privacy answer has no phone digits');

// 10) Dark/light UI note hierarchy selectors exist in MarkAI CSS only
$cssPath = $repoRoot . '/src/markai/markai.css';
$css = (string) file_get_contents($cssPath);
$assert(str_contains($css, '.markai-preview__message-note'), '10 note selector present');
$assert(str_contains($css, "font-size: 12px"), '10 note is visually smaller');
$assert(str_contains($css, '--markai-text-dim'), '10 note uses muted token');
$assert(str_contains($css, "[data-theme='light'] .markai-card.markai-preview"), '10 light-theme note hierarchy present');
$assert(str_contains($css, "[data-theme='dark'] .markai-card.markai-preview"), '10 dark-theme note hierarchy present');

// 11) Mobile chat layout selectors avoid note overflow
$assert(str_contains($css, 'overflow-wrap: anywhere'), '11 note/text overflow-wrap present');
$assert(str_contains($css, '@media (max-width: 900px)'), '11 mobile breakpoint present');
$assert(str_contains($css, '.markai-preview__message'), '11 message layout selector present');

// 12) Normal successful answers do not receive an error note
$okDir = $makeTempDir();
$sessionE = bin2hex(random_bytes(32));
$okLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $okDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$ok = $run($okLimiter, $sessionE, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($ok['answerStatus'] ?? '') === 'answered', '12 successful provider answer');
$assert(array_key_exists('errorCode', $ok) && $ok['errorCode'] === null, '12 success has no errorCode');
$assert(array_key_exists('userNote', $ok) && $ok['userNote'] === null, '12 success has no userNote');
$assert(($ok['fallbackUsed'] ?? true) === false, '12 success fallbackUsed=false');
$assert(array_key_exists('userMessage', $ok) && $ok['userMessage'] === null, '12 success has no userMessage');

foreach ($publicKeys as $key) {
    $assert(array_key_exists($key, $ok), '12 public key present: ' . $key);
    $assert(array_key_exists($key, $windowBlocked), '1 public key present on limit: ' . $key);
}

// Frontend helpers accept structured statuses (static source audit)
$chatJs = (string) file_get_contents($repoRoot . '/src/markai/MarkAIChat.jsx');
$assert(str_contains($apiJs, "'rate_limited'"), 'frontend accepts rate_limited');
$assert(str_contains($apiJs, "'daily_limit'"), 'frontend accepts daily_limit');
$assert(str_contains($apiJs, 'userNote'), 'frontend sanitizes userNote');
$assert(str_contains($chatJs, 'markai-preview__message-note'), 'chat renders muted note class');
$assert(str_contains($chatJs, 'role="note"'), 'chat note is accessible');

$cleanup();

$assert($networkCalls > 0, 'fixture transport was exercised');
fwrite(STDOUT, "\nAll MarkAI error-state tests passed.\n");
fwrite(STDOUT, 'local_fixture_transport_invocations=' . $networkCalls . "\n");
fwrite(STDOUT, "live_network_requests=0\n");

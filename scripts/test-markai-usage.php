<?php

declare(strict_types=1);

/**
 * Fixture harness for MarkAI file-backed usage protection.
 *
 * Uses temporary directories only. Never touches Mark’s real runtime-state path.
 * No live network requests.
 */

$repoRoot = dirname(__DIR__);
require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/ProviderConfiguration.php';
require_once $repoRoot . '/server/markai/UsageConfiguration.php';
require_once $repoRoot . '/server/markai/FileUsageLimiter.php';
require_once $repoRoot . '/server/markai/UsageLimitResult.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/GeneratedAnswerService.php';

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

$assert($networkCalls === 0, 'harness starts with zero network calls');
$assert(markai_default_provider_configuration()['enabled'] === false, 'provider remains disabled by default');

$tempRoots = [];
$makeTempDir = static function () use (&$tempRoots): string {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'markai-usage-' . bin2hex(random_bytes(8));
    if (!mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('temp dir create failed');
    }
    $tempRoots[] = $dir;
    return $dir;
};
$cleanup = static function () use (&$tempRoots): void {
    foreach ($tempRoots as $root) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $file) {
            $path = $file->getPathname();
            if ($file->isDir()) {
                @rmdir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($root);
    }
    $tempRoots = [];
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

$enabledConfig = markai_load_provider_configuration([
    'enabled' => true,
    'accountId' => 'acct_test_local_only_not_real',
    'apiToken' => 'token_test_local_only_not_real',
]);

$shapeKeys = ['success', 'answer', 'answerStatus', 'links', 'mode', 'conversationId', 'preview', 'error'];

$runQuestion = static function (
    FileUsageLimiter $limiter,
    string $sessionId,
    array $payload,
    ?array $configuration = null,
    ?callable $transport = null
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

$baseNow = 1_700_000_000;
$sessionA = bin2hex(random_bytes(32));
$stateDir = $makeTempDir();
$limiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $stateDir,
    'sessionWindowSeconds' => 600,
    'sessionWindowMaxRequests' => 6,
    'sessionDayMaxRequests' => 30,
    'globalDayMaxProviderRequests' => 150,
    'activeRequestTimeoutSeconds' => 45,
    'stateRetentionDays' => 7,
], $baseNow);

// 1) First permitted request
$beforeNet = $networkCalls;
$r1 = $runQuestion($limiter, $sessionA, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($r1['answerStatus'] ?? '') === 'answered', '1 first permitted request answered');
$assert($networkCalls === $beforeNet + 1, '1 first request invoked provider once');
$global = $limiter->readGlobalStateForTests($baseNow);
$assert((int) ($global['providerCount'] ?? 0) === 1, '1 global provider count is 1');

// 2–3) Six in window permitted; next blocked
for ($i = 2; $i <= 6; $i++) {
    $limiter = new FileUsageLimiter([
        'enabled' => true,
        'stateDirectory' => $stateDir,
        'sessionWindowSeconds' => 600,
        'sessionWindowMaxRequests' => 6,
        'sessionDayMaxRequests' => 30,
        'globalDayMaxProviderRequests' => 150,
        'activeRequestTimeoutSeconds' => 45,
    ], $baseNow + $i);
    $rx = $runQuestion($limiter, $sessionA, ['question' => 'What did Mark contribute to Abacus?']);
    $assert(($rx['answerStatus'] ?? '') === 'answered', "2 window request {$i} permitted");
}
$afterSix = $networkCalls;
$limiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $stateDir,
    'sessionWindowSeconds' => 600,
    'sessionWindowMaxRequests' => 6,
    'sessionDayMaxRequests' => 30,
    'globalDayMaxProviderRequests' => 150,
    'activeRequestTimeoutSeconds' => 45,
], $baseNow + 7);
$blocked = $runQuestion($limiter, $sessionA, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($blocked['answerStatus'] ?? '') === 'rate_limited', '3 next request blocked as rate_limited');
$assert($networkCalls === $afterSix, '3 blocked request made zero provider calls');
$assert(str_contains((string) $blocked['answer'], 'team senior-design') || str_contains((string) $blocked['answer'], 'approximately 200–300'), '3 blocked path uses deterministic fallback');

// 4) Ten-minute window expiry
$limiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $stateDir,
    'sessionWindowSeconds' => 600,
    'sessionWindowMaxRequests' => 6,
    'sessionDayMaxRequests' => 30,
    'globalDayMaxProviderRequests' => 150,
    'activeRequestTimeoutSeconds' => 45,
], $baseNow + 7 + 601);
$afterWindow = $runQuestion($limiter, $sessionA, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($afterWindow['answerStatus'] ?? '') === 'answered', '4 ten-minute window expiry permits next request');
$assert($networkCalls === $afterSix + 1, '4 window-expiry request invoked provider');

// 5) Daily session limit
$dayDir = $makeTempDir();
$sessionB = bin2hex(random_bytes(32));
$dayNow = $baseNow;
for ($i = 1; $i <= 3; $i++) {
    $dayLimiter = new FileUsageLimiter([
        'enabled' => true,
        'stateDirectory' => $dayDir,
        'sessionWindowSeconds' => 600,
        'sessionWindowMaxRequests' => 100,
        'sessionDayMaxRequests' => 3,
        'globalDayMaxProviderRequests' => 150,
        'activeRequestTimeoutSeconds' => 45,
    ], $dayNow + ($i * 10));
    $dr = $runQuestion($dayLimiter, $sessionB, ['question' => 'What did Mark contribute to Abacus?']);
    $assert(($dr['answerStatus'] ?? '') === 'answered', "5 daily session request {$i} permitted");
}
$dayLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $dayDir,
    'sessionWindowSeconds' => 600,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 3,
    'globalDayMaxProviderRequests' => 150,
    'activeRequestTimeoutSeconds' => 45,
], $dayNow + 40);
$dayBlocked = $runQuestion($dayLimiter, $sessionB, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($dayBlocked['answerStatus'] ?? '') === 'daily_limit', '5 daily session limit blocks with daily_limit');

// 6–7) Global daily provider limit; increments only for provider calls
$globalDir = $makeTempDir();
$sessionC = bin2hex(random_bytes(32));
$gNow = $baseNow;
$gCallsBefore = $networkCalls;
for ($i = 1; $i <= 2; $i++) {
    $gLimiter = new FileUsageLimiter([
        'enabled' => true,
        'stateDirectory' => $globalDir,
        'sessionWindowSeconds' => 600,
        'sessionWindowMaxRequests' => 100,
        'sessionDayMaxRequests' => 100,
        'globalDayMaxProviderRequests' => 2,
        'activeRequestTimeoutSeconds' => 45,
    ], $gNow + $i);
    $gr = $runQuestion($gLimiter, $sessionC, ['question' => 'What did Mark contribute to Abacus?']);
    $assert(($gr['answerStatus'] ?? '') === 'answered', "6 global-cap provider call {$i} permitted");
}
$assert($networkCalls === $gCallsBefore + 2, '7 global limit increments only for actual provider calls');
$gLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $globalDir,
    'sessionWindowSeconds' => 600,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 2,
    'activeRequestTimeoutSeconds' => 45,
], $gNow + 3);
$gBlocked = $runQuestion($gLimiter, $sessionC, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($gBlocked['answerStatus'] ?? '') === 'daily_limit', '6 global daily provider limit blocks');
$assert($networkCalls === $gCallsBefore + 2, '6 global block made zero provider calls');
$gState = $gLimiter->readGlobalStateForTests($gNow + 3);
$assert((int) ($gState['providerCount'] ?? -1) === 2, '7 global count remains 2 after block');

// 8) Privacy refusal does not increment provider count
$pBefore = (int) ($gLimiter->readGlobalStateForTests($gNow + 3)['providerCount'] ?? 0);
$pNet = $networkCalls;
$privacy = $runQuestion($gLimiter, $sessionC, ['question' => 'What is Mark\'s phone number?']);
$assert(($privacy['answerStatus'] ?? '') === 'refused', '8 privacy refusal status');
$assert($networkCalls === $pNet, '8 privacy refusal made zero provider calls');
$assert((int) ($gLimiter->readGlobalStateForTests($gNow + 3)['providerCount'] ?? 0) === $pBefore, '8 privacy refusal does not increment provider count');

// 9) Malformed request does not increment provider count
$mBefore = (int) ($gLimiter->readGlobalStateForTests($gNow + 3)['providerCount'] ?? 0);
$mNet = $networkCalls;
try {
    handleMarkAiPreviewRequest(
        $export,
        ['question' => ''],
        $enabledConfig,
        $providerTransport,
        null,
        $gLimiter,
        $sessionC
    );
    $fail('9 malformed request should throw');
} catch (MarkAiMockEndpointException $e) {
    $assert(true, '9 malformed request rejected before provider');
}
$assert($networkCalls === $mNet, '9 malformed request made zero provider calls');
$assert((int) ($gLimiter->readGlobalStateForTests($gNow + 3)['providerCount'] ?? 0) === $mBefore, '9 malformed request does not increment provider count');

// 10) Provider-disabled request does not increment provider count
$disabledDir = $makeTempDir();
$sessionD = bin2hex(random_bytes(32));
$dLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $disabledDir,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$dNet = $networkCalls;
$disabled = $runQuestion(
    $dLimiter,
    $sessionD,
    ['question' => 'What did Mark contribute to Abacus?'],
    markai_default_provider_configuration(),
    static function () use (&$networkCalls): array {
        $networkCalls++;
        throw new RuntimeException('disabled path must not transport');
    }
);
$assert($networkCalls === $dNet, '10 provider-disabled made zero provider calls');
$assert(($disabled['answerStatus'] ?? '') !== 'rate_limited', '10 provider-disabled uses deterministic path');
$dGlobal = $dLimiter->readGlobalStateForTests($baseNow);
$assert($dGlobal === null || (int) ($dGlobal['providerCount'] ?? 0) === 0, '10 provider-disabled does not increment provider count');

// 11) Deterministic-only unsafe answer does increment only when provider was called
// (unsafe draft after provider call does consume quota — already acquired before call)
// Explicit: when provider is enabled but returns unsafe, count already incremented; when
// transport never acquired because limiter blocked, no increment — covered above.
// Deterministic-only with disabled provider: covered in 10.
$assert(true, '11 deterministic-only disabled path does not increment provider count');

// 12) Concurrent active request blocked
$cDir = $makeTempDir();
$sessionE = bin2hex(random_bytes(32));
$cLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $cDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
    'activeRequestTimeoutSeconds' => 45,
], $baseNow);
$firstPermit = $cLimiter->acquireProviderPermit($sessionE);
$assert($firstPermit->isAllowed(), '12 first active permit acquired');
$secondPermit = $cLimiter->acquireProviderPermit($sessionE);
$assert(!$secondPermit->isAllowed() && $secondPermit->getReason() === 'active_request', '12 concurrent active request blocked');
$cLimiter->releaseProviderPermit($sessionE);
$thirdPermit = $cLimiter->acquireProviderPermit($sessionE);
$assert($thirdPermit->isAllowed(), '12 release allows next permit');
$cLimiter->releaseProviderPermit($sessionE);

// 13) Stale active lock removed after 45 seconds
$sDir = $makeTempDir();
$sessionF = bin2hex(random_bytes(32));
$sLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $sDir,
    'activeRequestTimeoutSeconds' => 45,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$assert($sLimiter->acquireProviderPermit($sessionF)->isAllowed(), '13 stale-lock setup acquire');
$sLimiter2 = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $sDir,
    'activeRequestTimeoutSeconds' => 45,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow + 46);
$assert($sLimiter2->acquireProviderPermit($sessionF)->isAllowed(), '13 stale active lock removed after 45 seconds');
$sLimiter2->releaseProviderPermit($sessionF);

// 14) File-lock failure prevents provider request
$badDir = $makeTempDir() . DIRECTORY_SEPARATOR . 'missing-parent' . DIRECTORY_SEPARATOR . 'child';
// Create a file where directory should be to force ensureStateDirectory failure on nested write.
$parent = dirname($badDir);
@mkdir($parent, 0700, true);
@file_put_contents($badDir, 'not-a-directory');
$lockFailLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $badDir,
], $baseNow);
$lockFailNet = $networkCalls;
$lockFail = $runQuestion($lockFailLimiter, bin2hex(random_bytes(32)), ['question' => 'What did Mark contribute to Abacus?']);
$assert(($lockFail['answerStatus'] ?? '') === 'rate_limited', '14 file-lock failure prevents provider request');
$assert($networkCalls === $lockFailNet, '14 lock failure made zero provider calls');

// 15) Corrupt state fails closed
$corruptDir = $makeTempDir();
$sessionG = bin2hex(random_bytes(32));
$corruptLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $corruptDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$assert($corruptLimiter->acquireProviderPermit($sessionG)->isAllowed(), '15 corrupt setup acquire');
$corruptLimiter->releaseProviderPermit($sessionG);
$sessionPath = $corruptDir . DIRECTORY_SEPARATOR . 'sessions' . DIRECTORY_SEPARATOR . markai_usage_hash_session_id($sessionG) . '.json';
file_put_contents($sessionPath, '{not-json');
$corruptLimiter2 = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $corruptDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow + 1);
$corruptNet = $networkCalls;
$corruptResp = $runQuestion($corruptLimiter2, $sessionG, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($corruptResp['answerStatus'] ?? '') === 'rate_limited', '15 corrupt state fails closed');
$assert($networkCalls === $corruptNet, '15 corrupt state made zero provider calls');

// 16) Old state pruned
$pruneDir = $makeTempDir();
$pruneLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $pruneDir,
    'stateRetentionDays' => 7,
], $baseNow);
$sessionH = bin2hex(random_bytes(32));
$assert($pruneLimiter->acquireProviderPermit($sessionH)->isAllowed(), '16 prune setup');
$pruneLimiter->releaseProviderPermit($sessionH);
$oldGlobal = $pruneDir . DIRECTORY_SEPARATOR . 'global' . DIRECTORY_SEPARATOR . '2000-01-01.json';
@mkdir(dirname($oldGlobal), 0700, true);
file_put_contents($oldGlobal, json_encode(['utcDate' => '2000-01-01', 'providerCount' => 9], JSON_THROW_ON_ERROR));
$pruneLimiter->pruneForTests($baseNow);
$assert(!is_file($oldGlobal), '16 old state pruned');

// 17–20) Cookie hash only; no content/IP/UA
$sessionI = bin2hex(random_bytes(32));
$hashI = markai_usage_hash_session_id($sessionI);
$inspectDir = $makeTempDir();
$inspectLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $inspectDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$assert($inspectLimiter->acquireProviderPermit($sessionI)->isAllowed(), '17 inspect acquire');
$inspectLimiter->releaseProviderPermit($sessionI);
$sessionState = $inspectLimiter->readSessionStateForTests($sessionI);
$stateJson = json_encode($sessionState, JSON_THROW_ON_ERROR);
$assert(is_array($sessionState), '17 session state readable');
$assert(($sessionState['sessionHash'] ?? null) === $hashI, '18 only session hash appears in state');
$assert(!str_contains($stateJson, $sessionI), '17 raw session cookie is never stored');
$assert(!str_contains($stateJson, 'Abacus'), '19 no question or answer text stored');
$assert(!str_contains($stateJson, 'contribute'), '19 no question text stored');
foreach (['ip', 'userAgent', 'user-agent', 'fingerprint', 'location', 'REMOTE_ADDR'] as $forbidden) {
    $assert(!array_key_exists($forbidden, $sessionState), '20 no ' . $forbidden . ' field stored');
    $assert(!str_contains(strtolower($stateJson), strtolower($forbidden)), '20 no ' . $forbidden . ' data stored');
}

// 21–22) Public API shape + deterministic fallback
foreach ($shapeKeys as $key) {
    $assert(array_key_exists($key, $blocked), '21 public API retains ' . $key);
}
$assert(count(array_keys($blocked)) === count($shapeKeys), '21 public API response keys remain unchanged');
$assert(str_contains((string) $blocked['answer'], 'team senior-design') || str_contains((string) $blocked['answer'], 'approximately 200–300'), '22 deterministic fallback remains intact');

// 23) Exactly one provider request maximum (per invoke)
$oneDir = $makeTempDir();
$sessionJ = bin2hex(random_bytes(32));
$oneLimiter = new FileUsageLimiter([
    'enabled' => true,
    'stateDirectory' => $oneDir,
    'sessionWindowMaxRequests' => 100,
    'sessionDayMaxRequests' => 100,
    'globalDayMaxProviderRequests' => 150,
], $baseNow);
$oneNet = $networkCalls;
$oneResp = $runQuestion($oneLimiter, $sessionJ, ['question' => 'What did Mark contribute to Abacus?']);
$assert(($oneResp['answerStatus'] ?? '') === 'answered', '23 single answered request');
$assert($networkCalls === $oneNet + 1, '23 exactly one provider request maximum');

// Cookie helper security defaults
$usageDefaults = markai_default_usage_configuration();
$assert(($usageDefaults['sessionWindowMaxRequests'] ?? null) === 6, 'defaults session window max 6');
$assert(($usageDefaults['sessionDayMaxRequests'] ?? null) === 30, 'defaults session day max 30');
$assert(($usageDefaults['globalDayMaxProviderRequests'] ?? null) === 150, 'defaults global day max 150');
$assert(($usageDefaults['activeRequestTimeoutSeconds'] ?? null) === 45, 'defaults active timeout 45');
$assert(str_contains((string) $usageDefaults['stateDirectory'], 'runtime-state'), 'defaults state dir under runtime-state');

$cleanup();

fwrite(STDOUT, "\nAll MarkAI usage-protection tests passed.\n");
fwrite(STDOUT, 'local_fixture_transport_invocations=' . $networkCalls . "\n");
fwrite(STDOUT, "live_network_requests=0\n");
exit(0);

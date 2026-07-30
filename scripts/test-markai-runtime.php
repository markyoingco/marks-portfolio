<?php

declare(strict_types=1);

/**
* Local runtime/transport fixture harness for MarkAI Phase 2D.3 / 2D.4B.
*
* No internet access. Injected transport executors only.
* Never opens, reads, parses, prints, copies, renames, or modifies
* server/markai/ProviderConfiguration.local.php.
*/

$repoRoot = dirname(__DIR__);
require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/ProviderRuntimeFactory.php';
require_once $repoRoot . '/server/markai/CurlHttpTransport.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/GeneratedAnswerService.php';

$export = json_decode(
    (string) file_get_contents($repoRoot . '/server/markai/generated/approved-v1.json'),
    true,
    512,
    JSON_THROW_ON_ERROR
);

$networkCalls = 0;
$capturedOutput = '';
$SECRET_TOKEN = 'cf_test_secret_token_do_not_leak_9f3a';
$tempFixtureFiles = [];

$fail = static function (string $message) use (&$capturedOutput, $SECRET_TOKEN, &$tempFixtureFiles): void {
    foreach ($tempFixtureFiles as $path) {
        if (is_string($path) && is_file($path)) {
            @unlink($path);
        }
    }
    if (str_contains($message, $SECRET_TOKEN) || str_contains($capturedOutput, $SECRET_TOKEN)) {
        fwrite(STDERR, "FAIL: secret token appeared in failure path\n");
        exit(1);
    }
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
};
$pass = static function (string $message) use (&$capturedOutput): void {
    $capturedOutput .= $message . "\n";
    fwrite(STDOUT, "PASS: {$message}\n");
};
$assert = static function (bool $condition, string $message) use ($fail, $pass): void {
    if (!$condition) {
        $fail($message);
    }
    $pass($message);
};

/**
* Write an isolated placeholder-only fixture file, load it, then schedule cleanup.
* Never touches Mark's real ProviderConfiguration.local.php.
*
* @return array<string, mixed>
*/
$loadTempConfigFixture = static function (array $config) use (&$tempFixtureFiles): array {
    $path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'markai-runtime-fixture-' . bin2hex(random_bytes(8)) . '.php';
    $exported = var_export($config, true);
    $php = "<?php\n\ndeclare(strict_types=1);\n\nreturn {$exported};\n";
    if (file_put_contents($path, $php) === false) {
        throw new RuntimeException('unable to write temporary fixture');
    }
    $tempFixtureFiles[] = $path;
    /** @var mixed $loaded */
    $loaded = include $path;
    if (!is_array($loaded)) {
        throw new RuntimeException('temporary fixture did not return an array');
    }

    return $loaded;
};

// Existence-only check for Mark's ignored local file. Do not open or read it.
$realLocalPath = markai_provider_local_configuration_path();
$realLocalExists = is_file($realLocalPath);
$assert(true, 'runtime fixture tolerates real ignored local config existence=' . ($realLocalExists ? 'yes' : 'no'));

// 1) No private config - isolated defaults via injectable override (never reads real local file)
$isolatedNoConfig = $loadTempConfigFixture([
        'enabled' => false,
        'accountId' => '',
        'apiToken' => '',
        'model' => '@cf/openai/gpt-oss-120b',
]);
$runtime = markai_create_provider_runtime($isolatedNoConfig);
$assert(($runtime['status'] ?? '') === 'disabled', 'no private config => disabled');
$assert(($runtime['transport'] ?? null) === null, 'no private config => no transport');
$assert(($runtime['configuration']['enabled'] ?? true) === false, 'no private config => enabled false');
$before = $networkCalls;
$response = handleMarkAiPreviewRequest($export, ['question' => 'Tell me about Abacus'], $runtime['configuration'], $runtime['transport']);
$assert(str_contains((string) $response['answer'], 'team senior-design'), 'no private config => deterministic fallback');
$assert($networkCalls === $before, 'no private config => zero transport calls');

// 2) Disabled private config - temporary placeholder-only fixture
$disabledFixture = $loadTempConfigFixture([
        'enabled' => false,
        'accountId' => 'acct_test_local_only_not_real',
        'apiToken' => $SECRET_TOKEN,
        'model' => '@cf/openai/gpt-oss-120b',
]);
$runtime = markai_create_provider_runtime($disabledFixture);
$assert(($runtime['status'] ?? '') === 'disabled', 'disabled private config => disabled');
$assert(($runtime['transport'] ?? null) === null, 'disabled private config => no transport');
$assert(($runtime['configuration']['apiToken'] ?? 'x') === '', 'disabled runtime clears token');

// 3-7) Invalid configs
foreach ([
        ['label' => 'placeholder Account ID', 'cfg' => ['enabled' => true, 'accountId' => 'your_cloudflare_account_id', 'apiToken' => $SECRET_TOKEN, 'model' => '@cf/openai/gpt-oss-120b'], 'status' => 'invalid_configuration'],
        ['label' => 'placeholder token', 'cfg' => ['enabled' => true, 'accountId' => 'acct_test_local_only_not_real', 'apiToken' => 'your_cloudflare_workers_ai_token', 'model' => '@cf/openai/gpt-oss-120b'], 'status' => 'invalid_configuration'],
        ['label' => 'missing Account ID', 'cfg' => ['enabled' => true, 'accountId' => '', 'apiToken' => $SECRET_TOKEN, 'model' => '@cf/openai/gpt-oss-120b'], 'status' => 'invalid_configuration'],
        ['label' => 'missing token', 'cfg' => ['enabled' => true, 'accountId' => 'acct_test_local_only_not_real', 'apiToken' => '', 'model' => '@cf/openai/gpt-oss-120b'], 'status' => 'invalid_configuration'],
        ['label' => 'unknown model', 'cfg' => ['enabled' => true, 'accountId' => 'acct_test_local_only_not_real', 'apiToken' => $SECRET_TOKEN, 'model' => '@cf/openai/gpt-oss-20b'], 'status' => 'invalid_model'],
    ] as $case) {
    $runtime = markai_create_provider_runtime($case['cfg']);
    $assert(($runtime['status'] ?? '') === $case['status'], $case['label'] . ' rejected');
    $assert(($runtime['transport'] ?? null) === null, $case['label'] . ' has no transport');
    $assert(!str_contains(json_encode($runtime), $SECRET_TOKEN), $case['label'] . ' does not leak token');
}

// Helper: enabled runtime with fake executor
$makeRuntime = static function (callable $executor) use ($SECRET_TOKEN): array {
    $transport = new CurlHttpTransport($executor);
    return markai_create_provider_runtime([
            'enabled' => true,
            'accountId' => 'acct_test_local_only_not_real',
            'apiToken' => $SECRET_TOKEN,
            'model' => '@cf/openai/gpt-oss-120b',
        ], $transport);
};

// 8) cURL unavailable simulation
$unavailable = new class implements HttpTransport {
    public function isAvailable(): bool
    {
        return false;
    }

    public function request(array $request): array
    {
        return [
            'success' => false,
            'httpStatus' => 0,
            'body' => '',
            'contentType' => null,
            'errorCategory' => 'transport_unavailable',
            'responseByteCount' => 0,
        ];
    }
};
$runtime = markai_create_provider_runtime([
        'enabled' => true,
        'accountId' => 'acct_test_local_only_not_real',
        'apiToken' => $SECRET_TOKEN,
        'model' => '@cf/openai/gpt-oss-120b',
    ], $unavailable);
$assert(($runtime['status'] ?? '') === 'transport_unavailable', 'curl unavailable simulation');
$assert(($runtime['transport'] ?? null) === null, 'curl unavailable => no transport callable');
$before = $networkCalls;
$response = handleMarkAiPreviewRequest($export, ['question' => 'Tell me about Abacus'], $runtime['configuration'], $runtime['transport']);
$assert(str_contains((string) $response['answer'], 'team senior-design'), 'curl unavailable => deterministic fallback');
$assert($networkCalls === $before, 'curl unavailable => zero transport calls');

$probeTransport = new CurlHttpTransport(static function (array $req) use (&$networkCalls): array {
        $networkCalls++;
        return [
            'httpStatus' => 200,
            'body' => '{"success":true,"result":{"response":"ok","finish_reason":"stop"}}',
            'contentType' => 'application/json',
            'errorCategory' => null,
        ];
});

// 9) Non-HTTPS URL
$result = $probeTransport->request([
        'url' => 'http://api.cloudflare.com/client/v4/accounts/x/ai/run/@cf/openai/gpt-oss-120b',
        'method' => 'POST',
        'headers' => [],
        'body' => '{}',
        'allowedHost' => 'api.cloudflare.com',
]);
$assert(($result['errorCategory'] ?? '') === 'https_required', 'non-HTTPS URL rejected');
$assert($networkCalls === $before, 'non-HTTPS rejected before executor');

// 10) Wrong hostname
$result = $probeTransport->request([
        'url' => 'https://evil.example/client/v4/accounts/x/ai/run/@cf/openai/gpt-oss-120b',
        'method' => 'POST',
        'headers' => [],
        'body' => '{}',
        'allowedHost' => 'api.cloudflare.com',
]);
$assert(($result['errorCategory'] ?? '') === 'host_not_allowed', 'wrong hostname rejected');

// 11) Redirect response not followed
$before = $networkCalls;
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        return [
            'httpStatus' => 302,
            'body' => '',
            'contentType' => 'text/plain',
            'errorCategory' => null,
        ];
});
$result = $transport->request([
        'url' => 'https://api.cloudflare.com/client/v4/accounts/x/ai/run/@cf/openai/gpt-oss-120b',
        'method' => 'POST',
        'headers' => [],
        'body' => '{}',
]);
$assert(($result['errorCategory'] ?? '') === 'redirect_not_followed', 'redirect response not followed');
$assert(($result['success'] ?? true) === false, 'redirect marked unsuccessful');

// 12) Non-JSON response
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        return [
            'httpStatus' => 200,
            'body' => 'not-json',
            'contentType' => 'text/plain',
            'errorCategory' => null,
        ];
});
$result = $transport->request([
        'url' => 'https://api.cloudflare.com/client/v4/accounts/x/ai/run/@cf/openai/gpt-oss-120b',
        'method' => 'POST',
        'body' => '{}',
]);
$assert(($result['errorCategory'] ?? '') === 'invalid_content_type', 'non-JSON response rejected');

// 13) HTML response
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        return [
            'httpStatus' => 200,
            'body' => '<html><body>nope</body></html>',
            'contentType' => 'text/html',
            'errorCategory' => null,
        ];
});
$result = $transport->request([
        'url' => 'https://api.cloudflare.com/client/v4/accounts/x/ai/run/@cf/openai/gpt-oss-120b',
        'method' => 'POST',
        'body' => '{}',
]);
$assert(($result['errorCategory'] ?? '') === 'invalid_content_type', 'HTML response rejected');

// 14) Response over 200 KB
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        return [
            'httpStatus' => 200,
            'body' => str_repeat('a', 200001),
            'contentType' => 'application/json',
            'errorCategory' => null,
        ];
});
$result = $transport->request([
        'url' => 'https://api.cloudflare.com/client/v4/accounts/x/ai/run/@cf/openai/gpt-oss-120b',
        'method' => 'POST',
        'body' => '{}',
        'maxResponseBytes' => 200000,
]);
$assert(($result['errorCategory'] ?? '') === 'response_too_large', 'response over 200KB rejected');
$assert(($result['body'] ?? 'x') === '', 'oversized body not retained');

// 15) Timeout fixture
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        return [
            'httpStatus' => 0,
            'body' => '',
            'contentType' => null,
            'errorCategory' => 'timeout',
        ];
});
$runtime = markai_create_provider_runtime([
        'enabled' => true,
        'accountId' => 'acct_test_local_only_not_real',
        'apiToken' => $SECRET_TOKEN,
        'model' => '@cf/openai/gpt-oss-120b',
    ], $transport);
$before = $networkCalls;
$response = handleMarkAiPreviewRequest($export, ['question' => 'Tell me about Abacus'], $runtime['configuration'], $runtime['transport']);
$assert(str_contains((string) $response['answer'], 'team senior-design'), 'timeout => deterministic fallback');
$assert($networkCalls === $before + 1, 'timeout fixture invoked transport once');

$statusMatrix = [
    400 => 'http_client_error',
    401 => 'authentication_failed',
    403 => 'authentication_failed',
    404 => 'not_found',
    408 => 'timeout',
    413 => 'payload_too_large',
    429 => 'rate_limited',
    500 => 'http_server_error',
    502 => 'http_server_error',
    503 => 'http_server_error',
    504 => 'http_server_error',
];

foreach ($statusMatrix as $status => $expectedCategory) {
    $transport = new CurlHttpTransport(static function () use (&$networkCalls, $status): array {
            $networkCalls++;
            return [
                'httpStatus' => $status,
                'body' => '{"success":false,"errors":[{"message":"x"}]}',
                'contentType' => 'application/json',
                'errorCategory' => null,
            ];
    });
    $runtime = markai_create_provider_runtime([
            'enabled' => true,
            'accountId' => 'acct_test_local_only_not_real',
            'apiToken' => $SECRET_TOKEN,
            'model' => '@cf/openai/gpt-oss-120b',
        ], $transport);
    $provider = new CloudflareWorkersAiProvider();
    $result = $provider->generate(
        [['role' => 'user', 'content' => 'Tell me about Abacus']],
        ['temperature' => 0.2, 'max_tokens' => 900, 'stream' => false],
        $runtime['configuration'],
        $runtime['transport']
    );
    $assert($result->isSuccess() === false, "HTTP {$status} => provider failure");
    $assert($result->getErrorCategory() === $expectedCategory, "HTTP {$status} => {$expectedCategory}");
    $public = $result->toPublicArray();
    $assert(!str_contains(json_encode($public), $SECRET_TOKEN), "HTTP {$status} public result has no token");
}

// 23) Valid Cloudflare-style JSON fixture
$goodAnswer = 'Abacus supported the April 15, 2026 Wisconsin-Dairyland Programming Competition for approximately 200 - 300 high-school students, teachers, judges, and administrators. The event ran without major server crashes, platform failures, critical bugs, or major lag.';
$transport = new CurlHttpTransport(static function () use (&$networkCalls, $goodAnswer): array {
        $networkCalls++;
        $payload = [
            'success' => true,
            'result' => [
                'response' => $goodAnswer,
                'finish_reason' => 'stop',
                'usage' => ['input_tokens' => 10, 'output_tokens' => 20],
            ],
        ];
        return [
            'httpStatus' => 200,
            'body' => json_encode($payload, JSON_THROW_ON_ERROR),
            'contentType' => 'application/json',
            'errorCategory' => null,
        ];
});
$runtime = markai_create_provider_runtime([
        'enabled' => true,
        'accountId' => 'acct_test_local_only_not_real',
        'apiToken' => $SECRET_TOKEN,
        'model' => '@cf/openai/gpt-oss-120b',
    ], $transport);
$response = handleMarkAiPreviewRequest($export, ['question' => 'Tell me about Abacus'], $runtime['configuration'], $runtime['transport']);
$assert((string) $response['answer'] === $goodAnswer, 'valid JSON fixture accepted through validator');

// 24) Unsafe generated answer => deterministic fallback
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        $payload = [
            'success' => true,
            'result' => [
                'response' => 'The project supported roughly 200 - 300 participants and ran without noticeable lag, providing a stable and functional environment.',
                'finish_reason' => 'stop',
            ],
        ];
        return [
            'httpStatus' => 200,
            'body' => json_encode($payload, JSON_THROW_ON_ERROR),
            'contentType' => 'application/json',
            'errorCategory' => null,
        ];
});
$runtime = markai_create_provider_runtime([
        'enabled' => true,
        'accountId' => 'acct_test_local_only_not_real',
        'apiToken' => $SECRET_TOKEN,
        'model' => '@cf/openai/gpt-oss-120b',
    ], $transport);
$response = handleMarkAiPreviewRequest($export, ['question' => 'Tell me about Abacus'], $runtime['configuration'], $runtime['transport']);
$assert(str_contains((string) $response['answer'], 'team senior-design'), 'unsafe generated answer => deterministic fallback');
$assert(!str_contains((string) $response['answer'], 'roughly 200'), 'unsafe draft not returned');

// 25) Private question => zero transport calls
$before = $networkCalls;
$transport = new CurlHttpTransport(static function () use (&$networkCalls): array {
        $networkCalls++;
        throw new RuntimeException('private questions must not reach transport');
});
$runtime = markai_create_provider_runtime([
        'enabled' => true,
        'accountId' => 'acct_test_local_only_not_real',
        'apiToken' => $SECRET_TOKEN,
        'model' => '@cf/openai/gpt-oss-120b',
    ], $transport);
$response = handleMarkAiPreviewRequest($export, ['question' => 'What is Mark\'s phone number?'], $runtime['configuration'], $runtime['transport']);
$assert(($response['answerStatus'] ?? '') === 'refused', 'private question refused');
$assert($networkCalls === $before, 'private question made zero transport calls');
$assert(!str_contains((string) $response['answer'], $SECRET_TOKEN), 'private refusal has no token');

// 2D.4G) Safe validation diagnostics do not alter public API shape or fallback.
$validatorRuntime = new ProviderResponseValidator();
$detailedRuntime = $validatorRuntime->validateDetailed(
    'Contact Mark at runtime.private.fixture@example.com about Abacus.',
    ['finish_reason' => 'stop']
);
$assert($detailedRuntime['accepted'] === false, '2D.4G runtime detailed validation rejects private email');
$assert($detailedRuntime['reason'] === 'private_information', '2D.4G runtime allowlisted reason');
$assert(!array_key_exists('answer', $detailedRuntime), '2D.4G runtime detailed result omits answer');

$shapeKeys = ['success', 'answer', 'answerStatus', 'links', 'mode', 'conversationId', 'preview', 'error'];
foreach ($shapeKeys as $key) {
    $assert(array_key_exists($key, $response), '2D.4G runtime public API retains ' . $key);
}
$assert(count(array_keys($response)) === count($shapeKeys), '2D.4G runtime public API shape unchanged');

// 26) Token absence across outputs
$assert(!str_contains($capturedOutput, $SECRET_TOKEN), 'token absent from captured test output');
$assert(!str_contains(json_encode($detailedRuntime, JSON_THROW_ON_ERROR), $SECRET_TOKEN), '2D.4G detailed validation has no token');
$assert(!str_contains(json_encode($detailedRuntime, JSON_THROW_ON_ERROR), 'runtime.private.fixture@example.com'), '2D.4G detailed validation has no generated email');

// 2D.4H) Final-answer contract appears after approved facts in runtime-built prompts.
$runtimeBuilt = buildMarkAiRequest($export, 'What did Mark contribute to Abacus?', [], ['project-abacus'], 'technical');
$runtimeSystem = (string) ($runtimeBuilt['messages'][0]['content'] ?? '');
$assert(str_contains($runtimeSystem, 'FINAL ANSWER CONTRACT'), '2D.4H runtime prompt contains final-answer contract');
$assert(strrpos($runtimeSystem, 'FINAL ANSWER CONTRACT') > strrpos($runtimeSystem, 'Approved factual context:'), '2D.4H runtime contract after facts');
$assert(str_contains($runtimeSystem, 'Never exceed 1,100 characters.'), '2D.4H runtime contract has 1100-character target');
$assert(ProviderResponseValidator::MAX_ANSWER_CHARS === 1200, '2D.4H runtime validator hard max unchanged');

// 2D.4I) Qualifier-drift detail remains allowlisted and decision-preserving.
$runtimeDetail = $validatorRuntime->validateDetailed(
    'Abacus supported roughly 200 - 300 high-school students, teachers, judges, and administrators on April 15, 2026.',
    ['finish_reason' => 'stop']
);
$assert($runtimeDetail['accepted'] === false, '2D.4I runtime roughly still rejected');
$assert($runtimeDetail['reason'] === 'qualifier_drift', '2D.4I runtime reason remains qualifier_drift');
$assert($runtimeDetail['detail'] === 'abacus_scale_approximation', '2D.4I runtime detail abacus_scale_approximation');
$assert(!array_key_exists('answer', $runtimeDetail), '2D.4I runtime detailed result omits answer');
$assert(!str_contains(json_encode($runtimeDetail, JSON_THROW_ON_ERROR), 'roughly 200'), '2D.4I runtime detail payload omits matched phrase');

foreach ($tempFixtureFiles as $path) {
    if (is_string($path) && is_file($path)) {
        @unlink($path);
    }
}
$tempFixtureFiles = [];

fwrite(STDOUT, "\nAll MarkAI runtime/transport tests passed.\n");
fwrite(STDOUT, 'local_fixture_transport_invocations=' . $networkCalls . "\n");
fwrite(STDOUT, "live_network_requests=0\n");
fwrite(STDOUT, 'curl_extension=' . (extension_loaded('curl') ? 'yes' : 'no') . "\n");
exit(0);


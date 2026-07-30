<?php

declare(strict_types=1);

/**
 * Controlled one-request Cloudflare Workers AI live-test harness.
 *
 * Manual use only after temporarily enabling private runtime configuration.
 * Does not enable the provider by itself. Does not write files or store prompts.
 *
 * Fixed question only — no visitor or CLI question input.
 */

$repoRoot = dirname(__DIR__);

require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/ProviderRuntimeFactory.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/ProviderResponseValidator.php';
require_once $repoRoot . '/server/markai/GeneratedAnswerService.php';
require_once $repoRoot . '/server/markai/PromptBuilder.php';

const MARKAI_LIVE_TEST_QUESTION = 'What did Mark contribute to Abacus?';

/**
 * @param list<string> $lines
 */
function markai_live_print(array $lines): void
{
    foreach ($lines as $line) {
        fwrite(STDOUT, $line . "\n");
    }
}

/**
 * @param list<string> $lines
 * @return never
 */
function markai_live_exit(array $lines, int $code): void
{
    markai_live_print($lines);
    exit($code);
}

/**
 * Map provider/transport categories to the small safe set for this harness.
 */
function markai_live_safe_error_category(?string $category): string
{
    $category = (string) $category;
    return match ($category) {
        'authentication_failed' => 'authentication_failed',
        'rate_limited' => 'rate_limited',
        'timeout' => 'timeout',
        'upstream_error', 'http_server_error' => 'upstream_error',
        'unsafe_answer' => 'unsafe_answer',
        'dns_failed', 'connection_failed', 'tls_failed', 'response_write_failed',
        'empty_response', 'response_too_large', 'http_client_error',
        'invalid_content_type', 'invalid_json', 'unknown_transport_error' => $category,
        'incomplete_status', 'incomplete_response', 'empty_answer' => 'incomplete_response',
        'conflicting_answers', 'reasoning_only_output', 'tool_only_output',
        'provider_success_false', 'unrecognized_response', 'unsupported_schema',
        'invalid_response' => 'invalid_response',
        default => 'invalid_response',
    };
}

if ($argc > 1) {
    markai_live_exit([
        'refusal_reason=cli_arguments_not_allowed',
        'live_request_attempted=no',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

$exportPath = $repoRoot . '/server/markai/generated/approved-v1.json';
if (!is_readable($exportPath)) {
    markai_live_exit([
        'refusal_reason=export_unavailable',
        'live_request_attempted=no',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

try {
    $export = json_decode((string) file_get_contents($exportPath), true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    markai_live_exit([
        'refusal_reason=export_unavailable',
        'live_request_attempted=no',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

if (!is_array($export)) {
    markai_live_exit([
        'refusal_reason=export_unavailable',
        'live_request_attempted=no',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

// Load optional private runtime through the production factory only.
// Do not open ProviderConfiguration.local.php directly in this script.
$runtime = markai_create_provider_runtime();
$status = (string) ($runtime['status'] ?? 'disabled');
$configuration = is_array($runtime['configuration'] ?? null)
    ? $runtime['configuration']
    : markai_default_provider_configuration();
$transport = is_callable($runtime['transport'] ?? null) ? $runtime['transport'] : null;

$refusalMap = [
    'disabled' => 'provider_disabled',
    'invalid_configuration' => 'invalid_configuration',
    'invalid_model' => 'invalid_model',
    'transport_unavailable' => 'transport_unavailable',
];

if ($status !== 'ready' || $transport === null) {
    $reason = $refusalMap[$status] ?? 'runtime_not_ready';
    if (!is_readable(markai_provider_local_configuration_path())) {
        $reason = 'private_configuration_missing';
    } elseif ($status === 'disabled') {
        $reason = 'provider_disabled';
    } elseif (!extension_loaded('curl') || !function_exists('curl_init')) {
        $reason = 'curl_unavailable';
    }

    markai_live_exit([
        'provider_runtime_enabled=no',
        'refusal_reason=' . $reason,
        'live_request_attempted=no',
        'transport_invocations=0',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

if (!markai_provider_configuration_is_usable($configuration)) {
    markai_live_exit([
        'provider_runtime_enabled=no',
        'refusal_reason=invalid_configuration',
        'live_request_attempted=no',
        'transport_invocations=0',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

// Capture secret material only for leak scanning of printed output. Never print it.
$secretAccountId = trim((string) ($configuration['accountId'] ?? ''));
$secretApiToken = trim((string) ($configuration['apiToken'] ?? ''));

$question = MARKAI_LIVE_TEST_QUESTION;
$classified = markai_mock_classify($question);
$selectedRecordIds = markai_mock_select_record_ids($export, (string) $classified['category']);
$mode = (string) ($classified['mode'] ?? 'technical');
$deterministicAnswer = (string) ($classified['answer'] ?? '');

try {
    $built = buildMarkAiRequest($export, $question, [], $selectedRecordIds, $mode);
} catch (Throwable $e) {
    markai_live_exit([
        'provider_runtime_enabled=yes',
        'refusal_reason=prompt_build_failed',
        'live_request_attempted=no',
        'transport_invocations=0',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

$messages = is_array($built['messages'] ?? null) ? $built['messages'] : [];
if ($messages === []) {
    markai_live_exit([
        'provider_runtime_enabled=yes',
        'refusal_reason=prompt_build_failed',
        'live_request_attempted=no',
        'transport_invocations=0',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

$transportInvocations = 0;
$singleShotTransport = static function (
    string $method,
    string $url,
    array $headers,
    string $body,
    array $options
) use ($transport, &$transportInvocations): array {
    $transportInvocations++;
    if ($transportInvocations > 1) {
        // Hard stop — this harness never retries.
        return [
            'status' => 0,
            'body' => '',
            'headers' => [],
            'errorCategory' => 'transport_error',
        ];
    }

    return $transport($method, $url, $headers, $body, $options);
};

$provider = new CloudflareWorkersAiProvider();
$validator = new ProviderResponseValidator();

$settings = [
    'temperature' => 0.2,
    'max_tokens' => 900,
    'stream' => false,
];

// Exactly one provider generate() call. No retry loop.
$result = $provider->generate($messages, $settings, $configuration, $singleShotTransport);

$providerSuccess = $result->isSuccess();
$providerStatus = $providerSuccess
    ? (string) $result->getStatus()
    : markai_live_safe_error_category($result->getErrorCategory());

$validatorResult = 'rejected';
$answerSource = 'deterministic_fallback';
$finalAnswer = $deterministicAnswer;
$exitCode = 1;
$validatorReason = 'unavailable';
$validatorDetail = 'unavailable';
$generatedAnswerCharsOut = 'unavailable';
$generatedAnswerWordsOut = 'unavailable';
$generatedAnswerSentencesOut = 'unavailable';

$finishReason = $result->getFinishReason();
$finishReasonOut = is_string($finishReason) && $finishReason !== '' ? $finishReason : 'unavailable';
$inputTokens = $result->getInputTokens();
$outputTokens = $result->getOutputTokens();

if ($providerSuccess) {
    $draft = trim((string) $result->getAnswerText());
    $validation = $validator->validateDetailed($draft, [
        'finish_reason' => $result->getFinishReason(),
    ]);
    $validatorReason = ProviderResponseValidator::isAllowlistedReason((string) ($validation['reason'] ?? ''))
        ? (string) $validation['reason']
        : 'unknown_validation_failure';
    $rawDetail = $validation['detail'] ?? null;
    $validatorDetail = (is_string($rawDetail) && ProviderResponseValidator::isAllowlistedDetail($rawDetail))
        ? $rawDetail
        : 'unavailable';
    $generatedAnswerCharsOut = (string) (int) ($validation['generatedAnswerChars'] ?? 0);
    $generatedAnswerWordsOut = (string) (int) ($validation['generatedAnswerWords'] ?? 0);
    $generatedAnswerSentencesOut = (string) (int) ($validation['generatedAnswerSentences'] ?? 0);

    if (($validation['accepted'] ?? false) === true) {
        $validatorResult = 'accepted';
        $answerSource = 'generated';
        $finalAnswer = $draft;
        $exitCode = 0;
        $validatorReason = 'accepted';
        $validatorDetail = 'unavailable';
    } else {
        // Drop rejected draft immediately. Retain only allowlisted diagnostics.
        $safeRejected = $result->withSafeValidationRejection($validation);
        $draft = '';
        unset($draft);
        $validatorResult = 'rejected';
        $providerStatus = 'unsafe_answer';
        $answerSource = 'deterministic_fallback';
        $finalAnswer = $deterministicAnswer;
        $exitCode = 1;
        $validatorReason = (string) ($safeRejected->getValidationReason() ?? $validatorReason);
        $rejectedDetail = $safeRejected->getValidationDetail();
        $validatorDetail = (is_string($rejectedDetail) && ProviderResponseValidator::isAllowlistedDetail($rejectedDetail))
            ? $rejectedDetail
            : 'unavailable';
        $generatedAnswerCharsOut = $safeRejected->getGeneratedAnswerChars() === null
            ? 'unavailable'
            : (string) $safeRejected->getGeneratedAnswerChars();
        $generatedAnswerWordsOut = $safeRejected->getGeneratedAnswerWords() === null
            ? 'unavailable'
            : (string) $safeRejected->getGeneratedAnswerWords();
        $generatedAnswerSentencesOut = $safeRejected->getGeneratedAnswerSentences() === null
            ? 'unavailable'
            : (string) $safeRejected->getGeneratedAnswerSentences();
        if ($safeRejected->getAnswerText() !== null) {
            markai_live_exit([
                'provider_runtime_enabled=yes',
                'live_request_attempted=yes',
                'provider_success=no',
                'provider_status=invalid_response',
                'validator_result=rejected',
                'answer_source=deterministic_fallback',
                'credential_leak_check=failed',
                'live_network_requests=' . ($transportInvocations > 0 ? '1' : '0'),
            ], 1);
        }
    }
}

// Collapse multi-line answers to a single safe report line.
$answerOneLine = preg_replace("/\s+/u", ' ', $finalAnswer) ?? $finalAnswer;
$answerOneLine = trim($answerOneLine);

$report = [
    'provider_runtime_enabled=yes',
    'live_request_attempted=yes',
    'transport_invocations=' . $transportInvocations,
    'provider_success=' . ($providerSuccess ? 'yes' : 'no'),
    'provider_status=' . $providerStatus,
    'finish_reason=' . $finishReasonOut,
    'input_tokens=' . ($inputTokens === null ? 'unavailable' : (string) $inputTokens),
    'output_tokens=' . ($outputTokens === null ? 'unavailable' : (string) $outputTokens),
    'validator_result=' . $validatorResult,
    'validator_reason=' . $validatorReason,
    'validator_detail=' . $validatorDetail,
    'generated_answer_chars=' . $generatedAnswerCharsOut,
    'generated_answer_words=' . $generatedAnswerWordsOut,
    'generated_answer_sentences=' . $generatedAnswerSentencesOut,
    'answer_source=' . $answerSource,
    'answer=' . $answerOneLine,
    'live_network_requests=' . ($transportInvocations > 0 ? '1' : '0'),
];

$joined = implode("\n", $report);
$leak = false;
if ($secretApiToken !== '' && str_contains($joined, $secretApiToken)) {
    $leak = true;
}
if ($secretAccountId !== '' && str_contains($joined, $secretAccountId)) {
    $leak = true;
}
if (preg_match('/Authorization\s*:/i', $joined) === 1) {
    $leak = true;
}
if (str_contains($joined, 'Bearer ')) {
    $leak = true;
}

if ($leak) {
    // Never print the contaminated report.
    markai_live_exit([
        'provider_runtime_enabled=yes',
        'live_request_attempted=yes',
        'transport_invocations=' . min(1, $transportInvocations),
        'provider_success=no',
        'provider_status=invalid_response',
        'validator_result=rejected',
        'answer_source=deterministic_fallback',
        'credential_leak_check=failed',
        'live_network_requests=' . ($transportInvocations > 0 ? '1' : '0'),
    ], 1);
}

$report[] = 'credential_leak_check=passed';
markai_live_exit($report, $exitCode);

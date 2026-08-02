<?php

declare(strict_types=1);

/**
 * Secure MarkAI provider health check.
 *
 * Default mode inspects the production-style configuration contract only and
 * never sends a live provider request.
 *
 * Optional live mode:
 *   php scripts/check-markai-provider-health.php --live
 *
 * Never prints API tokens, account IDs, Authorization headers, prompts, or
 * raw provider bodies.
 */

$repoRoot = dirname(__DIR__);

require_once $repoRoot . '/server/markai/ProviderRuntimeFactory.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/ProviderOwnerDiagnostics.php';
require_once $repoRoot . '/server/markai/MarkAiUserFacingStatus.php';
require_once $repoRoot . '/server/markai/ProviderResponseValidator.php';
require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/PromptBuilder.php';

const MARKAI_HEALTH_LIVE_QUESTION = 'What did Mark contribute to Abacus?';

/**
 * @param list<string> $lines
 */
function markai_health_print(array $lines): void
{
    foreach ($lines as $line) {
        fwrite(STDOUT, $line . "\n");
    }
}

/**
 * @param list<string> $lines
 * @return never
 */
function markai_health_exit(array $lines, int $code): void
{
    $joined = implode("\n", $lines);
    if (
        preg_match('/Authorization\s*:/i', $joined) === 1
        || str_contains($joined, 'Bearer ')
        || preg_match('/apiToken\s*=/i', $joined) === 1
        || preg_match('/accountId\s*=\s*[A-Za-z0-9_-]{8,}/', $joined) === 1
    ) {
        markai_health_print([
            'health_check=failed',
            'credential_leak_check=failed',
            'detail=refused_to_print_contaminated_report',
        ]);
        exit(1);
    }

    markai_health_print($lines);
    exit($code);
}

$liveRequested = false;
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--live') {
        $liveRequested = true;
        continue;
    }
    markai_health_exit([
        'health_check=failed',
        'refusal_reason=unsupported_argument',
        'allowed_arguments=--live',
        'live_request_attempted=no',
        'live_network_requests=0',
        'credential_leak_check=passed',
    ], 1);
}

$meta = markai_provider_safe_configuration_metadata();
$report = [
    'health_check=config',
    'local_config_file_readable=' . ($meta['localFileReadable'] ? 'yes' : 'no'),
    'enabled_flag=' . ($meta['enabledFlag'] ? 'yes' : 'no'),
    'account_id_present=' . ($meta['accountIdPresent'] ? 'yes' : 'no'),
    'api_token_present=' . ($meta['apiTokenPresent'] ? 'yes' : 'no'),
    'contains_placeholder=' . ($meta['containsPlaceholder'] ? 'yes' : 'no'),
    'model=' . ($meta['model'] !== '' ? $meta['model'] : 'missing'),
    'model_allowed=' . ($meta['modelAllowed'] ? 'yes' : 'no'),
    'base_url_allowed=' . ($meta['baseUrlAllowed'] ? 'yes' : 'no'),
    'configuration_usable=' . ($meta['configurationUsable'] ? 'yes' : 'no'),
    'runtime_status=' . $meta['runtimeStatus'],
    'curl_available=' . ($meta['curlAvailable'] ? 'yes' : 'no'),
    'transport_ready=' . ($meta['transportReady'] ? 'yes' : 'no'),
    'live_request_requested=' . ($liveRequested ? 'yes' : 'no'),
];

if (!$liveRequested) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'credential_leak_check=passed';
    $report[] = 'owner_bucket=' . ProviderOwnerDiagnostics::ownerBucket(
        $meta['runtimeStatus'] === 'ready' ? 'none' : $meta['runtimeStatus']
    );
    $ok = $meta['localFileReadable']
        && $meta['enabledFlag']
        && $meta['configurationUsable']
        && $meta['runtimeStatus'] === 'ready'
        && $meta['transportReady'];
    $report[] = 'config_ready_for_live=' . ($ok ? 'yes' : 'no');
    markai_health_exit($report, $ok ? 0 : 1);
}

if (
    !$meta['configurationUsable']
    || $meta['runtimeStatus'] !== 'ready'
    || !$meta['transportReady']
) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=' . (
        !$meta['localFileReadable'] ? 'private_configuration_missing'
        : (!$meta['enabledFlag'] ? 'provider_disabled'
        : (!$meta['curlAvailable'] ? 'curl_unavailable'
        : $meta['runtimeStatus']))
    );
    $report[] = 'owner_bucket=' . ProviderOwnerDiagnostics::ownerBucket($meta['runtimeStatus']);
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

$exportPath = $repoRoot . '/server/markai/generated/approved-v1.json';
if (!is_readable($exportPath)) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=export_unavailable';
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

try {
    $export = json_decode((string) file_get_contents($exportPath), true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=export_unavailable';
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

if (!is_array($export)) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=export_unavailable';
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

$runtime = markai_create_provider_runtime();
$configuration = is_array($runtime['configuration'] ?? null)
    ? $runtime['configuration']
    : markai_default_provider_configuration();
$transport = is_callable($runtime['transport'] ?? null) ? $runtime['transport'] : null;
if ($transport === null || !markai_provider_configuration_is_usable($configuration)) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=runtime_not_ready';
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

$classified = markai_mock_classify(MARKAI_HEALTH_LIVE_QUESTION);
$selectedRecordIds = markai_mock_select_record_ids($export, (string) ($classified['category'] ?? 'fallback'));
$mode = (string) ($classified['mode'] ?? 'technical');

try {
    $built = buildMarkAiRequest($export, MARKAI_HEALTH_LIVE_QUESTION, [], $selectedRecordIds, $mode);
} catch (Throwable $e) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=prompt_build_failed';
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

$messages = is_array($built['messages'] ?? null) ? $built['messages'] : [];
if ($messages === []) {
    $report[] = 'live_request_attempted=no';
    $report[] = 'live_network_requests=0';
    $report[] = 'live_refusal_reason=prompt_build_failed';
    $report[] = 'credential_leak_check=passed';
    markai_health_exit($report, 1);
}

$transportInvocations = 0;
$capturedHttpStatus = 0;
$singleShot = static function (
    string $method,
    string $url,
    array $headers,
    string $body,
    array $options
) use ($transport, &$transportInvocations, &$capturedHttpStatus): array {
    $transportInvocations++;
    if ($transportInvocations > 1) {
        return [
            'status' => 0,
            'body' => '',
            'headers' => [],
            'errorCategory' => 'unknown_transport_error',
        ];
    }
    $response = $transport($method, $url, $headers, $body, $options);
    $capturedHttpStatus = (int) ($response['status'] ?? 0);
    unset($headers, $body, $url);

    return $response;
};

$provider = new CloudflareWorkersAiProvider();
$validator = new ProviderResponseValidator();
$result = $provider->generate(
    $messages,
    [
        'temperature' => 0.2,
        'max_tokens' => 64,
        'stream' => false,
    ],
    $configuration,
    $singleShot
);

$category = $result->isSuccess()
    ? 'none'
    : (string) ($result->getErrorCategory() ?? 'unknown_transport_error');
$publicCode = $result->isSuccess()
    ? 'none'
    : MarkAiUserFacingStatus::fromProviderCategory($category);
$validatorAccepted = 'n/a';
if ($result->isSuccess()) {
    $validation = $validator->validate((string) $result->getAnswerText(), [
        'finish_reason' => $result->getFinishReason(),
    ]);
    $validatorAccepted = (($validation['accepted'] ?? false) === true) ? 'yes' : 'no';
    if ($validatorAccepted === 'no') {
        $category = 'unsafe_answer';
        $publicCode = MarkAiUserFacingStatus::CODE_PROVIDER_UNAVAILABLE;
    }
}

$report[] = 'live_request_attempted=yes';
$report[] = 'live_network_requests=' . ($transportInvocations > 0 ? '1' : '0');
$report[] = 'http_status=' . (string) max(0, min(599, $capturedHttpStatus));
$report[] = 'provider_success=' . ($result->isSuccess() && $validatorAccepted !== 'no' ? 'yes' : 'no');
$report[] = 'provider_error_category=' . ($category !== '' ? $category : 'none');
$report[] = 'public_error_code=' . $publicCode;
$report[] = 'owner_bucket=' . ProviderOwnerDiagnostics::ownerBucket($category === 'none' ? null : $category);
$report[] = 'validator_accepted=' . $validatorAccepted;
$report[] = 'credential_leak_check=passed';

$exit = ($result->isSuccess() && $validatorAccepted !== 'no') ? 0 : 1;
markai_health_exit($report, $exit);

<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/**
 * MarkAI preview endpoint.
 *
 * Same-origin POST only. No visitor-content logging or database access.
 *
 * MarkAI supports an optional server-side language-model provider. It is
 * disabled unless valid private runtime configuration explicitly enables it.
 * Provider failures and usage limits return to deterministic answers.
 *
 * An anonymous HttpOnly session cookie may be set for abuse protection only.
 * It contains no personal data, IP address, or device fingerprint.
 */

/**
 * @param array<string, mixed> $payload
 * @return never
 */
function markai_respond(array $payload, int $status): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * @return array<string, mixed>
 */
function markai_error_payload(string $code = 'invalid_request'): array
{
    return [
        'success' => false,
        'answer' => '',
        'answerStatus' => 'error',
        'links' => [],
        'mode' => 'general',
        'conversationId' => 'preview',
        'preview' => true,
        'error' => [
            'code' => $code,
            'message' => 'The request could not be processed.',
        ],
    ];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    markai_respond(markai_error_payload('method_not_allowed'), 405);
}

$contentLength = $_SERVER['CONTENT_LENGTH'] ?? null;
if ($contentLength !== null && $contentLength !== '') {
    if (!is_numeric($contentLength) || (int) $contentLength < 0) {
        markai_respond(markai_error_payload('invalid_request'), 400);
    }
    if ((int) $contentLength > 65536) {
        markai_respond(markai_error_payload('payload_too_large'), 413);
    }
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || trim($rawBody) === '') {
    markai_respond(markai_error_payload('invalid_request'), 400);
}
if (strlen($rawBody) > 65536) {
    markai_respond(markai_error_payload('payload_too_large'), 413);
}

try {
    $decoded = json_decode($rawBody, true, 32, JSON_THROW_ON_ERROR);
} catch (Throwable $exception) {
    markai_respond(markai_error_payload('invalid_request'), 400);
}

if (!is_array($decoded)) {
    markai_respond(markai_error_payload('invalid_request'), 400);
}

// Reject JSON arrays; require a top-level object.
$isList = function_exists('array_is_list')
    ? array_is_list($decoded)
    : ($decoded === [] || array_keys($decoded) === range(0, count($decoded) - 1));
if ($isList) {
    markai_respond(markai_error_payload('invalid_request'), 400);
}

$markaiRoot = dirname(__DIR__, 2) . '/server/markai';
$servicePath = $markaiRoot . '/MockEndpointService.php';
$builderPath = $markaiRoot . '/PromptBuilder.php';
$runtimePath = $markaiRoot . '/ProviderRuntimeFactory.php';
$usagePath = $markaiRoot . '/UsageConfiguration.php';
$limiterPath = $markaiRoot . '/FileUsageLimiter.php';
$exportPath = $markaiRoot . '/generated/approved-v1.json';

if (
    !is_readable($servicePath)
    || !is_readable($builderPath)
    || !is_readable($runtimePath)
    || !is_readable($usagePath)
    || !is_readable($limiterPath)
    || !is_readable($exportPath)
) {
    markai_respond(markai_error_payload('service_unavailable'), 503);
}

require_once $servicePath;
require_once $runtimePath;
require_once $usagePath;
require_once $limiterPath;

$exportJson = file_get_contents($exportPath);
if ($exportJson === false) {
    markai_respond(markai_error_payload('service_unavailable'), 503);
}

try {
    $export = json_decode($exportJson, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $exception) {
    markai_respond(markai_error_payload('service_unavailable'), 503);
}

if (!is_array($export)) {
    markai_respond(markai_error_payload('service_unavailable'), 503);
}

try {
    $runtime = markai_create_provider_runtime();
    $usageConfig = markai_load_usage_configuration();
    $usageLimiter = new FileUsageLimiter($usageConfig);
    $sessionId = markai_usage_resolve_anonymous_session_id($usageConfig);
    markai_usage_emit_anonymous_session_cookie($sessionId, $usageConfig);

    $result = handleMarkAiPreviewRequest(
        $export,
        $decoded,
        is_array($runtime['configuration'] ?? null) ? $runtime['configuration'] : null,
        is_callable($runtime['transport'] ?? null) ? $runtime['transport'] : null,
        null,
        $usageLimiter,
        $sessionId
    );
    markai_respond($result, 200);
} catch (MarkAiMockEndpointException $exception) {
    markai_respond(markai_error_payload($exception->getErrorCode()), $exception->getHttpStatus());
} catch (MarkAiPromptBuilderException $exception) {
    markai_respond(markai_error_payload('invalid_request'), 422);
} catch (Throwable $exception) {
    markai_respond(markai_error_payload('internal_error'), 500);
}

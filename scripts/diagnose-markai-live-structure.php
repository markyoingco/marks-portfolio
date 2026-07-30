<?php

declare(strict_types=1);

/**
* One-request Cloudflare live-response structural + transport diagnostic.
*
* Manual use only after temporarily enabling private runtime configuration.
* Prints schema/transport metadata only. Never prints answers, credentials,
* prompts, raw bodies, raw cURL errors, or knowledge contents.
*
* Fixed question only - no visitor or CLI question input.
*/

$repoRoot = dirname(__DIR__);

require_once $repoRoot . '/server/markai/MockEndpointService.php';
require_once $repoRoot . '/server/markai/ProviderRuntimeFactory.php';
require_once $repoRoot . '/server/markai/HttpTransport.php';
require_once $repoRoot . '/server/markai/CurlHttpTransport.php';
require_once $repoRoot . '/server/markai/CloudflareWorkersAiProvider.php';
require_once $repoRoot . '/server/markai/ProviderResponseValidator.php';
require_once $repoRoot . '/server/markai/GeneratedAnswerService.php';
require_once $repoRoot . '/server/markai/PromptBuilder.php';

const MARKAI_DIAG_QUESTION = 'What did Mark contribute to Abacus?';

/** @var list<string> */
const MARKAI_DIAG_KEY_ALLOWLIST = [
    'success', 'result', 'errors', 'messages', 'response', 'output_text', 'output',
    'usage', 'status', 'object', 'type', 'role', 'content', 'choices', 'message',
    'finish_reason', 'input_tokens', 'output_tokens', 'prompt_tokens', 'completion_tokens',
    'total_tokens', 'input_tokens_details', 'output_tokens_details', 'error', 'incomplete_details',
];

/** @var list<string> */
const MARKAI_DIAG_TRANSPORT_CATEGORIES = [
    'none', 'dns_failed', 'connection_failed', 'timeout', 'tls_failed',
    'response_write_failed', 'empty_response', 'response_too_large',
    'http_client_error', 'http_server_error', 'invalid_content_type', 'invalid_json',
    'unknown_transport_error', 'authentication_failed', 'rate_limited', 'not_found',
    'payload_too_large',
];

/** @var list<string> */
const MARKAI_DIAG_OUTPUT_ITEM_TYPES = [
    'message', 'reasoning', 'function_call', 'tool_call', 'custom_tool_call',
];

/** @var list<string> */
const MARKAI_DIAG_CONTENT_TYPES = ['output_text', 'text'];

/** @var list<string> */
const MARKAI_DIAG_ROLES = ['assistant', 'user', 'system', 'tool'];

/** @var list<string> */
const MARKAI_DIAG_STATUSES = [
    'completed', 'success', 'incomplete', 'failed', 'cancelled', 'canceled',
    'in_progress', 'requires_action', 'stop',
];

/** @var list<string> */
const MARKAI_DIAG_CHOICE_KEY_ALLOWLIST = [
    'index',
    'message',
    'finish_reason',
    'role',
    'content',
    'reasoning_content',
    'refusal',
    'tool_calls',
    'type',
    'text',
];

/** @var list<string> */
const MARKAI_DIAG_FINISH_REASONS = [
    'stop',
    'length',
    'tool_calls',
    'content_filter',
    'completed',
];

/** @var list<string> */
const MARKAI_DIAG_MESSAGE_CONTENT_ITEM_TYPES = [
    'text',
    'output_text',
    'reasoning',
    'tool',
];

/**
* Local diagnostic-only observer around HttpTransport. Not used in production.
*/
final class MarkAiDiagnoseObservingTransport implements HttpTransport
{
    public ?array $lastResult = null;

    public function __construct(private HttpTransport $inner)
    {
    }

    public function isAvailable(): bool
    {
        return $this->inner->isAvailable();
    }

    public function request(array $request): array
    {
        $result = $this->inner->request($request);
        $this->lastResult = is_array($result) ? $result : null;

        return $result;
    }
}

/**
* @param list<string> $lines
*/
function markai_diag_print(array $lines): void
{
    foreach ($lines as $line) {
        fwrite(STDOUT, $line . "\n");
    }
}

/**
* @param list<string> $lines
* @return never
*/
function markai_diag_exit(array $lines, int $code): void
{
    markai_diag_print($lines);
    exit($code);
}

/** @return never */
function markai_diag_suppress(): void
{
    markai_diag_exit([
            'diagnostic_output_suppressed=yes',
            'credential_leak_check=failed',
        ], 1);
}

function markai_diag_php_type(mixed $value): string
{
    if ($value === null) {
        return 'null';
    }
    if (is_bool($value)) {
        return 'boolean';
    }
    if (is_array($value)) {
        return array_is_list($value) ? 'array' : 'object';
    }
    if (is_string($value)) {
        return 'string';
    }

    return 'other';
}

/**
* @param array<string, mixed> $object
* @param list<string> $allowlist
*/
function markai_diag_allowlisted_keys_from(array $object, array $allowlist): string
{
    $keys = [];
    foreach (array_keys($object) as $key) {
        if (is_string($key) && in_array($key, $allowlist, true)) {
            $keys[] = $key;
        }
    }
    $keys = array_values(array_unique($keys));
    sort($keys, SORT_STRING);

    return $keys === [] ? 'unknown_object' : implode(',', $keys);
}

/**
* @param array<string, mixed> $object
*/
function markai_diag_allowlisted_keys(array $object): string
{
    return markai_diag_allowlisted_keys_from($object, MARKAI_DIAG_KEY_ALLOWLIST);
}

/**
* @param list<string> $allowed
*/
function markai_diag_safe_enum(string $value, array $allowed): string
{
    $normalized = strtolower(trim($value));

    return ($normalized !== '' && in_array($normalized, $allowed, true)) ? $normalized : 'other';
}

/**
* @param list<string> $values
*/
function markai_diag_join_enums(array $values): string
{
    if ($values === []) {
        return 'unavailable';
    }
    $values = array_values(array_unique($values));
    sort($values, SORT_STRING);

    return implode(',', $values);
}

function markai_diag_http_status_class(int $status): string
{
    if ($status >= 200 && $status < 300) {
        return '2xx';
    }
    if ($status >= 400 && $status < 500) {
        return '4xx';
    }
    if ($status >= 500 && $status < 600) {
        return '5xx';
    }

    return 'other';
}

function markai_diag_content_type_class(?string $contentType): string
{
    if ($contentType === null || trim($contentType) === '') {
        return 'missing';
    }
    $type = strtolower($contentType);
    if (str_contains($type, 'application/json') || str_contains($type, '+json')) {
        return 'json';
    }

    return 'non_json';
}

function markai_diag_safe_transport_category(?string $category): string
{
    $category = (string) $category;
    if ($category === '' || $category === 'none') {
        return 'none';
    }
    if (in_array($category, MARKAI_DIAG_TRANSPORT_CATEGORIES, true)) {
        return $category;
    }

    return 'unknown_transport_error';
}

function markai_diag_safe_provider_status(?string $category, bool $success, string $status): string
{
    if ($success) {
        return $status !== '' ? $status : 'ok';
    }

    $raw = (string) $category;

    // Transport/network categories only - never remap schema failures through this path.
    if (in_array($raw, MARKAI_DIAG_TRANSPORT_CATEGORIES, true)) {
        return $raw === 'none' ? 'invalid_response' : $raw;
    }

    return match ($raw) {
        'unsafe_answer' => 'unsafe_answer',
        'incomplete_response', 'incomplete_status', 'empty_answer' => 'incomplete_response',
        'unsupported_schema', 'unrecognized_response', 'conflicting_answers',
        'reasoning_only_output', 'tool_only_output', 'provider_success_false' => 'unsupported_schema',
        'invalid_response' => 'invalid_response',
        default => 'invalid_response',
    };
}

/**
* Normalize either HttpTransport contract or provider-callable contract.
*
* @param array<string, mixed> $transportResponse
* @return array{status:int, body:string, contentType:?string, success:?bool, errorCategory:?string, curlErrno:?int, responseByteCount:?int, headersReceived:bool}
*/
function markai_diag_normalize_observed(array $transportResponse): array
{
    $status = 0;
    if (array_key_exists('httpStatus', $transportResponse)) {
        $status = (int) $transportResponse['httpStatus'];
    } elseif (array_key_exists('status', $transportResponse)) {
        $status = (int) $transportResponse['status'];
    }

    $body = (string) ($transportResponse['body'] ?? '');
    $contentType = null;
    if (array_key_exists('contentType', $transportResponse)) {
        $contentType = is_string($transportResponse['contentType']) ? $transportResponse['contentType'] : null;
    } elseif (isset($transportResponse['headers']) && is_array($transportResponse['headers'])) {
        foreach (['Content-Type', 'content-type'] as $headerName) {
            if (isset($transportResponse['headers'][$headerName]) && is_string($transportResponse['headers'][$headerName])) {
                $contentType = $transportResponse['headers'][$headerName];
                break;
            }
        }
    }

    $success = null;
    if (array_key_exists('success', $transportResponse)) {
        $success = (bool) $transportResponse['success'];
    }

    $errorCategory = isset($transportResponse['errorCategory']) && is_string($transportResponse['errorCategory'])
    ? $transportResponse['errorCategory']
    : null;

    $curlErrno = null;
    if (array_key_exists('curlErrno', $transportResponse) && is_int($transportResponse['curlErrno'])) {
        $curlErrno = $transportResponse['curlErrno'];
    }

    $bytes = null;
    if (array_key_exists('responseByteCount', $transportResponse) && is_int($transportResponse['responseByteCount'])) {
        $bytes = $transportResponse['responseByteCount'];
    } else {
        $bytes = strlen($body);
    }

    $headersReceived = $contentType !== null && $contentType !== '';

    return [
        'status' => $status,
        'body' => $body,
        'contentType' => $contentType,
        'success' => $success,
        'errorCategory' => $errorCategory,
        'curlErrno' => $curlErrno,
        'responseByteCount' => $bytes,
        'headersReceived' => $headersReceived,
    ];
}

/**
* @param array<string, mixed> $transportResponse
* @return array<string, string>
*/
function markai_diag_fingerprint(array $transportResponse): array
{
    $normalized = markai_diag_normalize_observed($transportResponse);
    $status = $normalized['status'];
    $body = $normalized['body'];
    $contentType = $normalized['contentType'];

    $fields = [
        'http_status_class' => markai_diag_http_status_class($status),
        'content_type' => markai_diag_content_type_class($contentType),
        'json_decode' => 'failed',
        'top_level_type' => 'other',
        'top_level_keys' => 'unavailable',
        'success_field_type' => 'missing',
        'success_field_value' => 'unavailable',
        'result_type' => 'missing',
        'result_keys' => 'unavailable',
        'result_response_type' => 'missing',
        'result_response_keys' => 'unavailable',
        'response_type' => 'missing',
        'response_keys' => 'unavailable',
        'output_type' => 'missing',
        'output_count' => 'unavailable',
        'output_item_types' => 'unavailable',
        'output_item_statuses' => 'unavailable',
        'output_message_roles' => 'unavailable',
        'content_item_types' => 'unavailable',
        'choices_type' => 'missing',
        'choices_count' => 'unavailable',
        'choice_message_type' => 'missing',
        'choice_item_type' => 'missing',
        'choice_keys' => 'unavailable',
        'choice_finish_reason_type' => 'missing',
        'choice_finish_reason_value' => 'unavailable',
        'message_keys' => 'unavailable',
        'message_role_type' => 'missing',
        'message_role_value' => 'unavailable',
        'message_content_type' => 'missing',
        'message_content_nonempty' => 'unavailable',
        'message_content_count' => 'unavailable',
        'message_content_item_types' => 'unavailable',
        'reasoning_content_type' => 'missing',
        'tool_calls_type' => 'missing',
        'tool_calls_count' => 'unavailable',
        'usage_type' => 'missing',
        'usage_keys' => 'unavailable',
        'errors_type' => 'missing',
        'errors_count' => 'unavailable',
    ];

    if ($body === '') {
        return $fields;
    }

    try {
        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    } catch (Throwable $e) {
        return $fields;
    }

    $fields['json_decode'] = 'success';
    $fields['top_level_type'] = markai_diag_php_type($decoded);
    if (!is_array($decoded)) {
        return $fields;
    }
    if (!array_is_list($decoded)) {
        $fields['top_level_keys'] = markai_diag_allowlisted_keys($decoded);
    }

    if (array_key_exists('success', $decoded)) {
        $fields['success_field_type'] = is_bool($decoded['success']) ? 'boolean' : 'other';
        if (is_bool($decoded['success'])) {
            $fields['success_field_value'] = $decoded['success'] ? 'true' : 'false';
        }
    }

    $payload = $decoded;
    if (array_key_exists('result', $decoded)) {
        $fields['result_type'] = markai_diag_php_type($decoded['result']);
        if (is_array($decoded['result']) && !array_is_list($decoded['result'])) {
            $fields['result_keys'] = markai_diag_allowlisted_keys($decoded['result']);
            $payload = $decoded['result'];
        } else {
            $fields['result_keys'] = 'unavailable';
        }
    }

    if (is_array($payload) && array_key_exists('response', $payload)) {
        $fields['result_response_type'] = markai_diag_php_type($payload['response']);
        if (is_array($payload['response']) && !array_is_list($payload['response'])) {
            $fields['result_response_keys'] = markai_diag_allowlisted_keys($payload['response']);
        } elseif (is_array($payload['response'])) {
            $fields['result_response_keys'] = 'unknown_object';
        } else {
            $fields['result_response_keys'] = 'unavailable';
        }
    }

    if (array_key_exists('response', $decoded)) {
        $fields['response_type'] = markai_diag_php_type($decoded['response']);
        if (is_array($decoded['response']) && !array_is_list($decoded['response'])) {
            $fields['response_keys'] = markai_diag_allowlisted_keys($decoded['response']);
        } elseif (is_array($decoded['response'])) {
            $fields['response_keys'] = 'unknown_object';
        } else {
            $fields['response_keys'] = 'unavailable';
        }
    }

    $outputSource = null;
    if (is_array($payload) && array_key_exists('output', $payload)) {
        $outputSource = $payload['output'];
    } elseif (array_key_exists('output', $decoded)) {
        $outputSource = $decoded['output'];
    }
    if (is_array($outputSource) && array_is_list($outputSource)) {
        $fields['output_type'] = 'array';
        $fields['output_count'] = (string) count($outputSource);
        $itemTypes = [];
        $itemStatuses = [];
        $roles = [];
        $contentTypes = [];
        foreach ($outputSource as $item) {
            if (!is_array($item)) {
                $itemTypes[] = 'other';
                continue;
            }
            if (isset($item['type']) && is_string($item['type'])) {
                $itemTypes[] = markai_diag_safe_enum($item['type'], MARKAI_DIAG_OUTPUT_ITEM_TYPES);
            }
            if (isset($item['status']) && is_string($item['status'])) {
                $itemStatuses[] = markai_diag_safe_enum($item['status'], MARKAI_DIAG_STATUSES);
            }
            if (isset($item['role']) && is_string($item['role'])) {
                $roles[] = markai_diag_safe_enum($item['role'], MARKAI_DIAG_ROLES);
            }
            if (isset($item['content']) && is_array($item['content'])) {
                foreach ($item['content'] as $contentItem) {
                    if (!is_array($contentItem)) {
                        $contentTypes[] = 'other';
                        continue;
                    }
                    if (isset($contentItem['type']) && is_string($contentItem['type'])) {
                        $contentTypes[] = markai_diag_safe_enum($contentItem['type'], MARKAI_DIAG_CONTENT_TYPES);
                    }
                }
            }
        }
        $fields['output_item_types'] = markai_diag_join_enums($itemTypes);
        $fields['output_item_statuses'] = markai_diag_join_enums($itemStatuses);
        $fields['output_message_roles'] = markai_diag_join_enums($roles);
        $fields['content_item_types'] = markai_diag_join_enums($contentTypes);
    } elseif ($outputSource !== null) {
        $fields['output_type'] = 'other';
    }

    $choicesSource = null;
    if (is_array($payload) && array_key_exists('choices', $payload)) {
        $choicesSource = $payload['choices'];
    } elseif (array_key_exists('choices', $decoded)) {
        $choicesSource = $decoded['choices'];
    }
    if (is_array($choicesSource) && array_is_list($choicesSource)) {
        $fields['choices_type'] = 'array';
        $fields['choices_count'] = (string) count($choicesSource);
        $first = $choicesSource[0] ?? null;
        $fields['choice_item_type'] = markai_diag_php_type($first);
        if (is_array($first) && !array_is_list($first)) {
            $fields['choice_keys'] = markai_diag_allowlisted_keys_from($first, MARKAI_DIAG_CHOICE_KEY_ALLOWLIST);
            if (array_key_exists('finish_reason', $first)) {
                $fields['choice_finish_reason_type'] = is_string($first['finish_reason'])
                ? 'string'
                : (is_null($first['finish_reason']) ? 'null' : 'other');
                if (is_string($first['finish_reason']) && $first['finish_reason'] !== '') {
                    $fields['choice_finish_reason_value'] = markai_diag_safe_enum(
                        $first['finish_reason'],
                        MARKAI_DIAG_FINISH_REASONS
                    );
                }
            }
            if (array_key_exists('message', $first)) {
                $message = $first['message'];
                $fields['choice_message_type'] = markai_diag_php_type($message);
                if (is_array($message) && !array_is_list($message)) {
                    $fields['message_keys'] = markai_diag_allowlisted_keys_from(
                        $message,
                        MARKAI_DIAG_CHOICE_KEY_ALLOWLIST
                    );
                    if (array_key_exists('role', $message)) {
                        $fields['message_role_type'] = is_string($message['role']) ? 'string' : 'other';
                        if (is_string($message['role'])) {
                            $fields['message_role_value'] = markai_diag_safe_enum(
                                $message['role'],
                                MARKAI_DIAG_ROLES
                            );
                        }
                    }
                    if (array_key_exists('content', $message)) {
                        $content = $message['content'];
                        $fields['message_content_type'] = markai_diag_php_type($content);
                        if (is_string($content)) {
                            $fields['message_content_nonempty'] = trim($content) !== '' ? 'yes' : 'no';
                            $fields['message_content_count'] = 'unavailable';
                        } elseif (is_array($content) && array_is_list($content)) {
                            $fields['message_content_count'] = (string) count($content);
                            $fields['message_content_nonempty'] = count($content) > 0 ? 'yes' : 'no';
                            $itemTypes = [];
                            foreach ($content as $contentItem) {
                                if (!is_array($contentItem) || !isset($contentItem['type']) || !is_string($contentItem['type'])) {
                                    $itemTypes[] = 'other';
                                    continue;
                                }
                                $itemTypes[] = markai_diag_safe_enum(
                                    $contentItem['type'],
                                    MARKAI_DIAG_MESSAGE_CONTENT_ITEM_TYPES
                                );
                            }
                            $fields['message_content_item_types'] = markai_diag_join_enums($itemTypes);
                        } elseif ($content === null) {
                            $fields['message_content_nonempty'] = 'no';
                        } else {
                            $fields['message_content_nonempty'] = 'unavailable';
                        }
                    }
                    if (array_key_exists('reasoning_content', $message)) {
                        $fields['reasoning_content_type'] = markai_diag_php_type($message['reasoning_content']);
                    }
                    if (array_key_exists('tool_calls', $message)) {
                        $toolCalls = $message['tool_calls'];
                        if (is_array($toolCalls) && array_is_list($toolCalls)) {
                            $fields['tool_calls_type'] = 'array';
                            $fields['tool_calls_count'] = (string) count($toolCalls);
                        } elseif ($toolCalls === null) {
                            $fields['tool_calls_type'] = 'null';
                        } else {
                            $fields['tool_calls_type'] = 'other';
                        }
                    }
                }
            }
        }
    } elseif ($choicesSource !== null) {
        $fields['choices_type'] = 'other';
    }

    $usageSource = null;
    if (is_array($payload) && isset($payload['usage']) && is_array($payload['usage'])) {
        $usageSource = $payload['usage'];
    } elseif (isset($decoded['usage']) && is_array($decoded['usage'])) {
        $usageSource = $decoded['usage'];
    }
    if ($usageSource !== null) {
        $fields['usage_type'] = array_is_list($usageSource) ? 'other' : 'object';
        if (!array_is_list($usageSource)) {
            $fields['usage_keys'] = markai_diag_allowlisted_keys($usageSource);
        }
    }

    if (array_key_exists('errors', $decoded)) {
        $fields['errors_type'] = is_array($decoded['errors']) && array_is_list($decoded['errors']) ? 'array' : 'other';
        if (is_array($decoded['errors']) && array_is_list($decoded['errors'])) {
            $fields['errors_count'] = (string) count($decoded['errors']);
        }
    }

    return $fields;
}

/**
* Safe request-shape audit. Never returns secrets or the full URL.
*
* @param array<string, mixed> $configuration
* @return array<string, string>
*/
function markai_diag_audit_request(
    string $method,
    string $url,
    array $headers,
    string $body,
    array $configuration
): array {
    $parts = parse_url($url);
    $hostOk = is_array($parts)
    && ($parts['scheme'] ?? '') === 'https'
    && ($parts['host'] ?? '') === 'api.cloudflare.com';

    $path = is_array($parts) ? (string) ($parts['path'] ?? '') : '';
    $routeOk = (bool) preg_match(
        '#^/client/v4/accounts/[^/]+/ai/run/@cf/openai/gpt-oss-120b$#',
        $path
    );
    // Model must remain unencoded path segments, not one encoded blob.
    $modelPathOk = str_contains($path, '/ai/run/@cf/openai/gpt-oss-120b')
    && !str_contains($path, '%40cf%2Fopenai%2Fgpt-oss-120b');

    $auth = 'missing';
    $contentType = 'other';
    $accept = 'other';
    foreach ($headers as $name => $value) {
        if (!is_string($name) || !is_string($value)) {
            continue;
        }
        if (strcasecmp($name, 'Authorization') === 0 && str_starts_with($value, 'Bearer ')) {
            $auth = 'present';
        }
        if (strcasecmp($name, 'Content-Type') === 0 && str_contains(strtolower($value), 'application/json')) {
            $contentType = 'json';
        }
        if (strcasecmp($name, 'Accept') === 0 && str_contains(strtolower($value), 'application/json')) {
            $accept = 'json';
        }
    }

    $bodyJson = 'invalid';
    $requestMaxTokens = 'unavailable';
    try {
        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        if (is_array($decoded)) {
            $bodyJson = 'valid';
            if (array_key_exists('max_tokens', $decoded) && is_int($decoded['max_tokens'])) {
                $requestMaxTokens = (string) $decoded['max_tokens'];
            } elseif (array_key_exists('max_tokens', $decoded) && is_numeric($decoded['max_tokens'])) {
                $requestMaxTokens = (string) (int) $decoded['max_tokens'];
            }
        }
    } catch (Throwable $e) {
        $bodyJson = 'invalid';
    }

    $accountId = (string) ($configuration['accountId'] ?? '');
    $token = (string) ($configuration['apiToken'] ?? '');
    $accountFormat = ($accountId !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $accountId) === 1) ? 'valid' : 'invalid';
    $tokenFormat = (strlen(trim($token)) >= 8) ? 'valid' : 'invalid';
    $tokenWhitespace = (trim($token) === $token) ? 'absent' : 'present';

    return [
        'endpoint_host_check' => $hostOk ? 'passed' : 'failed',
        'endpoint_route_shape' => $routeOk ? 'passed' : 'failed',
        'request_method' => strtoupper($method) === 'POST' ? 'POST' : 'other',
        'authorization_header' => $auth,
        'request_content_type' => $contentType,
        'accept_header' => $accept,
        'request_body_json' => $bodyJson,
        'request_body_bytes' => (string) strlen($body),
        'request_max_tokens' => $requestMaxTokens,
        'account_id_format' => $accountFormat,
        'token_format' => $tokenFormat,
        'token_surrounding_whitespace' => $tokenWhitespace,
        'model_path_check' => $modelPathOk ? 'passed' : 'failed',
    ];
}

if ($argc > 1) {
    markai_diag_exit([
            'provider_runtime_enabled=no',
            'refusal_reason=cli_arguments_not_allowed',
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

$exportPath = $repoRoot . '/server/markai/generated/approved-v1.json';
if (!is_readable($exportPath)) {
    markai_diag_exit([
            'provider_runtime_enabled=no',
            'refusal_reason=export_unavailable',
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

try {
    $export = json_decode((string) file_get_contents($exportPath), true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    markai_diag_exit([
            'provider_runtime_enabled=no',
            'refusal_reason=export_unavailable',
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

if (!is_array($export)) {
    markai_diag_exit([
            'provider_runtime_enabled=no',
            'refusal_reason=export_unavailable',
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

$runtime = markai_create_provider_runtime();
$status = (string) ($runtime['status'] ?? 'disabled');
$configuration = is_array($runtime['configuration'] ?? null)
? $runtime['configuration']
: markai_default_provider_configuration();

$refusalMap = [
    'disabled' => 'provider_disabled',
    'invalid_configuration' => 'invalid_configuration',
    'invalid_model' => 'invalid_model',
    'transport_unavailable' => 'transport_unavailable',
];

if ($status !== 'ready' || !markai_provider_configuration_is_usable($configuration)) {
    $reason = $refusalMap[$status] ?? 'runtime_not_ready';
    if (!is_readable(markai_provider_local_configuration_path())) {
        $reason = 'private_configuration_missing';
    } elseif ($status === 'disabled' || (($configuration['enabled'] ?? false) !== true)) {
        $reason = 'provider_disabled';
    } elseif (!extension_loaded('curl') || !function_exists('curl_init')) {
        $reason = 'curl_unavailable';
    } elseif (!markai_provider_configuration_is_usable($configuration)) {
        $reason = 'invalid_configuration';
    }

    markai_diag_exit([
            'provider_runtime_enabled=no',
            'refusal_reason=' . $reason,
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

$secretAccountId = trim((string) ($configuration['accountId'] ?? ''));
$secretApiToken = trim((string) ($configuration['apiToken'] ?? ''));

$question = MARKAI_DIAG_QUESTION;
$classified = markai_mock_classify($question);
$selectedRecordIds = markai_mock_select_record_ids($export, (string) $classified['category']);
$mode = (string) ($classified['mode'] ?? 'technical');
$deterministicAnswer = (string) ($classified['answer'] ?? '');

try {
    $built = buildMarkAiRequest($export, $question, [], $selectedRecordIds, $mode);
} catch (Throwable $e) {
    markai_diag_exit([
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
    markai_diag_exit([
            'provider_runtime_enabled=yes',
            'refusal_reason=prompt_build_failed',
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

$systemMessage = '';
foreach ($messages as $message) {
    if (is_array($message) && ($message['role'] ?? '') === 'system' && is_string($message['content'] ?? null)) {
        $systemMessage = (string) $message['content'];
        break;
    }
}

// Observe the real HttpTransport contract, then wrap exactly as production does.
$observer = new MarkAiDiagnoseObservingTransport(new CurlHttpTransport());
if (!$observer->isAvailable()) {
    markai_diag_exit([
            'provider_runtime_enabled=no',
            'refusal_reason=curl_unavailable',
            'live_request_attempted=no',
            'transport_invocations=0',
            'live_network_requests=0',
            'credential_leak_check=passed',
        ], 1);
}

$productionTransport = markai_wrap_http_transport_for_provider($observer, $configuration);

$transportInvocations = 0;
/** @var array<string, string> $requestAudit */
$requestAudit = [];

$observingTransport = static function (
    string $method,
    string $url,
    array $headers,
    string $body,
    array $options
) use (
    $productionTransport,
    $configuration,
    &$transportInvocations,
    &$requestAudit
): array {
    $transportInvocations++;
    if ($transportInvocations > 1) {
        return [
            'status' => 0,
            'body' => '',
            'headers' => [],
            'errorCategory' => 'unknown_transport_error',
        ];
    }

    $requestAudit = markai_diag_audit_request($method, $url, $headers, $body, $configuration);

    return $productionTransport($method, $url, $headers, $body, $options);
};

$provider = new CloudflareWorkersAiProvider();
$validator = new ProviderResponseValidator();
$settings = [
    'temperature' => 0.2,
    'max_tokens' => 900,
    'stream' => false,
];

$result = $provider->generate($messages, $settings, $configuration, $observingTransport);

$httpResult = $observer->lastResult;
$transportResultReceived = is_array($httpResult) ? 'yes' : 'no';
$normalizedHttp = is_array($httpResult)
? markai_diag_normalize_observed($httpResult)
: [
    'status' => 0,
    'body' => '',
    'contentType' => null,
    'success' => false,
    'errorCategory' => 'unknown_transport_error',
    'curlErrno' => null,
    'responseByteCount' => 0,
    'headersReceived' => false,
];

$fingerprint = is_array($httpResult)
? markai_diag_fingerprint($httpResult)
: markai_diag_fingerprint([
        'httpStatus' => 0,
        'body' => '',
        'contentType' => null,
        'success' => false,
        'errorCategory' => 'unknown_transport_error',
        'curlErrno' => null,
        'responseByteCount' => 0,
]);

$providerSuccess = $result->isSuccess();
$normalProviderStatus = markai_diag_safe_provider_status(
    $result->getErrorCategory(),
    $providerSuccess,
    (string) $result->getStatus()
);

$validatorResult = 'rejected';
$answerSource = 'deterministic_fallback';
$generatedAnswer = '';
if ($providerSuccess) {
    $draft = trim((string) $result->getAnswerText());
    $generatedAnswer = $draft;
    $validation = $validator->validate($draft, [
            'finish_reason' => $result->getFinishReason(),
    ]);
    if (($validation['accepted'] ?? false) === true) {
        $validatorResult = 'accepted';
        $answerSource = 'generated';
    } else {
        $normalProviderStatus = 'unsafe_answer';
    }
}

$curlErrnoOut = 'unavailable';
if ($normalizedHttp['curlErrno'] !== null && $normalizedHttp['curlErrno'] >= 0) {
    $curlErrnoOut = (string) $normalizedHttp['curlErrno'];
}

$httpStatusOut = 'unavailable';
if ($normalizedHttp['status'] >= 0 && $normalizedHttp['status'] <= 599) {
    $httpStatusOut = (string) $normalizedHttp['status'];
}

$responseBytesOut = $normalizedHttp['responseByteCount'] === null
? 'unavailable'
: (string) max(0, (int) $normalizedHttp['responseByteCount']);

$transportSuccess = 'no';
if ($normalizedHttp['success'] === true) {
    $transportSuccess = 'yes';
} elseif ($normalizedHttp['success'] === null
    && $normalizedHttp['errorCategory'] === null
    && $normalizedHttp['status'] >= 200
    && $normalizedHttp['status'] < 300
) {
    $transportSuccess = 'yes';
}

$report = [
    'provider_runtime_enabled=yes',
    'live_request_attempted=yes',
    'transport_invocations=' . $transportInvocations,
    'transport_result_received=' . $transportResultReceived,
    'transport_success=' . $transportSuccess,
    'curl_errno=' . $curlErrnoOut,
    'transport_error_category=' . markai_diag_safe_transport_category($normalizedHttp['errorCategory']),
    'http_status_code=' . $httpStatusOut,
    'headers_received=' . ($normalizedHttp['headersReceived'] ? 'yes' : 'no'),
    'response_bytes=' . $responseBytesOut,
];

foreach ($requestAudit as $key => $value) {
    $report[] = $key . '=' . $value;
}

foreach ($fingerprint as $key => $value) {
    $report[] = $key . '=' . $value;
}

$report[] = 'normal_provider_status=' . $normalProviderStatus;
$report[] = 'normal_validator_result=' . $validatorResult;
$report[] = 'normal_answer_source=' . $answerSource;
$report[] = 'live_network_requests=' . ($transportInvocations > 0 ? '1' : '0');

$joined = implode("\n", $report);
$leak = false;
if ($secretApiToken !== '' && str_contains($joined, $secretApiToken)) {
    $leak = true;
}
if ($secretAccountId !== '' && str_contains($joined, $secretAccountId)) {
    $leak = true;
}
if (preg_match('/Authorization\s*:/i', $joined) === 1 || str_contains($joined, 'Bearer ')) {
    $leak = true;
}
if ($generatedAnswer !== '' && str_contains($joined, $generatedAnswer)) {
    $leak = true;
}
if ($deterministicAnswer !== '' && str_contains($joined, $deterministicAnswer)) {
    $leak = true;
}
if ($systemMessage !== '' && str_contains($joined, $systemMessage)) {
    $leak = true;
}
if (str_contains($joined, $repoRoot) || str_contains($joined, str_replace('\\', '/', $repoRoot))) {
    $leak = true;
}
if (preg_match('/[A-Za-z]:\\\\/', $joined) === 1 || preg_match('/\/Users\//', $joined) === 1) {
    $leak = true;
}
if (str_contains(strtolower($joined), 'curl_error') || preg_match('/\bSSL certificate\b/i', $joined) === 1) {
    $leak = true;
}

unset($httpResult, $observer, $result, $messages, $built, $configuration, $secretApiToken, $secretAccountId);

if ($leak) {
    markai_diag_suppress();
}

$report[] = 'credential_leak_check=passed';
markai_diag_exit($report, 0);


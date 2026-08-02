<?php

declare(strict_types=1);

require_once __DIR__ . '/LanguageModelProvider.php';
require_once __DIR__ . '/ProviderResult.php';
require_once __DIR__ . '/ProviderConfiguration.php';

/**
 * Cloudflare Workers AI adapter for @cf/openai/gpt-oss-120b.
 *
 * Disabled-by-default. Production HTTPS transport may be injected by the
 * runtime factory when private configuration explicitly enables the provider.
 * Fixture/callable transports remain supported for local tests.
 *
 * Response normalization recognizes only documented GPT-OSS / Workers AI shapes:
 * - Prompt-style `response`
 * - Convenience `output_text`
 * - Responses API `output[]` message/output_text items
 * - Messages/Chat Completions `choices[].message.content`
 */
final class CloudflareWorkersAiProvider implements LanguageModelProvider
{
    public const PROVIDER_NAME = 'cloudflare-workers-ai';
    public const MODEL_NAME = '@cf/openai/gpt-oss-120b';
    public const ALLOWED_HOST = 'api.cloudflare.com';

    /** Maximum generated tokens sent as Chat Completions max_tokens. Not unlimited. */
    public const DEFAULT_MAX_TOKENS = 900;

    private const REJECTED_STATUSES = [
        'incomplete',
        'failed',
        'cancelled',
        'canceled',
        'in_progress',
        'requires_action',
    ];

    private const COMPLETE_STATUSES = [
        'completed',
        'success',
    ];

    /**
     * Structured production transport options.
     *
     * @return array<string, mixed>
     */
    public static function productionTransportOptions(array $configuration): array
    {
        return [
            'https_only' => true,
            'allowed_host' => self::ALLOWED_HOST,
            'allow_redirects' => false,
            'connect_timeout' => (float) ($configuration['connectTimeoutSeconds'] ?? 5.0),
            'timeout' => (float) ($configuration['totalTimeoutSeconds'] ?? 20.0),
            'max_response_bytes' => (int) ($configuration['maxResponseBytes'] ?? 200000),
            'require_json' => true,
            'generic_errors_only' => true,
        ];
    }

    /**
     * Local-test-only structural fingerprint. Never include values, text, IDs,
     * prompts, credentials, or error bodies. Not used in production requests.
     *
     * @param array<string, mixed> $decoded
     * @return array{
     *   topLevelKeys: list<string>,
     *   resultKeys: list<string>|null,
     *   outputItemTypes: list<string>,
     *   contentItemTypes: list<string>
     * }
     */
    public static function structuralFingerprintForTests(array $decoded): array
    {
        $topKeys = [];
        foreach (array_keys($decoded) as $key) {
            if (is_string($key)) {
                $topKeys[] = $key;
            }
        }

        $resultKeys = null;
        $payload = $decoded;
        if (array_key_exists('result', $decoded)) {
            if (is_array($decoded['result'])) {
                $resultKeys = [];
                foreach (array_keys($decoded['result']) as $key) {
                    if (is_string($key)) {
                        $resultKeys[] = $key;
                    }
                }
                $payload = $decoded['result'];
            } else {
                $resultKeys = [];
            }
        }

        $outputItemTypes = [];
        $contentItemTypes = [];
        if (isset($payload['output']) && is_array($payload['output'])) {
            foreach ($payload['output'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                if (isset($item['type']) && is_string($item['type']) && $item['type'] !== '') {
                    $outputItemTypes[] = $item['type'];
                }
                if (!isset($item['content']) || !is_array($item['content'])) {
                    continue;
                }
                foreach ($item['content'] as $contentItem) {
                    if (!is_array($contentItem)) {
                        continue;
                    }
                    if (isset($contentItem['type']) && is_string($contentItem['type']) && $contentItem['type'] !== '') {
                        $contentItemTypes[] = $contentItem['type'];
                    }
                }
            }
        }

        return [
            'topLevelKeys' => $topKeys,
            'resultKeys' => $resultKeys,
            'outputItemTypes' => $outputItemTypes,
            'contentItemTypes' => $contentItemTypes,
        ];
    }

    public function generate(
        array $messages,
        array $settings,
        array $configuration,
        ?callable $transport = null
    ): ProviderResult {
        $model = (string) ($configuration['model'] ?? self::MODEL_NAME);
        if ($model === '') {
            $model = self::MODEL_NAME;
        }

        if (($configuration['enabled'] ?? false) !== true) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'provider_disabled');
        }

        if (!markai_provider_configuration_is_usable($configuration)) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'invalid_configuration');
        }

        if ($transport === null) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'transport_unavailable');
        }

        $accountId = trim((string) $configuration['accountId']);
        $apiToken = trim((string) $configuration['apiToken']);
        $baseUrl = rtrim((string) ($configuration['baseUrl'] ?? 'https://api.cloudflare.com/client/v4/accounts'), '/');
        $url = $baseUrl . '/' . rawurlencode($accountId) . '/ai/run/' . self::MODEL_NAME;

        if (!$this->isAllowedCloudflareUrl($url)) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'invalid_endpoint');
        }

        $temperature = array_key_exists('temperature', $settings)
            ? (float) $settings['temperature']
            : (float) ($configuration['temperature'] ?? 0.2);
        $maxTokens = array_key_exists('max_tokens', $settings)
            ? (int) $settings['max_tokens']
            : (int) ($configuration['maxTokens'] ?? self::DEFAULT_MAX_TOKENS);
        $stream = array_key_exists('stream', $settings)
            ? (bool) $settings['stream']
            : (bool) ($configuration['stream'] ?? false);

        $payload = [
            'messages' => $this->normalizeMessages($messages),
            'temperature' => $temperature,
            'max_tokens' => $maxTokens,
            'stream' => $stream === true ? true : false,
        ];

        // Explicitly omit tools / web search / function calling / Generative UI / MCP.
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($body)) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'invalid_request_payload');
        }

        $headers = [
            'Authorization' => 'Bearer ' . $apiToken,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        $options = self::productionTransportOptions($configuration);

        try {
            $response = $transport('POST', $url, $headers, $body, $options);
        } catch (Throwable $e) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'unknown_transport_error');
        }

        // Classification order:
        // 1) cURL/network failure  2) missing transport response  3) HTTP status
        // 4) content-type          5) empty response              6) invalid JSON
        // 7) unsupported schema    8) validator (caller)          9) accepted
        if (!is_array($response)) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'unknown_transport_error');
        }

        $status = (int) ($response['status'] ?? 0);
        $rawBody = (string) ($response['body'] ?? '');
        $transportError = isset($response['errorCategory']) && is_string($response['errorCategory'])
            ? $response['errorCategory']
            : null;

        if ($transportError !== null && $transportError !== '') {
            return ProviderResult::failure(
                self::PROVIDER_NAME,
                $model,
                $this->normalizeTransportErrorCategory($transportError, $status),
                'failed',
                ['status' => $status]
            );
        }

        if ($status === 401 || $status === 403) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'authentication_failed', 'failed', ['status' => $status]);
        }
        if ($status === 404) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'not_found', 'failed', ['status' => $status]);
        }
        if ($status === 408) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'timeout', 'failed', ['status' => $status]);
        }
        if ($status === 413) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'payload_too_large', 'failed', ['status' => $status]);
        }
        if ($status === 429) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'rate_limited', 'failed', ['status' => $status]);
        }
        if ($status >= 500) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'http_server_error', 'failed', ['status' => $status]);
        }
        if ($status < 200 || $status >= 300) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'http_client_error', 'failed', ['status' => $status]);
        }

        $responseHeaders = is_array($response['headers'] ?? null) ? $response['headers'] : [];
        $contentType = '';
        foreach (['Content-Type', 'content-type'] as $headerName) {
            if (isset($responseHeaders[$headerName]) && is_string($responseHeaders[$headerName])) {
                $contentType = strtolower(trim($responseHeaders[$headerName]));
                break;
            }
        }
        if ($contentType === ''
            || (!str_contains($contentType, 'application/json') && !str_contains($contentType, '+json'))
        ) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'invalid_content_type', 'failed', ['status' => $status]);
        }

        $maxBytes = (int) ($options['max_response_bytes'] ?? 200000);
        if (strlen($rawBody) > $maxBytes) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'response_too_large');
        }
        if ($rawBody === '') {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'empty_response', 'failed', ['status' => $status]);
        }

        try {
            $decoded = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'invalid_json', 'failed', ['status' => $status]);
        }

        if (!is_array($decoded)) {
            return ProviderResult::failure(self::PROVIDER_NAME, $model, 'invalid_json');
        }

        $normalized = $this->normalizeSuccessfulPayload($decoded);
        if (($normalized['ok'] ?? false) !== true) {
            return new ProviderResult(
                false,
                null,
                self::PROVIDER_NAME,
                $model,
                'failed',
                (string) ($normalized['errorCategory'] ?? 'unsupported_schema'),
                null,
                array_key_exists('inputTokens', $normalized) ? $normalized['inputTokens'] : null,
                array_key_exists('outputTokens', $normalized) ? $normalized['outputTokens'] : null,
                ['status' => $status]
            );
        }

        return new ProviderResult(
            true,
            (string) $normalized['answer'],
            self::PROVIDER_NAME,
            $model,
            'ok',
            null,
            is_string($normalized['finishReason'] ?? null) ? $normalized['finishReason'] : null,
            array_key_exists('inputTokens', $normalized) ? $normalized['inputTokens'] : null,
            array_key_exists('outputTokens', $normalized) ? $normalized['outputTokens'] : null,
            $decoded
        );
    }

    /**
     * @param array<string, mixed> $decoded
     * @return array{
     *   ok: bool,
     *   answer?: string,
     *   finishReason?: ?string,
     *   inputTokens?: ?int,
     *   outputTokens?: ?int,
     *   errorCategory?: string
     * }
     */
    private function normalizeSuccessfulPayload(array $decoded): array
    {
        $hasSuccessKey = array_key_exists('success', $decoded);

        if ($hasSuccessKey && $decoded['success'] === false) {
            return ['ok' => false, 'errorCategory' => 'provider_success_false'];
        }

        if ($hasSuccessKey && $decoded['success'] === true) {
            if (!array_key_exists('result', $decoded)) {
                return ['ok' => false, 'errorCategory' => 'unrecognized_response'];
            }
            if (!is_array($decoded['result'])) {
                return ['ok' => false, 'errorCategory' => 'unrecognized_response'];
            }

            return $this->normalizeModelPayload($decoded['result']);
        }

        // Direct model payload (no Cloudflare success envelope).
        return $this->normalizeModelPayload($decoded);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{
     *   ok: bool,
     *   answer?: string,
     *   finishReason?: ?string,
     *   inputTokens?: ?int,
     *   outputTokens?: ?int,
     *   errorCategory?: string
     * }
     */
    private function normalizeModelPayload(array $payload): array
    {
        $statusCheck = $this->evaluateCompletionStatus($payload);
        if ($statusCheck !== null) {
            return ['ok' => false, 'errorCategory' => $this->normalizeSchemaErrorCategory($statusCheck)];
        }

        $answers = [];
        $choiceFinishReason = null;
        $locationError = null;

        if (array_key_exists('response', $payload)) {
            if (!is_string($payload['response'])) {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            $text = trim($payload['response']);
            if ($text !== '') {
                $answers['response'] = $text;
            }
        }

        if (array_key_exists('output_text', $payload)) {
            if (!is_string($payload['output_text'])) {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            $text = trim($payload['output_text']);
            if ($text !== '') {
                $answers['output_text'] = $text;
            }
        }

        if (array_key_exists('output', $payload)) {
            if (!is_array($payload['output'])) {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            $fromOutput = $this->extractFromResponsesOutput($payload['output']);
            if (($fromOutput['ok'] ?? false) === true
                && isset($fromOutput['answer'])
                && is_string($fromOutput['answer'])
                && $fromOutput['answer'] !== ''
            ) {
                $answers['responses_output'] = $fromOutput['answer'];
            } else {
                $locationError = $this->normalizeSchemaErrorCategory(
                    (string) ($fromOutput['errorCategory'] ?? 'incomplete_response')
                );
                // Empty/invalid output alongside another answer location is malformed.
                if ($answers !== []) {
                    return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
                }
            }
        }

        if (array_key_exists('choices', $payload)) {
            if (!is_array($payload['choices'])) {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            $fromChoices = $this->extractFromChoices($payload['choices']);
            if (($fromChoices['ok'] ?? false) === true
                && isset($fromChoices['answer'])
                && is_string($fromChoices['answer'])
                && $fromChoices['answer'] !== ''
            ) {
                $answers['choices'] = $fromChoices['answer'];
                $choiceFinishReason = isset($fromChoices['finishReason']) && is_string($fromChoices['finishReason'])
                    ? $fromChoices['finishReason']
                    : null;
            } else {
                $choiceError = $this->normalizeSchemaErrorCategory(
                    (string) ($fromChoices['errorCategory'] ?? 'incomplete_response')
                );
                if ($answers !== []) {
                    return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
                }
                $locationError = $choiceError;
            }
        }

        if ($answers === []) {
            return ['ok' => false, 'errorCategory' => $this->normalizeSchemaErrorCategory($locationError ?? 'incomplete_response')];
        }

        $unique = array_values(array_unique(array_values($answers)));
        if (count($unique) > 1) {
            return ['ok' => false, 'errorCategory' => 'conflicting_answers'];
        }

        $answer = $unique[0];
        $inputTokens = $this->extractTokenCount($payload, ['input_tokens', 'prompt_tokens']);
        $outputTokens = $this->extractTokenCount($payload, ['output_tokens', 'completion_tokens']);
        $finish = $this->evaluateFinishReason($payload, $choiceFinishReason);
        if (($finish['ok'] ?? false) !== true) {
            return [
                'ok' => false,
                'errorCategory' => (string) ($finish['errorCategory'] ?? 'incomplete_response'),
                'inputTokens' => $inputTokens,
                'outputTokens' => $outputTokens,
            ];
        }

        return [
            'ok' => true,
            'answer' => $answer,
            'finishReason' => (string) ($finish['finishReason'] ?? 'completed'),
            'inputTokens' => $inputTokens,
            'outputTokens' => $outputTokens,
        ];
    }

    private function normalizeSchemaErrorCategory(string $category): string
    {
        return match ($category) {
            'empty_answer' => 'incomplete_response',
            'unrecognized_response' => 'unsupported_schema',
            'incomplete_status' => 'incomplete_response',
            default => $category,
        };
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function evaluateCompletionStatus(array $payload): ?string
    {
        if (!array_key_exists('status', $payload)) {
            return null;
        }
        if (!is_string($payload['status']) || $payload['status'] === '') {
            return 'unsupported_schema';
        }

        $status = strtolower(trim($payload['status']));
        if (in_array($status, self::COMPLETE_STATUSES, true)) {
            return null;
        }
        if (in_array($status, self::REJECTED_STATUSES, true)) {
            return 'incomplete_response';
        }

        return 'incomplete_response';
    }

    /**
     * @param list<mixed> $output
     * @return array{ok: bool, answer?: string, errorCategory?: string}
     */
    private function extractFromResponsesOutput(array $output): array
    {
        if ($output === []) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        $sawReasoning = false;
        $sawTool = false;
        $sawMessage = false;
        $parts = [];

        foreach ($output as $item) {
            if (!is_array($item)) {
                continue;
            }
            $type = strtolower(trim((string) ($item['type'] ?? '')));

            if ($type === 'reasoning') {
                $sawReasoning = true;
                continue;
            }

            if (in_array($type, ['function_call', 'tool_call', 'custom_tool_call'], true)) {
                $sawTool = true;
                continue;
            }

            if ($type !== 'message') {
                // Ignore unrecognized non-answer item types rather than scraping them.
                continue;
            }

            $role = strtolower(trim((string) ($item['role'] ?? 'assistant')));
            if ($role !== '' && $role !== 'assistant') {
                continue;
            }

            $sawMessage = true;
            $content = $item['content'] ?? null;
            if (!is_array($content) || $content === []) {
                continue;
            }

            foreach ($content as $contentItem) {
                if (!is_array($contentItem)) {
                    continue;
                }
                $contentType = strtolower(trim((string) ($contentItem['type'] ?? '')));
                if ($contentType !== 'output_text') {
                    continue;
                }
                if (!isset($contentItem['text']) || !is_string($contentItem['text'])) {
                    continue;
                }
                $text = trim($contentItem['text']);
                if ($text !== '') {
                    $parts[] = $text;
                }
            }
        }

        if ($parts !== []) {
            return ['ok' => true, 'answer' => implode('', $parts)];
        }

        if ($sawTool && !$sawMessage) {
            return ['ok' => false, 'errorCategory' => 'tool_only_output'];
        }
        if ($sawReasoning && !$sawMessage) {
            return ['ok' => false, 'errorCategory' => 'reasoning_only_output'];
        }
        if ($sawMessage) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }
        if ($sawTool) {
            return ['ok' => false, 'errorCategory' => 'tool_only_output'];
        }
        if ($sawReasoning) {
            return ['ok' => false, 'errorCategory' => 'reasoning_only_output'];
        }

        return ['ok' => false, 'errorCategory' => 'incomplete_response'];
    }

    /**
     * @param list<mixed> $choices
     * @return array{ok: bool, answer?: string, finishReason?: ?string, errorCategory?: string}
     */
    private function extractFromChoices(array $choices): array
    {
        if ($choices === []) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        $first = $choices[0] ?? null;
        if (!is_array($first)) {
            return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
        }

        $message = $first['message'] ?? null;
        if (!is_array($message)) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        if (array_key_exists('role', $message)) {
            if (!is_string($message['role'])) {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            $role = strtolower(trim($message['role']));
            if ($role !== 'assistant') {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
        }

        $hasToolCalls = isset($message['tool_calls'])
            && is_array($message['tool_calls'])
            && $message['tool_calls'] !== [];
        $hasReasoning = array_key_exists('reasoning_content', $message)
            && $message['reasoning_content'] !== null
            && $message['reasoning_content'] !== '';

        $contentResult = $this->extractAssistantMessageContent($message['content'] ?? null);
        if (($contentResult['ok'] ?? false) !== true) {
            $contentError = (string) ($contentResult['errorCategory'] ?? 'incomplete_response');
            if ($hasToolCalls && in_array($contentError, ['incomplete_response', 'empty_answer'], true)) {
                return ['ok' => false, 'errorCategory' => 'tool_only_output'];
            }
            if ($hasReasoning && in_array($contentError, ['incomplete_response', 'empty_answer'], true)) {
                return ['ok' => false, 'errorCategory' => 'reasoning_only_output'];
            }

            return ['ok' => false, 'errorCategory' => $contentError];
        }

        $finish = isset($first['finish_reason']) && is_string($first['finish_reason'])
            ? $first['finish_reason']
            : null;

        return [
            'ok' => true,
            'answer' => (string) $contentResult['answer'],
            'finishReason' => $finish,
        ];
    }

    /**
     * Extract visitor-facing assistant text from recognized Chat Completions content shapes only.
     *
     * @return array{ok: bool, answer?: string, errorCategory?: string}
     */
    private function extractAssistantMessageContent(mixed $content): array
    {
        if ($content === null) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        if (is_string($content)) {
            $text = trim($content);
            if ($text === '') {
                return ['ok' => false, 'errorCategory' => 'incomplete_response'];
            }

            return ['ok' => true, 'answer' => $text];
        }

        if (!is_array($content)) {
            return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
        }

        if ($content === []) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        // Object content (associative) is not a recognized Chat Completions shape.
        if (!array_is_list($content)) {
            return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
        }

        $texts = [];
        $sawReasoning = false;
        $sawTool = false;

        foreach ($content as $item) {
            if (!is_array($item)) {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            $type = strtolower(trim((string) ($item['type'] ?? '')));
            if ($type === 'reasoning' || $type === 'reasoning_content') {
                $sawReasoning = true;
                continue;
            }
            if (in_array($type, ['tool_call', 'function_call', 'tool_use'], true)) {
                $sawTool = true;
                continue;
            }
            if ($type !== 'text' && $type !== 'output_text') {
                return ['ok' => false, 'errorCategory' => 'unsupported_schema'];
            }
            if (!isset($item['text']) || !is_string($item['text'])) {
                return ['ok' => false, 'errorCategory' => 'incomplete_response'];
            }
            $part = trim($item['text']);
            if ($part === '') {
                return ['ok' => false, 'errorCategory' => 'incomplete_response'];
            }
            $texts[] = $part;
        }

        if ($texts === []) {
            if ($sawTool) {
                return ['ok' => false, 'errorCategory' => 'tool_only_output'];
            }
            if ($sawReasoning) {
                return ['ok' => false, 'errorCategory' => 'reasoning_only_output'];
            }

            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        $unique = array_values(array_unique($texts));
        if (count($unique) > 1) {
            return ['ok' => false, 'errorCategory' => 'conflicting_answers'];
        }

        return ['ok' => true, 'answer' => $unique[0]];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, finishReason?: string, errorCategory?: string}
     */
    private function evaluateFinishReason(array $payload, ?string $choiceFinishReason): array
    {
        $raw = null;
        if (is_string($choiceFinishReason) && $choiceFinishReason !== '') {
            $raw = $choiceFinishReason;
        } elseif (isset($payload['finish_reason']) && is_string($payload['finish_reason']) && $payload['finish_reason'] !== '') {
            $raw = $payload['finish_reason'];
        }

        if ($raw === null) {
            return ['ok' => true, 'finishReason' => 'completed'];
        }

        $normalized = strtolower(trim($raw));
        if (in_array($normalized, ['stop', 'completed', 'success'], true)) {
            return ['ok' => true, 'finishReason' => $normalized === 'stop' ? 'stop' : 'completed'];
        }

        if (in_array($normalized, ['length', 'content_filter', 'tool_calls', 'failed', 'cancelled', 'canceled', 'incomplete'], true)) {
            return ['ok' => false, 'errorCategory' => 'incomplete_response'];
        }

        return ['ok' => false, 'errorCategory' => 'incomplete_response'];
    }

    /**
     * @param array<string, mixed> $payload
     * @deprecated Use evaluateFinishReason; retained only for call-site clarity during transition.
     */
    private function normalizeFinishReason(array $payload, ?string $choiceFinishReason): ?string
    {
        $evaluated = $this->evaluateFinishReason($payload, $choiceFinishReason);

        return (($evaluated['ok'] ?? false) === true && isset($evaluated['finishReason']))
            ? (string) $evaluated['finishReason']
            : null;
    }

    private function normalizeTransportErrorCategory(string $category, int $status): string
    {
        $aliases = [
            'transport_unavailable' => 'unknown_transport_error',
            'transport_error' => 'unknown_transport_error',
            'non_json_response' => 'invalid_content_type',
            'html_response' => 'invalid_content_type',
            'http_error' => 'http_client_error',
            'upstream_error' => 'http_server_error',
        ];
        if (isset($aliases[$category])) {
            $category = $aliases[$category];
        }

        $allowed = [
            'none',
            'dns_failed',
            'connection_failed',
            'timeout',
            'tls_failed',
            'response_write_failed',
            'empty_response',
            'response_too_large',
            'http_client_error',
            'http_server_error',
            'invalid_content_type',
            'invalid_json',
            'unknown_transport_error',
            'authentication_failed',
            'not_found',
            'rate_limited',
            'payload_too_large',
            'https_required',
            'host_not_allowed',
            'method_not_allowed',
            'redirect_not_followed',
            'redirects_not_allowed',
            'invalid_url',
        ];
        if (in_array($category, $allowed, true)) {
            return $category;
        }
        if ($status === 401 || $status === 403) {
            return 'authentication_failed';
        }
        if ($status === 429) {
            return 'rate_limited';
        }
        if ($status >= 500) {
            return 'http_server_error';
        }
        if ($status >= 400) {
            return 'http_client_error';
        }

        return 'unknown_transport_error';
    }

    private function isAllowedCloudflareUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (!is_array($parts)) {
            return false;
        }
        if (($parts['scheme'] ?? '') !== 'https') {
            return false;
        }
        if (($parts['host'] ?? '') !== self::ALLOWED_HOST) {
            return false;
        }
        $path = (string) ($parts['path'] ?? '');
        return str_contains($path, '/client/v4/accounts/')
            && str_contains($path, '/ai/run/' . self::MODEL_NAME);
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     * @return list<array{role: string, content: string}>
     */
    private function normalizeMessages(array $messages): array
    {
        $normalized = [];
        foreach ($messages as $message) {
            if (!is_array($message)) {
                continue;
            }
            $role = (string) ($message['role'] ?? '');
            $content = (string) ($message['content'] ?? '');
            if ($role === '' || $content === '') {
                continue;
            }
            if (!in_array($role, ['system', 'user', 'assistant'], true)) {
                continue;
            }
            $normalized[] = [
                'role' => $role,
                'content' => $content,
            ];
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string> $keys
     */
    private function extractTokenCount(array $payload, array $keys): ?int
    {
        $usageBags = [];
        if (isset($payload['usage']) && is_array($payload['usage'])) {
            $usageBags[] = $payload['usage'];
        }
        $usageBags[] = $payload;

        foreach ($usageBags as $bag) {
            foreach ($keys as $key) {
                if (isset($bag[$key]) && is_numeric($bag[$key])) {
                    return (int) $bag[$key];
                }
            }
        }

        return null;
    }
}

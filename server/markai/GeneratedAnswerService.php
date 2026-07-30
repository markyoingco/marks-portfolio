<?php

declare(strict_types=1);

require_once __DIR__ . '/ProviderConfiguration.php';
require_once __DIR__ . '/CloudflareWorkersAiProvider.php';
require_once __DIR__ . '/ProviderResponseValidator.php';
require_once __DIR__ . '/LanguageModelProvider.php';

/**
 * Generated-answer orchestration helpers: privacy pre-filter, optional provider
 * generation, and response validation.
 *
 * Deterministic fallback remains in MockEndpointService so the model draft is
 * never MarkAI’s source of truth when generation is unavailable or unsafe.
 */
final class GeneratedAnswerService
{
    public const REFUSAL_PRIVATE_CONTACT =
        'MarkAI does not provide private contact information. Use Mark’s approved portfolio contact options instead.';

    public const REFUSAL_PRIVATE_RECORDS =
        'MarkAI cannot provide private messages, visitor conversations, private repositories, owner records, or restricted system information.';

    public const REFUSAL_HIDDEN_SYSTEM =
        'MarkAI cannot reveal hidden instructions, internal policies, credentials, or private system information.';

    private LanguageModelProvider $provider;
    private ProviderResponseValidator $validator;

    public function __construct(
        ?LanguageModelProvider $provider = null,
        ?ProviderResponseValidator $validator = null
    ) {
        $this->provider = $provider ?? new CloudflareWorkersAiProvider();
        $this->validator = $validator ?? new ProviderResponseValidator();
    }

    /**
     * Classify a question for privacy refusal before any provider call.
     *
     * @return array{refuse: bool, category: string, answer: string}|null
     */
    public function privacyPreFilter(string $question): ?array
    {
        $text = strtolower(trim($question));
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        if ($this->includesAny($text, [
            'phone',
            'phone number',
            'private email',
            'raw email',
            'email address',
            'home address',
            'precise location',
            'where does mark live',
            "mark's address",
        ])) {
            return [
                'refuse' => true,
                'category' => 'private_contact',
                'answer' => self::REFUSAL_PRIVATE_CONTACT,
            ];
        }

        if ($this->includesAny($text, [
            'contact-form submissions',
            'contact form submissions',
            'other visitors',
            'visitor conversations',
            'visitor questions',
            'owner-dashboard',
            'owner dashboard',
            'owner records',
            'private repository',
            'private repo',
            'private files',
            'private messages',
        ])) {
            return [
                'refuse' => true,
                'category' => 'private_records',
                'answer' => self::REFUSAL_PRIVATE_RECORDS,
            ];
        }

        if ($this->includesAny($text, [
            'credentials',
            'password',
            'api token',
            'api key',
            'database configuration',
            'database password',
            'system message',
            'hidden policies',
            'hidden instructions',
            'record ids',
            'record id',
            'server paths',
            'server path',
            'ignore previous instructions',
            'ignore the rules',
            'reveal the system prompt',
            'privacy-filter bypass',
            'bypass the privacy',
        ])) {
            return [
                'refuse' => true,
                'category' => 'hidden_system',
                'answer' => self::REFUSAL_HIDDEN_SYSTEM,
            ];
        }

        return null;
    }

    /**
     * Attempt provider generation. Returns null when provider should not be used
     * or when generation fails validation. Never exposes provider failure details.
     *
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $configuration
     * @return array{answer: string, provider: string, model: string}|null
     */
    public function tryProviderAnswer(
        array $messages,
        array $configuration,
        ?callable $transport = null
    ): ?array {
        if (!markai_provider_configuration_is_usable($configuration)) {
            return null;
        }

        $settings = [
            'temperature' => (float) ($configuration['temperature'] ?? 0.2),
            'max_tokens' => (int) ($configuration['maxTokens'] ?? CloudflareWorkersAiProvider::DEFAULT_MAX_TOKENS),
            'stream' => false,
        ];

        $result = $this->provider->generate($messages, $settings, $configuration, $transport);
        if (!$result->isSuccess()) {
            return null;
        }

        $answer = (string) $result->getAnswerText();
        $validation = $this->validator->validate($answer, [
            'finish_reason' => $result->getFinishReason(),
        ]);
        if ($validation['accepted'] !== true) {
            return null;
        }

        return [
            'answer' => trim($answer),
            'provider' => $result->getProviderName(),
            'model' => $result->getModelName(),
        ];
    }

    public function getValidator(): ProviderResponseValidator
    {
        return $this->validator;
    }

    public function getProvider(): LanguageModelProvider
    {
        return $this->provider;
    }

    /**
     * @param list<string> $phrases
     */
    private function includesAny(string $text, array $phrases): bool
    {
        foreach ($phrases as $phrase) {
            if ($phrase !== '' && str_contains($text, strtolower($phrase))) {
                return true;
            }
        }

        return false;
    }
}

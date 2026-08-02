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

    public const REFUSAL_PROFESSIONAL_ONLY =
        'MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.';

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

        if ($this->includesAny($text, [
            'family problems',
            'family conflict',
            'family issues',
            'family financial',
            'family’s financial',
            "family's financial",
            'support his family',
            'supporting family',
            'why support his family',
            'need to support his family',
            'does mark need to support',
            'what does family mean',
            'family mean to his goals',
            'tell me about mark’s family',
            "tell me about mark's family",
            'tell me about marks family',
            'about mark’s family',
            "about mark's family",
            'about his family',
            'mark’s family',
            "mark's family",
            'his family',
            'friends and family',
            'with friends and family',
            'time with family',
            'spending time with family',
            'financial hardship',
            'financial problems',
            'struggling with money',
            'money situation',
            'being broke',
            'is mark broke',
            'why does mark need money',
            'why does he need money',
            'how much money',
            'what salary',
            'salary does mark need',
            'depend on his family',
            'depending on family',
            'girlfriend',
            'boyfriend',
            'breakup',
            'romantic',
            'dating',
            'who is mark dating',
            'mental health',
            'mental-health',
            'medical history',
            'medical conditions',
            'addiction',
            'private messages',
            'where exactly does mark live',
            'exact address',
            'home address',
            'precise residence',
            'precise location',
            'private contact',
            'private contact details',
            'private phone',
            'private phone number',
            'private problems',
            'private messages',
            'private journal',
            'private diary',
            'show me mark’s private journal',
            "show me mark's private journal",
            'mental health issues',
            'mental-health issues',
            'what addictions',
            'addictions has mark',
            'credentials',
            'api token',
            'api tokens',
            'password',
        ])) {
            return [
                'refuse' => true,
                'category' => 'professional_privacy',
                'answer' => self::REFUSAL_PROFESSIONAL_ONLY,
            ];
        }

        return null;
    }

    /**
     * Attempt provider generation.
     *
     * Returns accepted=true with answer text on success.
     * Returns accepted=false with a public errorCode when live generation is
     * unavailable. Never exposes provider failure details, tokens, or paths.
     *
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $configuration
     * @return array{accepted: true, answer: string, provider: string, model: string}|array{accepted: false, errorCode: string}
     */
    public function tryProviderAnswer(
        array $messages,
        array $configuration,
        ?callable $transport = null
    ): array {
        require_once __DIR__ . '/MarkAiUserFacingStatus.php';

        if (!markai_provider_configuration_is_usable($configuration)) {
            return [
                'accepted' => false,
                'errorCode' => MarkAiUserFacingStatus::CODE_PROVIDER_DISABLED,
            ];
        }

        $settings = [
            'temperature' => (float) ($configuration['temperature'] ?? 0.2),
            'max_tokens' => (int) ($configuration['maxTokens'] ?? CloudflareWorkersAiProvider::DEFAULT_MAX_TOKENS),
            'stream' => false,
        ];

        $result = $this->provider->generate($messages, $settings, $configuration, $transport);
        if (!$result->isSuccess()) {
            return [
                'accepted' => false,
                'errorCode' => MarkAiUserFacingStatus::fromProviderCategory($result->getErrorCategory()),
            ];
        }

        $answer = (string) $result->getAnswerText();
        $validation = $this->validator->validate($answer, [
            'finish_reason' => $result->getFinishReason(),
        ]);
        if ($validation['accepted'] !== true) {
            return [
                'accepted' => false,
                'errorCode' => MarkAiUserFacingStatus::CODE_PROVIDER_UNAVAILABLE,
            ];
        }

        return [
            'accepted' => true,
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

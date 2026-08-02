<?php

declare(strict_types=1);

/**
 * Server-side generated-response guardrails.
 *
 * Independent of prompt instructions. A generated answer must pass these checks
 * before it can be returned to a visitor.
 */
final class ProviderResponseValidator
{
    /** Hard cap on visitor-facing generated answers (internal max_tokens is separate). */
    public const MAX_ANSWER_CHARS = 1200;

    /**
     * Allowlisted diagnostic reasons. Never include matched text or answer content.
     *
     * @var list<string>
     */
    public const ALLOWLISTED_REASONS = [
        'accepted',
        'empty_answer',
        'answer_too_long',
        'apparent_truncation',
        'excessive_repetition',
        'duplicate_sentence',
        'qualifier_drift',
        'ownership_exaggeration',
        'unsupported_claim',
        'private_information',
        'forbidden_link',
        'private_repository',
        'prompt_injection',
        'system_prompt_leak',
        'reasoning_leak',
        'internal_link_identifier',
        'malformed_answer',
        'unsafe_technology_claim',
        'unknown_validation_failure',
    ];

    /**
     * Allowlisted exact-claim diagnostic details. Never include matched text.
     *
     * @var list<string>
     */
    public const ALLOWLISTED_DETAILS = [
        'abacus_scale_approximation',
        'abacus_scale_range',
        'abacus_scale_thousands',
        'abacus_audience_scope',
        'abacus_event_date',
        'abacus_scale_event_context',
        'abacus_stability_absolute',
        'abacus_stability_qualifier',
        'finch_frontend_ownership',
        'maat_plagiarism_ownership',
        'vite_validation_claim',
        'locust_benchmark_claim',
        'dbeaver_database_claim',
        'socketio_rest_claim',
        'judge0_ownership_claim',
        'unsupported_ranking_claim',
    ];

    /**
     * Map fine-grained internal reject codes to allowlisted diagnostic reasons.
     *
     * @var array<string, string>
     */
    private const INTERNAL_REASON_MAP = [
        'invalid_utf8' => 'malformed_answer',
        'empty_answer' => 'empty_answer',
        'answer_too_long' => 'answer_too_long',
        'truncated_finish_reason' => 'apparent_truncation',
        'truncated_answer' => 'apparent_truncation',
        'repeated_word_corruption' => 'excessive_repetition',
        'duplicated_sentence_corruption' => 'duplicate_sentence',
        'prompt_injection_signal' => 'prompt_injection',
        'system_prompt_leak_signal' => 'system_prompt_leak',
        'reasoning_disclosure' => 'reasoning_leak',
        'internal_link_identifier' => 'internal_link_identifier',
        'internal_leakage' => 'system_prompt_leak',
        'credential_leakage' => 'private_information',
        'private_contact_leakage' => 'private_information',
        'unsupported_personal_claim' => 'private_information',
        'private_repository_leakage' => 'private_repository',
        'untrusted_link_or_markup' => 'forbidden_link',
        'abacus_scale_qualifier_drift' => 'qualifier_drift',
        'abacus_scale_exact_300' => 'qualifier_drift',
        'abacus_scale_more_than_300' => 'qualifier_drift',
        'abacus_scale_inflated_users' => 'qualifier_drift',
        'abacus_scale_enterprise_or_thousands' => 'qualifier_drift',
        'abacus_scale_unapproved_wording' => 'qualifier_drift',
        'abacus_scale_missing_approximation' => 'qualifier_drift',
        'abacus_scale_missing_event_context' => 'qualifier_drift',
        'abacus_scale_missing_event_date' => 'qualifier_drift',
        'abacus_scale_missing_audience' => 'qualifier_drift',
        'abacus_stability_overclaim' => 'unsupported_claim',
        'abacus_stability_absolute' => 'unsupported_claim',
        'abacus_stability_qualifier' => 'unsupported_claim',
        'finch_ownership_overclaim' => 'ownership_exaggeration',
        'maat_ownership_overclaim' => 'ownership_exaggeration',
        'unsupported_testing_claim' => 'unsupported_claim',
        'unsupported_vitest_claim' => 'unsupported_claim',
        'unsupported_locust_claim' => 'unsupported_claim',
        'unsupported_tool_claim' => 'unsafe_technology_claim',
        'unsupported_dbeaver_claim' => 'unsafe_technology_claim',
        'unsupported_judge0_claim' => 'unsafe_technology_claim',
        'unsupported_vite_tool_claim' => 'unsafe_technology_claim',
        'unsupported_socketio_claim' => 'unsafe_technology_claim',
        'unsupported_subjective_ranking' => 'unsupported_claim',
    ];

    /**
     * Map fine-grained internal reject codes to allowlisted validation details.
     *
     * @var array<string, string>
     */
    private const INTERNAL_DETAIL_MAP = [
        'abacus_scale_qualifier_drift' => 'abacus_scale_approximation',
        'abacus_scale_missing_approximation' => 'abacus_scale_approximation',
        'abacus_scale_exact_300' => 'abacus_scale_range',
        'abacus_scale_more_than_300' => 'abacus_scale_range',
        'abacus_scale_enterprise_or_thousands' => 'abacus_scale_thousands',
        'abacus_scale_inflated_users' => 'abacus_audience_scope',
        'abacus_scale_missing_audience' => 'abacus_audience_scope',
        'abacus_scale_missing_event_date' => 'abacus_event_date',
        'abacus_scale_missing_event_context' => 'abacus_scale_event_context',
        'abacus_scale_unapproved_wording' => 'abacus_scale_approximation',
        'abacus_stability_overclaim' => 'abacus_stability_qualifier',
        'abacus_stability_absolute' => 'abacus_stability_absolute',
        'abacus_stability_qualifier' => 'abacus_stability_qualifier',
        'finch_ownership_overclaim' => 'finch_frontend_ownership',
        'maat_ownership_overclaim' => 'maat_plagiarism_ownership',
        'unsupported_vitest_claim' => 'vite_validation_claim',
        'unsupported_vite_tool_claim' => 'vite_validation_claim',
        'unsupported_locust_claim' => 'locust_benchmark_claim',
        'unsupported_testing_claim' => 'locust_benchmark_claim',
        'unsupported_dbeaver_claim' => 'dbeaver_database_claim',
        'unsupported_socketio_claim' => 'socketio_rest_claim',
        'unsupported_judge0_claim' => 'judge0_ownership_claim',
        'unsupported_tool_claim' => 'dbeaver_database_claim',
        'unsupported_subjective_ranking' => 'unsupported_ranking_claim',
    ];

    /**
     * Compatibility wrapper. Returns accepted + allowlisted reason (null when accepted).
     *
     * @param array<string, mixed>|null $providerMeta Optional finish_reason and related metadata
     * @return array{accepted: bool, reason: ?string}
     */
    public function validate(string $answer, ?array $providerMeta = null): array
    {
        $detailed = $this->validateDetailed($answer, $providerMeta);

        return [
            'accepted' => $detailed['accepted'],
            'reason' => $detailed['accepted'] ? null : $detailed['reason'],
        ];
    }

    /**
     * Structured validation result for safe diagnostics.
     * Never includes the generated answer, match text, prompts, or credentials.
     *
     * @param array<string, mixed>|null $providerMeta
     * @return array{
     *   accepted: bool,
     *   reason: string,
     *   detail: ?string,
     *   generatedAnswerChars: int,
     *   generatedAnswerWords: int,
     *   generatedAnswerSentences: int
     * }
     */
    public function validateDetailed(string $answer, ?array $providerMeta = null): array
    {
        $chars = 0;
        $words = 0;
        $sentences = 0;

        if ($this->isValidUtf8($answer)) {
            $trimmedForCounts = trim($answer);
            $chars = $this->strlen($trimmedForCounts);
            $words = $this->countWords($trimmedForCounts);
            $sentences = $this->countSentences($trimmedForCounts);
        }

        $internal = $this->evaluate($answer, $providerMeta);
        $accepted = ($internal['accepted'] ?? false) === true;
        $internalReason = is_string($internal['reason'] ?? null) ? (string) $internal['reason'] : null;
        $reason = $accepted ? 'accepted' : $this->toAllowlistedReason($internalReason);
        $detail = $accepted ? null : $this->toAllowlistedDetail($internalReason);

        return [
            'accepted' => $accepted,
            'reason' => $reason,
            'detail' => $detail,
            'generatedAnswerChars' => $chars,
            'generatedAnswerWords' => $words,
            'generatedAnswerSentences' => $sentences,
        ];
    }

    public static function isAllowlistedReason(string $reason): bool
    {
        return in_array($reason, self::ALLOWLISTED_REASONS, true);
    }

    public static function isAllowlistedDetail(string $detail): bool
    {
        return in_array($detail, self::ALLOWLISTED_DETAILS, true);
    }

    /**
     * @param array<string, mixed>|null $providerMeta
     * @return array{accepted: bool, reason: ?string}
     */
    private function evaluate(string $answer, ?array $providerMeta = null): array
    {
        if (!$this->isValidUtf8($answer)) {
            return $this->reject('invalid_utf8');
        }

        $trimmed = trim($answer);
        if ($trimmed === '') {
            return $this->reject('empty_answer');
        }

        if ($this->strlen($trimmed) > self::MAX_ANSWER_CHARS) {
            return $this->reject('answer_too_long');
        }

        $finishReason = strtolower((string) ($providerMeta['finish_reason'] ?? $providerMeta['finishReason'] ?? ''));
        if (in_array($finishReason, ['length', 'max_tokens', 'truncated'], true)) {
            return $this->reject('truncated_finish_reason');
        }

        if ($this->appearsTruncated($trimmed)) {
            return $this->reject('truncated_answer');
        }

        if ($this->hasRepeatedWordCorruption($trimmed)) {
            return $this->reject('repeated_word_corruption');
        }

        if ($this->hasDuplicatedSentenceCorruption($trimmed)) {
            return $this->reject('duplicated_sentence_corruption');
        }

        if ($this->containsPromptInjectionSignal($trimmed)) {
            return $this->reject('prompt_injection_signal');
        }

        if ($this->containsReasoningDisclosure($trimmed)) {
            return $this->reject('reasoning_disclosure');
        }

        if ($this->containsInternalLinkIdentifier($trimmed)) {
            return $this->reject('internal_link_identifier');
        }

        if ($this->containsInternalLeakage($trimmed)) {
            return $this->reject('internal_leakage');
        }

        if ($this->containsSystemPromptLeakSignal($trimmed)) {
            return $this->reject('system_prompt_leak_signal');
        }

        if ($this->containsCredentialsOrSecrets($trimmed)) {
            return $this->reject('credential_leakage');
        }

        if ($this->containsPrivateContact($trimmed)) {
            return $this->reject('private_contact_leakage');
        }

        if ($this->containsUnsupportedPersonalClaims($trimmed)) {
            return $this->reject('unsupported_personal_claim');
        }

        if ($this->containsPrivateRepository($trimmed)) {
            return $this->reject('private_repository_leakage');
        }

        if ($this->containsUntrustedUrlOrMarkup($trimmed)) {
            return $this->reject('untrusted_link_or_markup');
        }

        $claim = $this->validateExactClaims($trimmed);
        if ($claim['accepted'] !== true) {
            return $claim;
        }

        return ['accepted' => true, 'reason' => null];
    }

    private function toAllowlistedReason(?string $internalReason): string
    {
        if ($internalReason === null || $internalReason === '') {
            return 'unknown_validation_failure';
        }

        $mapped = self::INTERNAL_REASON_MAP[$internalReason] ?? 'unknown_validation_failure';
        if (!self::isAllowlistedReason($mapped)) {
            return 'unknown_validation_failure';
        }

        return $mapped;
    }

    private function toAllowlistedDetail(?string $internalReason): ?string
    {
        if ($internalReason === null || $internalReason === '') {
            return null;
        }

        if (!isset(self::INTERNAL_DETAIL_MAP[$internalReason])) {
            return null;
        }

        $mapped = self::INTERNAL_DETAIL_MAP[$internalReason];
        if (!self::isAllowlistedDetail($mapped)) {
            return null;
        }

        return $mapped;
    }

    /**
     * @return array{accepted: bool, reason: ?string}
     */
    private function validateExactClaims(string $answer): array
    {
        $lower = $this->lower($answer);

        // Abacus scale qualifier drift / inflation.
        if (preg_match('/\b(roughly|about)\s+200\s*[-–—]\s*300\b/u', $lower)) {
            return $this->reject('abacus_scale_qualifier_drift');
        }
        if (preg_match('/\bexactly\s+300\b/u', $lower)) {
            return $this->reject('abacus_scale_exact_300');
        }
        if (preg_match('/\bmore\s+than\s+300\b/u', $lower)) {
            return $this->reject('abacus_scale_more_than_300');
        }
        if (preg_match('/\b300\s+customers\b|\bcustomer\s+base\b|\bdaily\s+users\b|\bdaily\s+active\s+users\b/u', $lower)) {
            return $this->reject('abacus_scale_inflated_users');
        }
        if (preg_match('/\benterprise(?:[-\s]+scale)?(?:\s+\w+)*\s+traffic\b|\bthousands\s+of\s+users\b/u', $lower)) {
            return $this->reject('abacus_scale_enterprise_or_thousands');
        }

        // If 200-300 appears, require approved Abacus event-scale context.
        // Same reject decision as before; detail identifies the first missing piece.
        if (preg_match('/200\s*[-–—]\s*300/u', $answer)) {
            $hasApprox = (bool) preg_match('/approximately\s+200\s*[-–—]\s*300/ui', $answer);
            $hasAbacusOrCompetition = (bool) preg_match('/\babacus\b|wisconsin-dairyland|programming competition/ui', $answer);
            $hasDate = (bool) preg_match('/april\s+15,?\s+2026/ui', $answer);
            $hasStakeholders = (bool) preg_match(
                '/(?:high-school\s+)?students?,?\s+teachers?,?\s+judges?,?\s+and\s+administrators/ui',
                $answer
            );
            if (!$hasApprox) {
                return $this->reject('abacus_scale_missing_approximation');
            }
            if (!$hasAbacusOrCompetition) {
                return $this->reject('abacus_scale_missing_event_context');
            }
            if (!$hasDate) {
                return $this->reject('abacus_scale_missing_event_date');
            }
            if (!$hasStakeholders) {
                return $this->reject('abacus_scale_missing_audience');
            }
        }

        // Abacus stability alterations / unsupported strengthening.
        $stabilityAbsolute = [
            'no noticeable lag',
            'no lag',
            'lag-free',
        ];
        foreach ($stabilityAbsolute as $phrase) {
            if (str_contains($lower, $phrase)) {
                return $this->reject('abacus_stability_absolute');
            }
        }
        $stabilityQualifier = [
            'flawless',
            'seamless',
            'stable environment',
            'functional environment',
            'smooth experience',
            'run smoothly',
            'ran smoothly',
            'proceeded on schedule',
            'successful for every participant',
        ];
        foreach ($stabilityQualifier as $phrase) {
            if (str_contains($lower, $phrase)) {
                return $this->reject('abacus_stability_qualifier');
            }
        }

        // Finch ownership / completion overclaims (affirmative).
        if ($this->affirmativeContains($lower, [
            'led the frontend',
            'led frontend',
            'was frontend lead',
            'frontend lead',
            'built the entire frontend',
            'completed simultaneous three-finch',
            'completed all three robots',
            'production-ready three-robot',
            'completed a production-ready three-robot deployment',
        ])) {
            return $this->reject('finch_ownership_overclaim');
        }

        // MAAT ownership overclaims.
        if ($this->affirmativeContains($lower, [
            'invented the plagiarism algorithm',
            'invented maat’s plagiarism algorithm',
            "invented maat's plagiarism algorithm",
            'solely built the plagiarism system',
            'owned every ast-analysis component',
            'owned every ast analysis component',
            'built maat alone',
            'built ta-bot alone',
        ])) {
            return $this->reject('maat_ownership_overclaim');
        }

        // Unsupported testing claims.
        if ($this->affirmativeContains($lower, [
            'uses vitest',
            'used vitest',
            'vitest framework',
            'automated unit-test suite',
            'automated unit test suite',
            'formal automated unit-test suite',
            'formal automated unit test suite',
        ])) {
            return $this->reject('unsupported_vitest_claim');
        }
        if ($this->affirmativeContains($lower, [
            'completed formal locust benchmark',
            'completed a formal locust benchmark',
            'exact locust benchmark results',
        ])) {
            return $this->reject('unsupported_locust_claim');
        }

        // Tool misconception claims.
        if ($this->affirmativeContains($lower, [
            'dbeaver is a database',
            'dbeaver was a database',
            'dbeaver was the database',
            'dbeaver is the database',
            'used dbeaver as a database',
        ])) {
            return $this->reject('unsupported_dbeaver_claim');
        }
        if ($this->affirmativeContains($lower, [
            'judge0 was created by mark',
            'mark created judge0',
        ])) {
            return $this->reject('unsupported_judge0_claim');
        }
        if ($this->affirmativeContains($lower, [
            'vite itself performs typescript syntax analysis',
            'vite validation proves a formal automated test suite',
        ])) {
            return $this->reject('unsupported_vite_tool_claim');
        }
        if ($this->affirmativeContains($lower, [
            'socket.io is rest',
            'socket.io is the rest',
            'socket.io is a rest api',
            'socket.io is the rest api',
        ])) {
            return $this->reject('unsupported_socketio_claim');
        }

        // Subjective ranking claims.
        if ($this->affirmativeContains($lower, [
            'key member',
            'lead developer',
            'primary developer',
            'leading contributor',
            'most important contributor',
            'bulk of his work',
            'constituted the bulk of his work',
            'expert in every technology',
            'expert in every listed technology',
            'elite candidate',
        ])) {
            return $this->reject('unsupported_subjective_ranking');
        }

        return ['accepted' => true, 'reason' => null];
    }

    private function appearsTruncated(string $answer): bool
    {
        // Ends with incomplete word fragment after whitespace+capital start is handled below.
        if (preg_match('/\s(?:the|a|an|to|of|and|or|for|with|which|that|this|from|into|by|as)$/iu', $answer)) {
            return true;
        }

        // Ends with unfinished list punctuation / connector.
        if (preg_match('/[,:;–—\-]\s*$/u', $answer)) {
            return true;
        }

        // Ends mid-word: last token has no terminal punctuation and looks cut (ends with lowercase letter cluster after "the ").
        if (preg_match('/\b[A-Za-z]{1,2}$/u', $answer) && !preg_match('/[.!?]["\')\]]*$/u', $answer)) {
            // Allow short answers that intentionally end with acronyms like "UI".
            if (!preg_match('/\b(?:UI|API|SQL|C|R|OS|TA|AV)$/u', $answer)) {
                return true;
            }
        }

        // Ends without sentence punctuation and last char is a letter (mid-sentence cut).
        if (preg_match('/[A-Za-z]$/u', $answer) && !preg_match('/[.!?]["\')\]]*$/u', $answer)) {
            // Allow short titles/labels under 80 chars that are intentionally incomplete fragments only if they end with allowed acronym — otherwise reject long mid-sentence cuts.
            if ($this->strlen($answer) >= 40) {
                return true;
            }
        }

        return false;
    }

    private function hasRepeatedWordCorruption(string $answer): bool
    {
        return (bool) preg_match('/\b([A-Za-z]{3,})\b(?:\s+\1\b){3,}/u', $answer);
    }

    private function hasDuplicatedSentenceCorruption(string $answer): bool
    {
        $parts = preg_split('/(?<=[.!?])\s+/u', $answer) ?: [];
        $normalized = [];
        foreach ($parts as $part) {
            $n = strtolower(trim($part));
            if ($n === '' || $this->strlen($n) < 20) {
                continue;
            }
            if (isset($normalized[$n])) {
                return true;
            }
            $normalized[$n] = true;
        }

        return false;
    }

    private function containsPromptInjectionSignal(string $answer): bool
    {
        return (bool) preg_match('/\bIgnore previous instructions\b/i', $answer);
    }

    /**
     * Internal field-name / reasoning-channel disclosure already treated as non-visitor output.
     * Pattern limited to the provider field name; does not broaden claim rules.
     */
    private function containsReasoningDisclosure(string $answer): bool
    {
        return (bool) preg_match('/\breasoning_content\b/i', $answer);
    }

    private function containsSystemPromptLeakSignal(string $answer): bool
    {
        return (bool) preg_match('/\bsystem message\b|\bhidden instructions?\b/i', $answer);
    }

    /**
     * Reject visitor-facing text that leaks internal trusted-link identifiers.
     * LinkedIn as a normal word must not disable the check.
     */
    private function containsInternalLinkIdentifier(string $answer): bool
    {
        $probe = preg_replace('/\blinkedIn\b/iu', '', $answer) ?? $answer;
        if (preg_match('/\blink-[a-z0-9\-]+\b/i', $probe) === 1) {
            return true;
        }
        if (preg_match('/`\s*link-[a-z0-9\-]+\s*`/i', $answer) === 1) {
            return true;
        }

        return false;
    }

    private function containsInternalLeakage(string $answer): bool
    {
        $patterns = [
            '/\bproject-[a-z0-9\-]+\b/i',
            '/\bcontrib-[a-z0-9\-]+\b/i',
            '/\bcontribution-[a-z0-9\-]+\b/i',
            '/\bskill-[a-z0-9\-]+\b/i',
            '/\bprivacy-[a-z0-9\-]+\b/i',
            '/\bvoice-[a-z0-9\-]+\b/i',
            '/\bserverPolicyIds\b/i',
            '/\bselectedRecordIds\b/i',
            '/\bapproved-v1\.json\b/i',
            '/\bmarkai-knowledge\b/i',
            '/\bPromptBuilder\.php\b/i',
            '/\bMockEndpointService\.php\b/i',
            '/\bCloudflareWorkersAiProvider\b/i',
            '/\bProviderResponseValidator\b/i',
            '/\bC:\\\\Users\\\\/i',
            '/\b\/server\/markai\b/i',
            '/\bstack trace\b/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $answer)) {
                return true;
            }
        }

        return false;
    }

    private function containsCredentialsOrSecrets(string $answer): bool
    {
        if (preg_match('/\b(api[_-]?key|api token|authorization:\s*bearer|password\s*[:=]|db_pass\s*[:=])/i', $answer)) {
            return true;
        }
        if (preg_match('/\byour_cloudflare_(account_id|workers_ai_token)\b/i', $answer)) {
            return true;
        }

        return false;
    }

    private function containsPrivateContact(string $answer): bool
    {
        if (preg_match('/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/', $answer)) {
            return true;
        }
        if (preg_match('/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/', $answer)) {
            return true;
        }

        return false;
    }

    /**
     * Reject genuinely sensitive or unapproved private claims.
     * Intentionally public interests (dog Kobe, favorite color black, named artists,
     * hobbies, personality, aesthetics) are not blocked here.
     */
    private function containsUnsupportedPersonalClaims(string $answer): bool
    {
        $lower = $this->lower($answer);

        $blockedPhrases = [
            'family problems',
            'family conflict',
            'family issues',
            'family financial',
            'supporting his family',
            'support his family',
            'depends on his family',
            'depending on family',
            'family routines',
            'spending time with friends and family',
            'spends time with friends and family',
            'time with friends and family',
            'friends and family',
            'private relationship',
            'girlfriend',
            'boyfriend',
            'dating',
            'medical history',
            'mental health',
            'financial hardship',
            'being broke',
            'bank account',
            'home address',
            'precise location',
            'where he lives',
            'current residence',
            'exact address',
            'private messages',
            'medical conditions',
            'private problems',
        ];

        foreach ($blockedPhrases as $phrase) {
            if ($this->affirmativeContains($lower, [$phrase])) {
                return true;
            }
        }

        return false;
    }

    private function containsPrivateRepository(string $answer): bool
    {
        return (bool) preg_match('/XINU26|ayazdani1/i', $answer);
    }

    private function containsUntrustedUrlOrMarkup(string $answer): bool
    {
        if (preg_match('/https?:\/\//i', $answer)) {
            return true;
        }
        if (preg_match('/<\s*(script|iframe|a|img|div|span|html|body)\b/i', $answer)) {
            return true;
        }
        if (preg_match('/\[[^\]]+\]\([^)]+\)/', $answer)) {
            return true;
        }

        return false;
    }

    /**
     * @param list<string> $phrases
     */
    private function affirmativeContains(string $lowerAnswer, array $phrases): bool
    {
        foreach ($phrases as $phrase) {
            $p = $this->lower($phrase);
            if (!str_contains($lowerAnswer, $p)) {
                continue;
            }
            // Allow negation / prohibition phrasing near the claim.
            if (preg_match(
                '/\b(do not|does not|did not|don\'t|doesn\'t|didn\'t|never|not|without|rather than)\b[^.!?]{0,40}' . preg_quote($p, '/') . '/u',
                $lowerAnswer
            )) {
                continue;
            }
            if (preg_match(
                '/' . preg_quote($p, '/') . '[^.!?]{0,40}\b(is not|was not|are not|were not)\b/u',
                $lowerAnswer
            )) {
                continue;
            }
            return true;
        }

        return false;
    }

    /**
     * @return array{accepted: bool, reason: ?string}
     */
    private function reject(string $reason): array
    {
        return ['accepted' => false, 'reason' => $reason];
    }

    private function countWords(string $answer): int
    {
        if ($answer === '') {
            return 0;
        }
        $parts = preg_split('/\s+/u', $answer, -1, PREG_SPLIT_NO_EMPTY);

        return is_array($parts) ? count($parts) : 0;
    }

    private function countSentences(string $answer): int
    {
        if ($answer === '') {
            return 0;
        }
        $parts = preg_split('/[.!?]+/u', $answer, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($parts)) {
            return 0;
        }
        $count = 0;
        foreach ($parts as $part) {
            if (trim($part) !== '') {
                $count++;
            }
        }

        return $count;
    }

    private function isValidUtf8(string $value): bool
    {
        if (function_exists('mb_check_encoding')) {
            return mb_check_encoding($value, 'UTF-8');
        }

        return preg_match('//u', $value) === 1;
    }

    private function lower(string $value): string
    {
        if (function_exists('mb_strtolower')) {
            return mb_strtolower($value, 'UTF-8');
        }

        return strtolower($value);
    }

    private function strlen(string $value): int
    {
        if (function_exists('mb_strlen')) {
            return (int) mb_strlen($value, 'UTF-8');
        }

        return strlen($value);
    }
}

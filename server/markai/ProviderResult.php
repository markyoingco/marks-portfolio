<?php

declare(strict_types=1);

require_once __DIR__ . '/ProviderResponseValidator.php';

/**
 * Normalized language-model provider result.
 *
 * Raw provider payloads may be retained for local fixtures/tests only and must
 * never be included in public visitor responses.
 */
final class ProviderResult
{
    private bool $success;
    private ?string $answerText;
    private string $providerName;
    private string $modelName;
    private string $status;
    private ?string $errorCategory;
    private ?string $finishReason;
    private ?int $inputTokens;
    private ?int $outputTokens;
    private mixed $rawPayload;
    private ?string $validationReason;
    private ?string $validationDetail;
    private ?int $generatedAnswerChars;
    private ?int $generatedAnswerWords;
    private ?int $generatedAnswerSentences;

    public function __construct(
        bool $success,
        ?string $answerText,
        string $providerName,
        string $modelName,
        string $status,
        ?string $errorCategory = null,
        ?string $finishReason = null,
        ?int $inputTokens = null,
        ?int $outputTokens = null,
        mixed $rawPayload = null,
        ?string $validationReason = null,
        ?int $generatedAnswerChars = null,
        ?int $generatedAnswerWords = null,
        ?int $generatedAnswerSentences = null,
        ?string $validationDetail = null
    ) {
        $this->success = $success;
        $this->answerText = $answerText;
        $this->providerName = $providerName;
        $this->modelName = $modelName;
        $this->status = $status;
        $this->errorCategory = $errorCategory;
        $this->finishReason = $finishReason;
        $this->inputTokens = $inputTokens;
        $this->outputTokens = $outputTokens;
        $this->rawPayload = $rawPayload;
        $this->validationReason = $validationReason;
        $this->validationDetail = $validationDetail;
        $this->generatedAnswerChars = $generatedAnswerChars;
        $this->generatedAnswerWords = $generatedAnswerWords;
        $this->generatedAnswerSentences = $generatedAnswerSentences;
    }

    public static function failure(
        string $providerName,
        string $modelName,
        string $errorCategory,
        string $status = 'failed',
        mixed $rawPayload = null
    ): self {
        return new self(
            false,
            null,
            $providerName,
            $modelName,
            $status,
            $errorCategory,
            null,
            null,
            null,
            $rawPayload
        );
    }

    /**
     * Attach allowlisted validation diagnostics and drop generated answer text.
     * Used when the provider succeeded but the validator rejected the draft.
     *
     * @param array{
     *   accepted?: bool,
     *   reason?: string,
     *   detail?: ?string,
     *   generatedAnswerChars?: int,
     *   generatedAnswerWords?: int,
     *   generatedAnswerSentences?: int
     * } $validation
     */
    public function withSafeValidationRejection(array $validation): self
    {
        $reason = (string) ($validation['reason'] ?? 'unknown_validation_failure');
        if (!ProviderResponseValidator::isAllowlistedReason($reason) || $reason === 'accepted') {
            $reason = 'unknown_validation_failure';
        }

        $detail = null;
        if (isset($validation['detail']) && is_string($validation['detail']) && $validation['detail'] !== '') {
            $detail = ProviderResponseValidator::isAllowlistedDetail($validation['detail'])
                ? $validation['detail']
                : null;
        }

        return new self(
            false,
            null,
            $this->providerName,
            $this->modelName,
            'unsafe_answer',
            'unsafe_answer',
            $this->finishReason,
            $this->inputTokens,
            $this->outputTokens,
            null,
            $reason,
            isset($validation['generatedAnswerChars']) ? (int) $validation['generatedAnswerChars'] : null,
            isset($validation['generatedAnswerWords']) ? (int) $validation['generatedAnswerWords'] : null,
            isset($validation['generatedAnswerSentences']) ? (int) $validation['generatedAnswerSentences'] : null,
            $detail
        );
    }

    public function isSuccess(): bool
    {
        return $this->success;
    }

    public function getAnswerText(): ?string
    {
        return $this->answerText;
    }

    public function getProviderName(): string
    {
        return $this->providerName;
    }

    public function getModelName(): string
    {
        return $this->modelName;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getErrorCategory(): ?string
    {
        return $this->errorCategory;
    }

    public function getFinishReason(): ?string
    {
        return $this->finishReason;
    }

    public function getInputTokens(): ?int
    {
        return $this->inputTokens;
    }

    public function getOutputTokens(): ?int
    {
        return $this->outputTokens;
    }

    public function getValidationReason(): ?string
    {
        return $this->validationReason;
    }

    public function getValidationDetail(): ?string
    {
        return $this->validationDetail;
    }

    public function getGeneratedAnswerChars(): ?int
    {
        return $this->generatedAnswerChars;
    }

    public function getGeneratedAnswerWords(): ?int
    {
        return $this->generatedAnswerWords;
    }

    public function getGeneratedAnswerSentences(): ?int
    {
        return $this->generatedAnswerSentences;
    }

    /**
     * Local/test access only. Never include in public API responses.
     */
    public function getRawPayloadForTests(): mixed
    {
        return $this->rawPayload;
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'success' => $this->success,
            'answerText' => $this->answerText,
            'providerName' => $this->providerName,
            'modelName' => $this->modelName,
            'status' => $this->status,
            'errorCategory' => $this->errorCategory,
            'finishReason' => $this->finishReason,
            'inputTokens' => $this->inputTokens,
            'outputTokens' => $this->outputTokens,
            'validationReason' => $this->validationReason,
            'validationDetail' => $this->validationDetail,
            'generatedAnswerChars' => $this->generatedAnswerChars,
            'generatedAnswerWords' => $this->generatedAnswerWords,
            'generatedAnswerSentences' => $this->generatedAnswerSentences,
        ];
    }
}

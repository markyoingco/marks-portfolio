<?php

declare(strict_types=1);

require_once __DIR__ . '/ProviderResult.php';

/**
 * Provider-neutral language-model interface.
 *
 * Implementations must accept injectable transport and runtime configuration.
 * They must never expose credentials, headers, system prompts, or raw payloads
 * through public visitor responses.
 */
interface LanguageModelProvider
{
    /**
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $settings Controlled generation settings
     * @param array<string, mixed> $configuration Runtime provider configuration
     * @param callable|null $transport Injectable HTTP transport:
     *        function(string $method, string $url, array $headers, string $body, array $options): array
     *        Returning ['status' => int, 'body' => string, 'headers' => array]
     */
    public function generate(
        array $messages,
        array $settings,
        array $configuration,
        ?callable $transport = null
    ): ProviderResult;
}

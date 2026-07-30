<?php

declare(strict_types=1);

/**
 * Provider-neutral HTTPS transport contract.
 *
 * Implementations must never return Authorization headers, tokens, Account IDs,
 * system messages, approved records, local paths, or stack traces.
 */
interface HttpTransport
{
    /**
     * @param array{
     *   url: string,
     *   method: string,
     *   headers?: array<string, string>,
     *   body?: string,
     *   connectTimeoutSeconds?: float,
     *   totalTimeoutSeconds?: float,
     *   maxResponseBytes?: int,
     *   allowRedirects?: bool,
     *   allowedHost?: string,
     *   requireJson?: bool
     * } $request
     *
     * @return array{
     *   success: bool,
     *   httpStatus: int,
     *   body: string,
     *   contentType: ?string,
     *   errorCategory: ?string,
     *   responseByteCount: int
     * }
     */
    public function request(array $request): array;

    public function isAvailable(): bool;
}

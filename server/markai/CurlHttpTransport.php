<?php

declare(strict_types=1);

require_once __DIR__ . '/HttpTransport.php';

/**
 * Production-capable HTTPS transport using cURL with strict safety controls.
 *
 * An injectable executor may be provided for local fixture tests only.
 * No live network request is made by Phase 2D fixture suites.
 */
final class CurlHttpTransport implements HttpTransport
{
    public const DEFAULT_ALLOWED_HOST = 'api.cloudflare.com';
    public const DEFAULT_MAX_RESPONSE_BYTES = 200000;

    /** @var callable|null */
    private $executor;

    /**
     * @param callable|null $executor function(array $normalizedRequest): array
     *        Returning [
     *          'httpStatus'=>int,
     *          'body'=>string,
     *          'contentType'=>?string,
     *          'errorCategory'=>?string,
     *          'curlErrno'=>?int
     *        ]
     */
    public function __construct(?callable $executor = null)
    {
        $this->executor = $executor;
    }

    public function isAvailable(): bool
    {
        if ($this->executor !== null) {
            return true;
        }

        return extension_loaded('curl') && function_exists('curl_init');
    }

    public function request(array $request): array
    {
        $empty = static function (
            ?string $errorCategory,
            int $status = 0,
            string $body = '',
            ?string $contentType = null,
            int $bytes = 0,
            ?int $curlErrno = null
        ): array {
            return [
                'success' => false,
                'httpStatus' => $status,
                'body' => $body,
                'contentType' => $contentType,
                'errorCategory' => $errorCategory,
                'responseByteCount' => $bytes,
                'curlErrno' => $curlErrno,
            ];
        };

        if (!$this->isAvailable()) {
            return $empty('unknown_transport_error');
        }

        $url = trim((string) ($request['url'] ?? ''));
        $method = strtoupper(trim((string) ($request['method'] ?? 'POST')));
        $headers = is_array($request['headers'] ?? null) ? $request['headers'] : [];
        $body = (string) ($request['body'] ?? '');
        $connectTimeout = (float) ($request['connectTimeoutSeconds'] ?? 5.0);
        $totalTimeout = (float) ($request['totalTimeoutSeconds'] ?? 20.0);
        $maxBytes = (int) ($request['maxResponseBytes'] ?? self::DEFAULT_MAX_RESPONSE_BYTES);
        $allowRedirects = (bool) ($request['allowRedirects'] ?? false);
        $allowedHost = (string) ($request['allowedHost'] ?? self::DEFAULT_ALLOWED_HOST);
        $requireJson = array_key_exists('requireJson', $request)
            ? (bool) $request['requireJson']
            : true;

        if ($method !== 'POST') {
            return $empty('method_not_allowed');
        }
        if ($allowRedirects) {
            return $empty('redirects_not_allowed');
        }
        if ($maxBytes <= 0) {
            $maxBytes = self::DEFAULT_MAX_RESPONSE_BYTES;
        }

        $parts = parse_url($url);
        if (!is_array($parts)) {
            return $empty('invalid_url');
        }
        if (($parts['scheme'] ?? '') !== 'https') {
            return $empty('https_required');
        }
        if (($parts['host'] ?? '') !== $allowedHost) {
            return $empty('host_not_allowed');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            return $empty('credentials_in_url_not_allowed');
        }

        $safeHeaders = [];
        foreach ($headers as $name => $value) {
            if (!is_string($name) || !is_string($value)) {
                continue;
            }
            $safeHeaders[$name] = $value;
        }

        $normalized = [
            'url' => $url,
            'method' => $method,
            'headers' => $safeHeaders,
            'body' => $body,
            'connectTimeoutSeconds' => max(0.1, $connectTimeout),
            'totalTimeoutSeconds' => max(0.1, $totalTimeout),
            'maxResponseBytes' => $maxBytes,
            'allowRedirects' => false,
            'allowedHost' => $allowedHost,
            'requireJson' => $requireJson,
        ];

        try {
            if ($this->executor !== null) {
                $raw = ($this->executor)($normalized);
            } else {
                $raw = $this->executeWithCurl($normalized);
            }
        } catch (Throwable $e) {
            return $empty('unknown_transport_error');
        } finally {
            unset($safeHeaders, $normalized['headers'], $headers);
        }

        if (!is_array($raw)) {
            return $empty('unknown_transport_error');
        }

        $errorCategory = isset($raw['errorCategory']) && is_string($raw['errorCategory'])
            ? $raw['errorCategory']
            : null;
        $status = (int) ($raw['httpStatus'] ?? 0);
        $responseBody = (string) ($raw['body'] ?? '');
        $contentType = isset($raw['contentType']) && is_string($raw['contentType'])
            ? $raw['contentType']
            : null;
        $curlErrno = array_key_exists('curlErrno', $raw) && is_int($raw['curlErrno'])
            ? $raw['curlErrno']
            : null;
        $byteCount = strlen($responseBody);

        if ($errorCategory !== null) {
            $mapped = $this->normalizeTransportCategory($errorCategory);
            return $empty(
                $mapped,
                $status,
                '',
                $contentType,
                $byteCount > $maxBytes ? $maxBytes + 1 : $byteCount,
                $curlErrno
            );
        }

        if ($byteCount > $maxBytes) {
            return $empty('response_too_large', $status, '', $contentType, $byteCount, $curlErrno);
        }

        if ($status >= 300 && $status < 400) {
            return $empty('redirect_not_followed', $status, '', $contentType, $byteCount, $curlErrno);
        }

        // Classification order after network success: HTTP → content-type → empty → JSON.
        if ($status < 200 || $status >= 300) {
            return [
                'success' => false,
                'httpStatus' => $status,
                'body' => $responseBody,
                'contentType' => $contentType,
                'errorCategory' => $this->mapHttpErrorCategory($status),
                'responseByteCount' => $byteCount,
                'curlErrno' => $curlErrno,
            ];
        }

        if ($requireJson) {
            $type = strtolower(trim((string) $contentType));
            if ($type === '') {
                return $empty('invalid_content_type', $status, '', null, $byteCount, $curlErrno);
            }
            if (str_contains($type, 'text/html') || stripos($responseBody, '<html') !== false) {
                return $empty('invalid_content_type', $status, '', $contentType, $byteCount, $curlErrno);
            }
            $looksJsonType = str_contains($type, 'application/json') || str_contains($type, '+json');
            if (!$looksJsonType) {
                return $empty('invalid_content_type', $status, '', $contentType, $byteCount, $curlErrno);
            }
        }

        if ($responseBody === '') {
            return $empty('empty_response', $status, '', $contentType, 0, $curlErrno);
        }

        if ($requireJson) {
            try {
                json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
            } catch (Throwable $e) {
                return $empty('invalid_json', $status, '', $contentType, $byteCount, $curlErrno);
            }
        }

        return [
            'success' => true,
            'httpStatus' => $status,
            'body' => $responseBody,
            'contentType' => $contentType,
            'errorCategory' => null,
            'responseByteCount' => $byteCount,
            'curlErrno' => $curlErrno,
        ];
    }

    /**
     * @param array<string, mixed> $normalized
     * @return array{
     *   httpStatus: int,
     *   body: string,
     *   contentType: ?string,
     *   errorCategory: ?string,
     *   curlErrno: ?int
     * }
     */
    private function executeWithCurl(array $normalized): array
    {
        if (!extension_loaded('curl') || !function_exists('curl_init')) {
            return [
                'httpStatus' => 0,
                'body' => '',
                'contentType' => null,
                'errorCategory' => 'unknown_transport_error',
                'curlErrno' => null,
            ];
        }

        $maxBytes = (int) $normalized['maxResponseBytes'];
        $buffer = '';
        $overflow = false;

        $ch = curl_init((string) $normalized['url']);
        if ($ch === false) {
            return [
                'httpStatus' => 0,
                'body' => '',
                'contentType' => null,
                'errorCategory' => 'unknown_transport_error',
                'curlErrno' => null,
            ];
        }

        $headerLines = [];
        foreach ($normalized['headers'] as $name => $value) {
            if (!is_string($name) || !is_string($value)) {
                continue;
            }
            if (strcasecmp($name, 'Proxy-Authorization') === 0 || strcasecmp($name, 'Cookie') === 0) {
                continue;
            }
            $headerLines[] = $name . ': ' . $value;
        }

        // Return exactly the consumed byte count. Return 0 only to abort at the size limit.
        $write = static function ($ch, string $chunk) use (&$buffer, &$overflow, $maxBytes): int {
            if ($overflow) {
                return 0;
            }
            $chunkLen = strlen($chunk);
            if ((strlen($buffer) + $chunkLen) > $maxBytes) {
                $overflow = true;
                $buffer = '';
                return 0;
            }
            $buffer .= $chunk;

            return $chunkLen;
        };

        $options = [
            CURLOPT_POST => true,
            CURLOPT_HTTPGET => false,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => (string) $normalized['body'],
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_HEADER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_MAXREDIRS => 0,
            CURLOPT_CONNECTTIMEOUT => (float) $normalized['connectTimeoutSeconds'],
            CURLOPT_TIMEOUT => (float) $normalized['totalTimeoutSeconds'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_COOKIESESSION => true,
            CURLOPT_COOKIEFILE => '',
            CURLOPT_COOKIEJAR => '',
            CURLOPT_VERBOSE => false,
            CURLOPT_NOPROGRESS => true,
            CURLOPT_WRITEFUNCTION => $write,
        ];
        if (defined('CURLPROTO_HTTPS')) {
            $options[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
            $options[CURLOPT_REDIR_PROTOCOLS] = 0;
        }

        curl_setopt_array($ch, $options);

        if (defined('CURLOPT_PROXY')) {
            curl_setopt($ch, CURLOPT_PROXY, '');
        }
        if (defined('CURLOPT_NOPROXY')) {
            curl_setopt($ch, CURLOPT_NOPROXY, '*');
        }

        $ok = curl_exec($ch);
        $errno = curl_errno($ch);
        // Capture status and content type before the handle leaves scope.
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $contentType = is_string($contentType) && $contentType !== '' ? $contentType : null;

        // PHP 8.0+ CurlHandle closes when leaving scope; do not call deprecated close helpers.
        unset($headerLines, $ch);

        if ($overflow) {
            return [
                'httpStatus' => $status,
                'body' => '',
                'contentType' => $contentType,
                'errorCategory' => 'response_too_large',
                'curlErrno' => defined('CURLE_WRITE_ERROR') ? CURLE_WRITE_ERROR : $errno,
            ];
        }

        if ($ok === false) {
            return [
                'httpStatus' => 0,
                'body' => '',
                'contentType' => null,
                'errorCategory' => $this->mapCurlErrno($errno),
                'curlErrno' => $errno,
            ];
        }

        return [
            'httpStatus' => $status,
            'body' => $buffer,
            'contentType' => $contentType,
            'errorCategory' => null,
            'curlErrno' => 0,
        ];
    }

    private function mapCurlErrno(int $errno): string
    {
        if ($errno === 0) {
            return 'unknown_transport_error';
        }

        $map = [];
        if (defined('CURLE_COULDNT_RESOLVE_HOST')) {
            $map[CURLE_COULDNT_RESOLVE_HOST] = 'dns_failed';
        }
        if (defined('CURLE_COULDNT_CONNECT')) {
            $map[CURLE_COULDNT_CONNECT] = 'connection_failed';
        }
        if (defined('CURLE_OPERATION_TIMEDOUT')) {
            $map[CURLE_OPERATION_TIMEDOUT] = 'timeout';
        }
        if (defined('CURLE_OPERATION_TIMEOUTED')) {
            $map[CURLE_OPERATION_TIMEOUTED] = 'timeout';
        }
        if (defined('CURLE_WRITE_ERROR')) {
            $map[CURLE_WRITE_ERROR] = 'response_write_failed';
        }
        if (defined('CURLE_GOT_NOTHING')) {
            $map[CURLE_GOT_NOTHING] = 'empty_response';
        }
        if (defined('CURLE_SSL_CONNECT_ERROR')) {
            $map[CURLE_SSL_CONNECT_ERROR] = 'tls_failed';
        }
        if (defined('CURLE_SSL_CERTPROBLEM')) {
            $map[CURLE_SSL_CERTPROBLEM] = 'tls_failed';
        }
        if (defined('CURLE_SSL_CACERT')) {
            $map[CURLE_SSL_CACERT] = 'tls_failed';
        }
        if (defined('CURLE_SSL_CACERT_BADFILE')) {
            $map[CURLE_SSL_CACERT_BADFILE] = 'tls_failed';
        }
        if (defined('CURLE_SSL_PEER_CERTIFICATE')) {
            $map[CURLE_SSL_PEER_CERTIFICATE] = 'tls_failed';
        }
        if (defined('CURLE_SSL_INVALIDCERTSTATUS')) {
            $map[CURLE_SSL_INVALIDCERTSTATUS] = 'tls_failed';
        }
        if (defined('CURLE_PEER_FAILED_VERIFICATION')) {
            $map[CURLE_PEER_FAILED_VERIFICATION] = 'tls_failed';
        }

        return $map[$errno] ?? 'unknown_transport_error';
    }

    private function normalizeTransportCategory(string $category): string
    {
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
            // Retained provider-facing aliases used by fixtures/wrappers.
            'authentication_failed',
            'rate_limited',
            'not_found',
            'payload_too_large',
            'upstream_error',
            'html_response',
            'non_json_response',
            'transport_unavailable',
            'transport_error',
            'https_required',
            'host_not_allowed',
            'method_not_allowed',
            'redirect_not_followed',
            'redirects_not_allowed',
            'invalid_url',
            'credentials_in_url_not_allowed',
        ];
        if (in_array($category, $allowed, true)) {
            if ($category === 'html_response' || $category === 'non_json_response') {
                return 'invalid_content_type';
            }
            if ($category === 'transport_error' || $category === 'transport_unavailable') {
                return 'unknown_transport_error';
            }

            return $category;
        }

        return 'unknown_transport_error';
    }

    private function mapHttpErrorCategory(int $status): string
    {
        return match ($status) {
            401, 403 => 'authentication_failed',
            404 => 'not_found',
            408 => 'timeout',
            413 => 'payload_too_large',
            429 => 'rate_limited',
            500, 502, 503, 504 => 'http_server_error',
            default => $status >= 500 ? 'http_server_error' : 'http_client_error',
        };
    }
}

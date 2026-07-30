<?php

declare(strict_types=1);

/**
 * Strict parity checks between:
 * - markai-knowledge/links/trusted-links.json (canonical)
 * - src/publicOpenAliases.js (Terminal open aliases)
 * - server/markai/generated/approved-v1.json (exported visitor surface)
 */

$repoRoot = dirname(__DIR__);

$fail = static function (string $message): void {
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
};

$assert = static function (bool $condition, string $message) use ($fail): void {
    if (!$condition) {
        $fail($message);
    }
};

$registryPath = $repoRoot . '/markai-knowledge/links/trusted-links.json';
$aliasPath = $repoRoot . '/src/publicOpenAliases.js';
$exportPath = $repoRoot . '/server/markai/generated/approved-v1.json';

$assert(is_file($registryPath), 'canonical trusted-links.json exists');
$assert(is_file($aliasPath), 'publicOpenAliases.js exists');
$assert(is_file($exportPath), 'approved-v1.json export exists');

$registry = json_decode((string) file_get_contents($registryPath), true, 512, JSON_THROW_ON_ERROR);
$export = json_decode((string) file_get_contents($exportPath), true, 512, JSON_THROW_ON_ERROR);
$aliasSource = (string) file_get_contents($aliasPath);

$linksById = [];
foreach ($registry['links'] ?? [] as $link) {
    if (!is_array($link) || !isset($link['id'])) {
        continue;
    }
    $linksById[(string) $link['id']] = $link;
}

$assert(count($linksById) >= 1, 'registry has links');

$email = $linksById['link-email'] ?? null;
$assert(is_array($email), 'link-email exists in registry');
$assert(($email['enabled'] ?? true) === false, 'link-email remains disabled');

$assert(
    !preg_match('/github\.com\/[^\s\'"]*(?:XINU|XINU26|ayazdani1)/i', $aliasSource),
    'aliases exclude private XINU repositories'
);
$assert(
    !preg_match('/mailto:/i', $aliasSource),
    'aliases do not expose mailto'
);
$assert(
    !preg_match("/trustedLinkId\\s*:\\s*['\"]link-email['\"]/", $aliasSource),
    'aliases do not map to disabled email'
);

// Extract alias entries by trustedLinkId assignments within PUBLIC_OPEN_ALIASES.
preg_match_all(
    "/trustedLinkId\\s*:\\s*['\"](?P<id>link-[a-z0-9\\-]+)['\"]/",
    $aliasSource,
    $idMatches
);
$trustedIdsInAliases = $idMatches['id'] ?? [];
$assert(count($trustedIdsInAliases) >= 15, 'Terminal aliases declare trustedLinkId mappings');

preg_match_all(
    "/^\\s+(?:['\"](?P<q>[a-z0-9\\-]+)['\"]|(?P<bare>[a-z0-9\\-]+))\\s*:\\s*\\{/m",
    $aliasSource,
    $keyMatches,
    PREG_SET_ORDER
);
$aliasKeys = [];
foreach ($keyMatches as $row) {
    $key = $row['q'] !== '' ? $row['q'] : $row['bare'];
    if ($key === 'PUBLIC_OPEN_ALIASES') {
        continue;
    }
    // Skip nested type objects that are not top-level aliases (none expected).
    $aliasKeys[] = $key;
}
// Filter to keys that appear before the closing of PUBLIC_OPEN_ALIASES by requiring
// they are known command aliases (exclude typedef-only noise).
$aliasKeys = array_values(array_unique(array_filter(
    $aliasKeys,
    static fn (string $k): bool => !in_array($k, ['type', 'url', 'screen', 'lines', 'trustedLinkId'], true)
)));

$assert(count($aliasKeys) >= 15, 'parsed Terminal alias keys');

foreach ($trustedIdsInAliases as $trustedId) {
    $assert(isset($linksById[$trustedId]), "alias maps to known registry id {$trustedId}");
    $canonical = $linksById[$trustedId];
    $assert(($canonical['enabled'] ?? false) === true, "alias must map to enabled destination {$trustedId}");
    $assert(($canonical['public'] ?? false) === true, "alias must map to public destination {$trustedId}");
}

// For each https URL literal in aliases, require an exact enabled registry href match.
preg_match_all(
    "/url\\s*:\\s*['\"](?P<url>https?:\\/\\/[^'\"]+)['\"]/",
    $aliasSource,
    $urlMatches
);
foreach ($urlMatches['url'] ?? [] as $aliasUrl) {
    $matched = false;
    foreach ($linksById as $canonical) {
        if (($canonical['enabled'] ?? false) !== true) {
            continue;
        }
        if ((string) ($canonical['href'] ?? '') === $aliasUrl) {
            $matched = true;
            break;
        }
    }
    $assert($matched, "alias URL must match an enabled canonical href: {$aliasUrl}");
}

// Export parity
$exportLinks = $export['trustedLinks'] ?? [];
$assert(is_array($exportLinks), 'export trustedLinks present');

$exportById = [];
foreach ($exportLinks as $link) {
    if (!is_array($link) || !isset($link['id'])) {
        continue;
    }
    $exportById[(string) $link['id']] = $link;
}

foreach ($linksById as $id => $canonical) {
    $assert(isset($exportById[$id]), "export includes registry link {$id}");
    $exported = $exportById[$id];
    $assert(
        (bool) ($exported['enabled'] ?? null) === (bool) ($canonical['enabled'] ?? null),
        "export enabled parity for {$id}"
    );
    $assert(
        (string) ($exported['href'] ?? '') === (string) ($canonical['href'] ?? ''),
        "export href parity for {$id}"
    );
    $assert(
        (string) ($exported['label'] ?? '') === (string) ($canonical['label'] ?? ''),
        "export label parity for {$id}"
    );
}

$assert(isset($exportById['link-email']), 'export retains disabled email metadata');
$assert(($exportById['link-email']['enabled'] ?? true) === false, 'export keeps email disabled');

foreach ($exportLinks as $link) {
    $href = (string) ($link['href'] ?? '');
    $assert(!preg_match('/XINU26|ayazdani1/i', $href), 'export has no private XINU href');
    if (($link['enabled'] ?? false) === true) {
        $assert(!preg_match('/mailto:/i', $href), 'enabled export links have no mailto href');
    }
}

foreach ([
    'link-portfolio-section' => '#portfolio',
    'link-testimonials-section' => '#testimonials',
    'link-travel-section' => '#travel',
    'link-contact-section' => '#contact',
] as $id => $fragment) {
    $href = (string) ($linksById[$id]['href'] ?? '');
    $assert(str_ends_with($href, $fragment), "{$id} deep-links with {$fragment}");
}

$markaiHref = (string) ($linksById['link-markai-route']['href'] ?? '');
$assert(!str_contains($markaiHref, '#markai'), 'MarkAI route does not use dead #markai hash');

$fmsc = $linksById['link-fmsc-libertyville'] ?? null;
$assert(is_array($fmsc) && ($fmsc['enabled'] ?? false) === true, 'FMSC public destination registered and enabled');
$assert(
    ($fmsc['href'] ?? '') === 'https://www.fmsc.org/locations/libertyville-il',
    'FMSC href matches Webpage/Terminal public page'
);
$assert(str_contains($aliasSource, 'fmsc:'), 'Terminal fmsc alias present');
$assert(in_array('fmsc', $aliasKeys, true) || str_contains($aliasSource, "\n  fmsc:"), 'fmsc alias key present');

fwrite(STDOUT, "All trusted-link / Terminal alias parity tests passed.\n");
fwrite(STDOUT, 'registry_links=' . count($linksById) . "\n");
fwrite(STDOUT, 'terminal_alias_keys=' . count($aliasKeys) . "\n");
fwrite(STDOUT, 'terminal_trusted_link_mappings=' . count($trustedIdsInAliases) . "\n");
fwrite(STDOUT, "live_network_requests=0\n");
exit(0);

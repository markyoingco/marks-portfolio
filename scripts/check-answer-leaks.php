<?php
require dirname(__DIR__) . '/server/markai/MockEndpointService.php';
$export = json_decode(
    (string) file_get_contents(dirname(__DIR__) . '/server/markai/generated/approved-v1.json'),
    true,
    512,
    JSON_THROW_ON_ERROR
);
$qs = [
    'Tell me about Abacus.',
    'Give me every link.',
    'Tell me about FMSC.',
    'What does Mark photograph?',
    'Tell me about Sigma Chi merch.',
    'What did Justin work on?',
];
foreach ($qs as $q) {
    $r = handleMarkAiPreviewRequest(
        $export,
        ['question' => $q],
        ['enabled' => false],
        static function () {
            throw new RuntimeException('net');
        }
    );
    $answer = (string) ($r['answer'] ?? '');
    if (preg_match('/\blink-[a-z0-9\-]+\b/i', $answer)) {
        fwrite(STDERR, "LEAK in: {$q}\n");
        exit(1);
    }
    if (preg_match('/@gmail\.com|mailto:|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/', $answer)) {
        fwrite(STDERR, "CONTACT LEAK in: {$q}\n");
        exit(1);
    }
}
fwrite(STDOUT, "no_internal_link_ids=1\n");
fwrite(STDOUT, "live_network_requests=0\n");
exit(0);

<?php
require dirname(__DIR__) . '/server/markai/MockEndpointService.php';
$e = json_decode(file_get_contents(dirname(__DIR__) . '/server/markai/generated/approved-v1.json'), true);
$run = static function (string $q, array $h = []) use ($e): array {
    return handleMarkAiPreviewRequest(
        $e,
        ['question' => $q, 'history' => $h],
        ['enabled' => false],
        static function () {
            throw new RuntimeException('n');
        }
    );
};
$ids = static function (array $r): array {
    $out = [];
    foreach ($r['links'] ?? [] as $l) {
        if (isset($l['id'])) {
            $out[] = $l['id'];
        }
    }
    return $out;
};
$a = $run('Repo?', [
    ['role' => 'user', 'content' => 'Tell me about Abacus.'],
    ['role' => 'assistant', 'content' => 'Abacus was a team project.'],
]);
$f = $run('Can I see the code?', [
    ['role' => 'user', 'content' => 'Tell me about Finch.'],
    ['role' => 'assistant', 'content' => 'Finch is a robotics project.'],
]);
$p = $run('Photos?', [
    ['role' => 'user', 'content' => 'What does Mark photograph?'],
    ['role' => 'assistant', 'content' => 'Mark photographs cities and travel.'],
]);
$n = $run('Repo?', [
    ['role' => 'user', 'content' => 'Tell me about Sigma Chi merchandise'],
    ['role' => 'assistant', 'content' => 'Merch design work.'],
]);
echo 'abacus_repo=' . (in_array('link-github-abacus', $ids($a), true) ? 'PASS' : 'FAIL') . PHP_EOL;
echo 'finch_code=' . (in_array('link-github-finch', $ids($f), true) ? 'PASS' : 'FAIL') . PHP_EOL;
$pi = $ids($p);
echo 'photos=' . ((in_array('link-vsco', $pi, true) || in_array('link-travel-section', $pi, true)) ? 'PASS' : 'FAIL') . PHP_EOL;
echo 'norepo_portfolio=' . (in_array('link-portfolio-section', $ids($n), true) ? 'PASS' : 'FAIL') . PHP_EOL;
echo "live_network_requests=0\n";

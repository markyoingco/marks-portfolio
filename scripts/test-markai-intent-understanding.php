<?php

declare(strict_types=1);

/**
 * Phase 3A.4 — natural-language understanding, typo tolerance, and smart follow-ups.
 */

require_once dirname(__DIR__) . '/server/markai/MockEndpointService.php';

$exportPath = dirname(__DIR__) . '/server/markai/generated/approved-v1.json';
$export = json_decode((string) file_get_contents($exportPath), true);
if (!is_array($export)) {
    fwrite(STDERR, "FAIL: could not load approved export\n");
    exit(1);
}

$failures = 0;
$pass = static function (string $message): void {
    echo "PASS: {$message}\n";
};
$fail = static function (string $message) use (&$failures): void {
    echo "FAIL: {$message}\n";
    $failures += 1;
};
$assert = static function (bool $ok, string $message) use ($pass, $fail): void {
    if ($ok) {
        $pass($message);
    } else {
        $fail($message);
    }
};

$networkCalls = 0;
$run = static function (string $question, array $history = []) use ($export, &$networkCalls): array {
    return handleMarkAiPreviewRequest(
        $export,
        ['question' => $question, 'history' => $history],
        ['enabled' => false],
        static function () use (&$networkCalls): array {
            $networkCalls += 1;
            throw new RuntimeException('intent fixtures must not transport');
        }
    );
};

$classify = static function (string $question, array $history = []): array {
    return markai_mock_classify($question, $history);
};

$sensitivePattern = '/lung|anxiety|addiction|pornograph|girlfriend|self-hatred|diagnosis|weight of|Goggins|Levrone|journal|family support|financial hardship|salary|phone number|@gmail|link-[a-z0-9\-]+/i';

// 1–5 core screenshot failures + typos
$cases = [
    'goals' => 'careerGoals',
    'goels' => 'careerGoals',
    'fun facts' => 'funFacts',
    'what are all the facts about him fun facts' => 'funFacts',
    'what are my options of questions' => 'capabilities',
    'what can I ask?' => 'capabilities',
    'music' => 'favoriteArtists',
    'movies' => 'favoriteFilms',
    'Regular Show?' => 'favoriteFilms',
    'Marvel or DC?' => 'favoriteFilms',
    'hobbies' => 'hobbies',
    'personality' => 'personality',
    'vibe' => 'vibe',
    'what drives him?' => 'drives',
    'proejcts' => 'projectsInventory',
    'favrite movies' => 'favoriteFilms',
    'resume' => 'resume',
];

foreach ($cases as $question => $expected) {
    $c = $classify($question);
    $assert(($c['category'] ?? '') === $expected, "classify [{$question}] => {$expected} (got " . ($c['category'] ?? 'null') . ')');
    $assert(($c['answerStatus'] ?? '') === 'answered', "answered status for [{$question}]");
    $assert(!preg_match($sensitivePattern, (string) ($c['answer'] ?? '')), "no sensitive/internal IDs for [{$question}]");
}

$multi = $classify('projects skills and goals');
$assert(($multi['category'] ?? '') === 'multiTopic', 'multi-topic projects skills and goals');
$assert(str_contains(strtolower((string) ($multi['answer'] ?? '')), 'goal'), 'multi-topic mentions goals');
$assert(str_contains(strtolower((string) ($multi['answer'] ?? '')), 'skill') || str_contains(strtolower((string) ($multi['answer'] ?? '')), 'technolog'), 'multi-topic mentions skills');

$goalsAnswer = (string) ($classify('goals')['answer'] ?? '');
$assert(str_contains(strtolower($goalsAnswer), 'stable') || str_contains(strtolower($goalsAnswer), 'career'), 'goals answer career stability');
$assert(str_contains(strtolower($goalsAnswer), 'independen'), 'goals answer independence');
$assert(!preg_match('/family support|financial hardship|salary desperation/i', $goalsAnswer), 'goals excludes private money/family pressure');

$fun = (string) ($classify('fun facts')['answer'] ?? '');
$assert(str_contains($fun, 'Here are several approved fun facts'), 'fun facts framing');
$assert(str_contains(strtolower($fun), 'bodybuilding'), 'fun facts include bodybuilding');
$assert(!preg_match('/breed|lbs|kg|girlfriend|journal|anxiety|addiction/i', $fun), 'fun facts omit private material');

$caps = (string) ($classify('what are my options of questions')['answer'] ?? '');
$assert(str_contains($caps, 'You can ask about Mark'), 'capabilities framing');
$assert(!str_contains(strtolower($caps), 'try asking a more specific'), 'capabilities not generic fallback');
$assert(!str_contains(strtolower($caps), 'limited demonstration'), 'capabilities no limited-demo wording');

$fallback = $classify('zzzxqyt plorfnumble 99');
$assert(($fallback['category'] ?? '') === 'fallback', 'nonsense remains fallback');
$assert(str_contains((string) ($fallback['answer'] ?? ''), 'I may be missing the intended topic'), 'improved fallback copy');

$privateTypo = $classify('famly support goals');
// May still refuse via sensitive family/support phrases after typo correction toward family if fuzzy, or stay fallback/sensitive.
$privateAnswer = strtolower((string) ($privateTypo['answer'] ?? ''));
$assert(
    ($privateTypo['category'] ?? '') === 'sensitive'
    || ($privateTypo['answerStatus'] ?? '') === 'refused'
    || str_contains($privateAnswer, 'intentionally public')
    || !str_contains($privateAnswer, 'financial hardship'),
    'private typo variant does not invent hardship facts'
);

// Contextual follow-ups
$team = $classify('team?', [
    ['role' => 'user', 'content' => 'Tell me about Abacus.'],
    ['role' => 'assistant', 'content' => 'Abacus was a team senior-design project.'],
]);
$assert(($team['category'] ?? '') === 'collaboratorsAbacus', 'team? after Abacus => collaboratorsAbacus');

$repo = $run('repo?', [
    ['role' => 'user', 'content' => 'Tell me about Finch.'],
    ['role' => 'assistant', 'content' => 'Finch is a robotics project.'],
]);
$repoIds = array_map(static fn ($l) => $l['id'] ?? '', $repo['links'] ?? []);
$assert(in_array('link-github-finch', $repoIds, true), 'repo? after Finch returns Finch repo link');

$musicFollow = $classify('and music?', [
    ['role' => 'user', 'content' => 'What are Mark’s hobbies?'],
    ['role' => 'assistant', 'content' => 'Outside technology, Mark’s public hobbies include music and movies.'],
]);
$assert(($musicFollow['category'] ?? '') === 'favoriteArtists', 'and music? after hobbies');

$photos = $run('photos?', [
    ['role' => 'user', 'content' => 'Where has he traveled?'],
    ['role' => 'assistant', 'content' => 'Places include Hawaii and Chicago.'],
]);
$photoIds = array_map(static fn ($l) => $l['id'] ?? '', $photos['links'] ?? []);
$assert(
    in_array('link-vsco', $photoIds, true) || in_array('link-travel-section', $photoIds, true),
    'photos? after travel returns travel/VSCO links'
);

$careerFollow = $classify('What about career?', [
    ['role' => 'user', 'content' => 'Tell me about Mark’s goals.'],
    ['role' => 'assistant', 'content' => 'Mark is working toward a stable technology career.'],
]);
$assert(($careerFollow['category'] ?? '') === 'careerGoals', 'what about career? after goals');

// API shape unchanged
$shape = $run('goals');
foreach (['success', 'answer', 'answerStatus', 'links', 'mode', 'conversationId', 'preview', 'error'] as $key) {
    $assert(array_key_exists($key, $shape), 'API retains ' . $key);
}
$assert(count(array_keys($shape)) === 8, 'API shape key count unchanged');
$assert(($shape['success'] ?? false) === true, 'goals deterministic success');
$assert(($shape['answerStatus'] ?? '') === 'answered', 'goals answerStatus answered');
$assert(!preg_match('/\blink-[a-z0-9\-]+\b/', (string) ($shape['answer'] ?? '')), 'no internal link IDs in prose');

$assert($networkCalls === 0, 'live_network_requests=0');
echo "live_network_requests={$networkCalls}\n";

if ($failures > 0) {
    fwrite(STDERR, "Intent understanding fixtures failed: {$failures}\n");
    exit(1);
}

echo "All MarkAI intent-understanding fixtures passed.\n";

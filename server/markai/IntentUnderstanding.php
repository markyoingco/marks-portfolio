<?php

declare(strict_types=1);

/**
* Shared MarkAI intent normalization, typo tolerance, and topic matching.
* Loads markai-knowledge/routing/intent-ontology.json.
*/

/**
* @return array<string, mixed>
*/
function markai_intent_ontology(): array
{
    static $ontology = null;
    if (is_array($ontology)) {
        return $ontology;
    }

    $candidates = [
        // Packaged private-server path (DreamHost server/markai/).
        __DIR__ . DIRECTORY_SEPARATOR . 'intent-ontology.json',
        __DIR__ . DIRECTORY_SEPARATOR . 'generated' . DIRECTORY_SEPARATOR . 'intent-ontology.json',
        // Local repository path during development.
        dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'markai-knowledge' . DIRECTORY_SEPARATOR . 'routing' . DIRECTORY_SEPARATOR . 'intent-ontology.json',
    ];

    $raw = false;
    foreach ($candidates as $path) {
        if (is_file($path)) {
            $raw = file_get_contents($path);
            if ($raw !== false) {
                break;
            }
        }
    }

    if ($raw === false) {
        $ontology = [
            'typos' => [],
            'topicTokens' => [],
            'oneWord' => [],
            'topics' => [],
            'multiTopicHints' => [],
            'followUpTopics' => [],
            'projectContext' => [],
        ];

        return $ontology;
    }

    $decoded = json_decode($raw, true);
    $ontology = is_array($decoded) ? $decoded : [];

    return $ontology;
}

function markai_intent_normalize(string $question): string
{
    $text = strtolower(trim($question));
    $text = str_replace(
        ["\u{2019}", "\u{2018}", "\u{201C}", "\u{201D}", '`'],
        ["'", "'", '"', '"', "'"],
        $text
    );
    // Fold common résumé/accent forms so matching stays ASCII-stable.
    $text = strtr($text, [
            'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a',
            'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
            'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o',
            'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u',
            'ñ' => 'n', 'ç' => 'c',
    ]);
    $text = preg_replace('/[?!.,;:]+/u', ' ', $text) ?? $text;
    $text = preg_replace("/\b(what's|whats)\b/u", 'what is', $text) ?? $text;
        $text = preg_replace("/\b(who's|whos)\b/u", 'who is', $text) ?? $text;
            $text = preg_replace("/\b(where's|wheres)\b/u", 'where is', $text) ?? $text;
                $text = preg_replace("/\b(can't|cant)\b/u", 'can not', $text) ?? $text;
                    $text = preg_replace("/\b(don't|dont)\b/u", 'do not', $text) ?? $text;
                        $text = preg_replace("/\bi'm\b/u", 'i am', $text) ?? $text;
                        $text = preg_replace("/\byou're\b/u", 'you are', $text) ?? $text;
                        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

                        return trim($text);
                    }

                    /**
                    * Conservative token-level typo correction against ontology typos + topic tokens.
                    */
                    function markai_intent_apply_typos(string $text): string
                    {
                        $ontology = markai_intent_ontology();
                        $typos = is_array($ontology['typos'] ?? null) ? $ontology['typos'] : [];
                        $oneWord = is_array($ontology['oneWord'] ?? null) ? $ontology['oneWord'] : [];
                        $fuzzyTargets = [];
                        foreach (array_keys($oneWord) as $token) {
                            if (is_string($token) && $token !== '' && !preg_match('/family|salary|password|email|phone|private|journal|contact/i', $token)) {
                                $fuzzyTargets[$token] = true;
                            }
                        }
                        // Approved topic words that are safe to fuzzy-correct toward.
                        foreach (['goals', 'hobbies', 'projects', 'experience', 'favorite', 'movies', 'music', 'artists', 'personality', 'resume', 'repository', 'collaborators', 'photography', 'testimonials', 'education', 'mindset', 'fitness', 'bodybuilding', 'mythology', 'travel', 'traveled', 'github', 'skills', 'color'] as $token) {
                            $fuzzyTargets[$token] = true;
                        }

                        $parts = preg_split('/\s+/u', $text) ?: [];
                        $out = [];
                        foreach ($parts as $part) {
                            if ($part === '') {
                                continue;
                            }
                            $clean = preg_replace("/^[^a-z0-9]+|[^a-z0-9]+$/u", '', $part) ?? $part;
                            if ($clean === '') {
                                $out[] = $part;
                                continue;
                            }
                            if (isset($typos[$clean]) && is_string($typos[$clean])) {
                                $out[] = $typos[$clean];
                                continue;
                            }
                            if (isset($fuzzyTargets[$clean]) || isset($oneWord[$clean])) {
                                $out[] = $clean;
                                continue;
                            }

                            $best = null;
                            $bestDistance = PHP_INT_MAX;
                            $len = strlen($clean);
                            // Distance 1 only - avoids connect→contact and similar over-corrections.
                            if ($len >= 5) {
                                foreach (array_keys($fuzzyTargets) as $candidate) {
                                    $distance = levenshtein($clean, $candidate);
                                    if ($distance === 1 && $distance < $bestDistance) {
                                        $best = $candidate;
                                        $bestDistance = $distance;
                                    }
                                }
                            }
                            $out[] = $best ?? $clean;
                        }

                        return trim(implode(' ', $out));
                    }

                    /**
                    * Rewrite unqualified Mark pronouns unless history focuses on a collaborator/project person.
                    *
                    * @param list<array{role?: string, content?: string}> $history
                    */
                    function markai_intent_rewrite_pronouns(string $text, array $history = []): string
                    {
                        $context = markai_intent_history_context($history);
                        $collaboratorFocus = markai_intent_includes_any($context, [
                                'justin',
                                'angel',
                                'jacob',
                                'sam mazzone',
                                'julianne',
                                'luis',
                                'xavier',
                                'allan',
                                'armaan',
                                'hunter',
                                'zack',
                                'farzeen',
                                'jorge',
                                'collaborator',
                                'teammate',
                                'team included',
                                'worked with',
                        ]);

                        if ($collaboratorFocus) {
                            return $text;
                        }

                        $text = preg_replace('/\bmark yoingco\b/u', 'mark', $text) ?? $text;
                        $text = preg_replace('/\babout him\b/u', 'about mark', $text) ?? $text;
                        $text = preg_replace('/\bfacts about him\b/u', 'facts about mark', $text) ?? $text;
                        $text = preg_replace('/\bdoes he\b/u', 'does mark', $text) ?? $text;
                        $text = preg_replace('/\bis he\b/u', 'is mark', $text) ?? $text;
                        $text = preg_replace('/\bwhat is he\b/u', 'what is mark', $text) ?? $text;
                        $text = preg_replace('/\bwhat does he\b/u', 'what does mark', $text) ?? $text;
                        $text = preg_replace('/\bwhere does he\b/u', 'where does mark', $text) ?? $text;
                        $text = preg_replace('/\bhis\b/u', "mark's", $text) ?? $text;
                        $text = preg_replace('/\bhim\b/u', 'mark', $text) ?? $text;
                        $text = preg_replace('/\bhe\b/u', 'mark', $text) ?? $text;

                        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
                    }

                    /**
                    * @param list<array{role?: string, content?: string}> $history
                    */
                    function markai_intent_history_context(array $history): string
                    {
                        $parts = [];
                        foreach (array_slice($history, -6) as $turn) {
                            if (!is_array($turn)) {
                                continue;
                            }
                            $content = strtolower(trim((string) ($turn['content'] ?? '')));
                            if ($content !== '') {
                                $parts[] = $content;
                            }
                        }

                        return implode(' ', $parts);
                    }

                    /**
                    * @param list<string> $phrases
                    */
                    function markai_intent_includes_any(string $text, array $phrases): bool
                    {
                        foreach ($phrases as $phrase) {
                            if ($phrase !== '' && str_contains($text, $phrase)) {
                                return true;
                            }
                        }

                        return false;
                    }

                    /**
                    * Prepare visitor text for classification (does not alter visitor-facing history).
                    *
                    * @param list<array{role?: string, content?: string}> $history
                    */
                    function markai_intent_prepare(string $question, array $history = []): string
                    {
                        $text = markai_intent_normalize($question);
                        $text = markai_intent_apply_typos($text);
                        $text = markai_intent_rewrite_pronouns($text, $history);

                        return $text;
                    }

                    /**
                    * Match ontology one-word topics and high-priority topic aliases.
                    *
                    * @param array<string, string> $answers
                    * @return array{category: string, mode: string, answer: string, answerStatus: string}|null
                    */
                    function markai_intent_match_topic(string $text, array $answers): ?array
                    {
                        $ontology = markai_intent_ontology();
                        $normalized = trim($text, " \t\n\r\0\x0B");

                        // Capabilities / help before one-word so "help" and long option questions both win.
                        $capabilities = $ontology['topics']['capabilities'] ?? null;
                        if (is_array($capabilities)) {
                            $projectMention = markai_intent_includes_any($normalized, [
                                    'abacus',
                                    'maat',
                                    'finch',
                                    'portfolio',
                                    'shmup',
                                    'apple picker',
                                    'mission demolition',
                                    'sleep',
                                    'basketball',
                                    'operating systems',
                                    'markai',
                            ]);
                            if (
                                !$projectMention
                                && (
                                    markai_intent_includes_any($normalized, [
                                            'what can i ask',
                                            'what can you answer',
                                            'what can you help',
                                            'options of questions',
                                            'question options',
                                            'what do you know',
                                            'what should i ask',
                                            'what are you capable',
                                            'example questions',
                                            'sample questions',
                                            'my options',
                                            'options of question',
                                    ])
                                    || in_array($normalized, ['help', 'topics', 'examples', 'capabilities'], true)
                                    || (
                                        markai_intent_includes_any($normalized, ['what can you'])
                                        && markai_intent_includes_any($normalized, ['ask', 'answer', 'know', 'help', 'capable', 'topics'])
                                    )
                                )
                            ) {
                                return markai_intent_result(
                                    (string) ($capabilities['category'] ?? 'capabilities'),
                                    (string) ($capabilities['mode'] ?? 'general'),
                                    (string) ($answers['capabilities'] ?? $answers['fallback'] ?? '')
                                );
                            }
                        }

                        $funFacts = $ontology['topics']['funFacts'] ?? null;
                        if (is_array($funFacts)) {
                            $aliases = is_array($funFacts['aliases'] ?? null) ? $funFacts['aliases'] : [];
                            $specificTopic = markai_intent_includes_any($normalized, [
                                    'music',
                                    'movie',
                                    'movies',
                                    'film',
                                    'films',
                                    'show',
                                    'marvel',
                                    'dc',
                                    'creed',
                                    'batman',
                                    'artist',
                                    'artists',
                                    'gym',
                                    'bodybuilding',
                                    'fitness',
                                    'photograph',
                                    'travel',
                                    'mythology',
                                    'project',
                                    'skill',
                                    'goal',
                            ]);
                            if (
                                !$specificTopic
                                && (
                                    markai_intent_includes_any($normalized, $aliases)
                                    || (
                                        str_contains($normalized, 'facts')
                                        && markai_intent_includes_any($normalized, ['fun', 'interesting', 'about mark', 'about him', 'all the', 'all about'])
                                    )
                                    || (
                                        markai_intent_includes_any($normalized, ['what does mark like', 'what is mark into', 'what does he like', 'what is he into'])
                                    )
                                )
                            ) {
                                return markai_intent_result(
                                    'funFacts',
                                    'casual',
                                    (string) ($answers['funFacts'] ?? $answers['hobbies'] ?? '')
                                );
                            }
                        }

                        $oneWord = is_array($ontology['oneWord'] ?? null) ? $ontology['oneWord'] : [];
                        if (isset($oneWord[$normalized]) && is_string($oneWord[$normalized])) {
                            return markai_intent_category_to_result($oneWord[$normalized], $answers, $normalized);
                        }

                        // Bare topic tokens that are exact single-token after normalize.
                        if (preg_match('/^[a-z0-9\'\-]+$/u', $normalized) === 1 && isset($oneWord[$normalized])) {
                            return markai_intent_category_to_result((string) $oneWord[$normalized], $answers, $normalized);
                        }

                        $multi = markai_intent_match_multi_topic($normalized, $answers);
                        if ($multi !== null) {
                            return $multi;
                        }

                        foreach (['careerGoals', 'vibe', 'drives', 'favoriteArtists', 'favoriteFilms'] as $topicId) {
                            $topic = $ontology['topics'][$topicId] ?? null;
                            if (!is_array($topic)) {
                                continue;
                            }
                            $aliases = is_array($topic['aliases'] ?? null) ? $topic['aliases'] : [];
                            if (markai_intent_includes_any($normalized, $aliases)) {
                                $category = (string) ($topic['category'] ?? $topicId);
                                $mode = (string) ($topic['mode'] ?? 'casual');
                                $answerKey = (string) ($topic['answerKey'] ?? $category);
                                $answer = (string) ($answers[$answerKey] ?? '');
                                if ($category === 'careerGoals' && markai_intent_includes_any($normalized, ['success'])) {
                                    $answer = (string) ($answers['success'] ?? $answer);
                                }
                                if ($category === 'favoriteFilms') {
                                    if (markai_intent_includes_any($normalized, ['regular show'])) {
                                        $answer = (string) ($answers['favoriteShow'] ?? $answer);
                                    } elseif (markai_intent_includes_any($normalized, ['marvel', 'dc', 'superhero'])) {
                                        $answer = (string) ($answers['favoriteFilmsMarvelDc'] ?? $answer);
                                    }
                                }

                                return markai_intent_result($category, $mode, $answer);
                            }
                        }

                        return null;
                    }

                    /**
                    * @param array<string, string> $answers
                    * @return array{category: string, mode: string, answer: string, answerStatus: string}|null
                    */
                    function markai_intent_match_multi_topic(string $text, array $answers): ?array
                    {
                        $ontology = markai_intent_ontology();
                        $hints = is_array($ontology['multiTopicHints'] ?? null) ? $ontology['multiTopicHints'] : [];
                        $matched = [];
                        foreach ($hints as $category => $needles) {
                            if (!is_array($needles)) {
                                continue;
                            }
                            foreach ($needles as $needle) {
                                if (!is_string($needle) || $needle === '') {
                                    continue;
                                }
                                if (str_contains($text, $needle)) {
                                    $matched[$category] = true;
                                    break;
                                }
                            }
                        }

                        if (count($matched) < 2) {
                            return null;
                        }

                        // Fun-facts-dominant wording should stay on funFacts, not a dump.
                        if (isset($matched['funFacts']) && markai_intent_includes_any($text, ['fun', 'facts', 'into', 'like'])) {
                            return null;
                        }

                        if (
                            isset($matched['travelPlaces'], $matched['careerGoals'])
                            && markai_intent_includes_any($text, ['want to work', 'job locations', 'work location', 'where does mark want'])
                        ) {
                            $combined = (string) ($answers['travelAndWork'] ?? '');
                            if ($combined !== '') {
                                return markai_intent_result('travelPlaces', 'casual', $combined);
                            }
                        }

                        $sections = [];
                        if (isset($matched['careerGoals'])) {
                            $sections[] = 'Goals: ' . (string) ($answers['careerGoals'] ?? '');
                        }
                        if (isset($matched['projectsInventory'])) {
                            $sections[] = 'Projects: Mark’s approved public software work includes his portfolio platform, MarkAI, Abacus, TA-Bot / MAAT, Finch, Operating Systems coursework, Unity games, and data projects.';
                        }
                        if (isset($matched['technologies'])) {
                            $sections[] = 'Skills: ' . (string) ($answers['technologies'] ?? '');
                        }
                        if (isset($matched['hobbies']) || isset($matched['funFacts'])) {
                            $sections[] = 'Interests: ' . (string) ($answers['hobbies'] ?? '');
                        }
                        if (isset($matched['personality']) || isset($matched['vibe'])) {
                            $sections[] = 'Personality: ' . (string) ($answers['vibe'] ?? $answers['personality'] ?? '');
                        }
                        if (isset($matched['work'])) {
                            $sections[] = 'Experience: ' . (string) ($answers['work'] ?? '');
                        }
                        if (isset($matched['favoriteArtists'])) {
                            $sections[] = 'Music: ' . (string) ($answers['favoriteArtists'] ?? '');
                        }
                        if (isset($matched['favoriteFilms'])) {
                            $sections[] = 'Films: ' . (string) ($answers['favoriteFilms'] ?? '');
                        }
                        if (isset($matched['bodybuilding']) || isset($matched['powerlifting'])) {
                            $sections[] = 'Fitness: ' . (string) ($answers['bodybuilding'] ?? '');
                        }
                        if (isset($matched['travelPlaces'])) {
                            $sections[] = 'Travel: ' . (string) ($answers['travelPlaces'] ?? '');
                        }

                        if (count($sections) < 2) {
                            return null;
                        }

                        $sections = array_slice($sections, 0, 3);
                        $answer = "Here is a concise overview of those topics:\n\n- " . implode("\n- ", $sections);

                        return markai_intent_result('multiTopic', 'general', $answer);
                    }

                    /**
                    * @param array<string, string> $answers
                    * @return array{category: string, mode: string, answer: string, answerStatus: string}|null
                    */
                    function markai_intent_category_to_result(string $category, array $answers, string $normalized = ''): ?array
                    {
                        $mode = 'casual';
                        $answerKey = $category;

                        switch ($category) {
                            case 'careerGoals':
                            $mode = markai_intent_includes_any($normalized, ['want to work', 'job locations', 'work', 'relocate'])
                                ? 'recruiter'
                                : 'casual';
                            $answerKey = markai_intent_includes_any($normalized, ['success'])
                                ? 'success'
                                : (markai_intent_includes_any($normalized, ['want to work', 'job locations', 'work', 'relocate'])
                                    ? 'workLocation'
                                    : 'careerGoals');
                            break;
                            case 'hobbies':
                            if (markai_intent_includes_any($normalized, ['dog', 'kobe', 'my son', 'his son']) || $normalized === 'dog' || $normalized === 'dog name') {
                                $answerKey = 'dog';
                            }
                            break;
                            case 'favoriteColor':
                            $answerKey = 'favoriteColor';
                            break;
                            case 'technologies':
                            $mode = 'technical';
                            break;
                            case 'projectsInventory':
                            $mode = 'technical';
                            break;
                            case 'work':
                            $mode = 'recruiter';
                            break;
                            case 'profile':
                            $mode = 'recruiter';
                            $answerKey = 'profile';
                            break;
                            case 'resume':
                            case 'contact':
                            case 'testimonials':
                            case 'testimonialsList':
                            case 'testimonialsAllQuotes':
                            case 'testimonialProfessors':
                            case 'testimonialCoworkers':
                            case 'testimonialZack':
                            case 'testimonialFarzeen':
                            case 'testimonialJorge':
                            $mode = 'recruiter';
                            if ($category === 'testimonialsList') {
                                $answerKey = markai_intent_includes_any($normalized, [
                                            'all full',
                                            'all quotes',
                                ]) ? 'testimonialsAllQuotes' : 'testimonialsList';
                            } elseif (markai_intent_includes_any($normalized, [
                                        'full quote',
                                        'exact quote',
                                        'word for word',
                                        'direct quote',
                                        'full testimonial',
                            ])) {
                                if ($category === 'testimonialZack') {
                                    $answerKey = 'testimonialZackQuote';
                                } elseif ($category === 'testimonialFarzeen') {
                                    $answerKey = 'testimonialFarzeenQuote';
                                } elseif ($category === 'testimonialJorge') {
                                    $answerKey = 'testimonialJorgeQuote';
                                }
                            }
                            break;
                            case 'collaboratorsJustin':
                            case 'collaboratorsAngel':
                            case 'collaboratorsJacob':
                            case 'collaboratorsLuis':
                            case 'collaboratorsXavier':
                            case 'collaboratorsJulianne':
                            case 'collaboratorsAllan':
                            case 'collaboratorsAbacus':
                            case 'collaboratorsMaat':
                            case 'collaboratorsFinch':
                            case 'collaboratorsDataMining':
                            case 'collaboratorsOs':
                            case 'collaboratorsSleep':
                            case 'collaboratorsInventory':
                            $mode = 'technical';
                            break;
                            case 'githubOnly':
                            $mode = 'technical';
                            break;
                            case 'capabilities':
                            $mode = 'general';
                            break;
                            case 'funFacts':
                            $mode = 'casual';
                            break;
                            case 'powerlifting':
                            $mode = 'casual';
                            $answerKey = 'powerlifting';
                            break;
                            case 'liftingNumbers':
                            $mode = 'casual';
                            $answerKey = 'liftingNumbers';
                            break;
                            case 'bodybuilding':
                            $mode = 'casual';
                            $answerKey = 'bodybuilding';
                            if (markai_intent_includes_any($normalized, [
                                        'gym taught',
                                        'fitness taught',
                                        'what has fitness',
                                        'what has the gym',
                                        'taught mark',
                            ])) {
                                $answerKey = 'fitnessTaught';
                            } elseif (markai_intent_includes_any($normalized, [
                                        'bodybuilding mean',
                                        'what does bodybuilding',
                                        'why bodybuilding',
                                        'why did mark move',
                                        'move from powerlifting',
                                        'powerlifting to bodybuilding',
                            ])) {
                                $answerKey = 'bodybuildingMeaning';
                            }
                            break;
                            default:
                            $mode = 'casual';
                            break;
                        }

                        $answer = (string) ($answers[$answerKey] ?? '');
                        if ($answer === '' && isset($answers[$category])) {
                            $answer = (string) $answers[$category];
                        }
                        if ($answer === '') {
                            return null;
                        }

                        return markai_intent_result($category, $mode, $answer);
                    }

                    /**
                    * @return array{category: string, mode: string, answer: string, answerStatus: string}
                    */
                    function markai_intent_result(string $category, string $mode, string $answer): array
                    {
                        return [
                            'category' => $category,
                            'mode' => $mode,
                            'answer' => $answer,
                            'answerStatus' => 'answered',
                        ];
                    }

                    /**
                    * Resolve short contextual follow-ups beyond repo/photos.
                    *
                    * @param list<array{role?: string, content?: string}> $history
                    * @param array<string, string> $answers
                    * @return array{category: string, mode: string, answer: string, answerStatus: string}|null
                    */
                    function markai_intent_resolve_topic_followup(string $text, array $history, array $answers): ?array
                    {
                        $ontology = markai_intent_ontology();
                        $normalized = trim($text, " \t\n\r\0\x0B?.!");
                        $followUps = is_array($ontology['followUpTopics'] ?? null) ? $ontology['followUpTopics'] : [];
                        if (!isset($followUps[$normalized]) && !isset($followUps[$text])) {
                            // Also accept leading "and "
                            if (str_starts_with($normalized, 'and ')) {
                                $trimmed = trim(substr($normalized, 4));
                                if (isset($followUps[$trimmed]) || isset($followUps[$trimmed . '?'])) {
                                    $normalized = $trimmed;
                                }
                            }
                            if (!isset($followUps[$normalized]) && !isset($followUps[$normalized . '?'])) {
                                return null;
                            }
                        }

                        $target = $followUps[$normalized] ?? $followUps[$normalized . '?'] ?? $followUps[$text] ?? null;
                        if (!is_string($target) || $target === '') {
                            return null;
                        }

                        $context = markai_intent_history_context($history);

                        if ($target === 'namesContextual') {
                            return markai_intent_resolve_names_contextual($text, $context, $answers, $ontology);
                        }

                        if (
                            $target === 'testimonials'
                            && (
                                $normalized === 'full quote'
                                || $normalized === 'exact quote'
                                || str_starts_with(strtolower(trim($text)), 'full quote')
                            )
                        ) {
                            if (
                                str_contains($context, 'zack')
                                || str_contains($context, 'kohlwey')
                                || str_contains($context, 'alumni memorial')
                            ) {
                                return markai_intent_category_to_result('testimonialZack', $answers, 'full quote');
                            }
                            if (
                                str_contains($context, 'farzeen')
                                || str_contains($context, 'harunani')
                                || str_contains($context, 'professor of computer science')
                            ) {
                                return markai_intent_category_to_result('testimonialFarzeen', $answers, 'full quote');
                            }
                            if (
                                str_contains($context, 'jorge')
                                || str_contains($context, 'torres')
                                || str_contains($context, 'performance validation')
                            ) {
                                return markai_intent_category_to_result('testimonialJorge', $answers, 'full quote');
                            }
                        }

                        // Testimonials-list style targets must not win when the current wording
                        // or recent history clearly points at project teammates.
                        if (
                            in_array($target, ['testimonials', 'testimonialsList'], true)
                            && markai_intent_project_team_cues($text . ' ' . $context)
                        ) {
                            return markai_intent_resolve_names_contextual($text, $context, $answers, $ontology);
                        }

                        if ($context === '') {
                            // Without history, one-word follow-ups still map via normal one-word topics.
                            if ($target === 'collaboratorsContextual') {
                                return markai_intent_category_to_result('collaboratorsInventory', $answers);
                            }

                            return markai_intent_category_to_result($target, $answers, $normalized);
                        }

                        if ($target === 'collaboratorsContextual') {
                            $projectMap = is_array($ontology['projectContext'] ?? null) ? $ontology['projectContext'] : [];
                            foreach ($projectMap as $needle => $category) {
                                if (!is_string($needle) || !is_string($category)) {
                                    continue;
                                }
                                if (str_contains($context, $needle)) {
                                    return markai_intent_category_to_result($category, $answers);
                                }
                            }

                            return markai_intent_category_to_result('collaboratorsInventory', $answers);
                        }

                        // Prefer follow-up when prior turn discussed related lifestyle/career themes,
                        // or always when the short follow-up is an approved topic word.
                        return markai_intent_category_to_result($target, $answers, $normalized);
                    }

                    function markai_intent_project_team_cues(string $haystack): bool
                    {
                        $haystack = strtolower($haystack);

                        return markai_intent_includes_any($haystack, [
                            'project',
                            'team',
                            'teammate',
                            'teammates',
                            'classmate',
                            'classmates',
                            'collaborator',
                            'collaborators',
                            'senior design',
                            'abacus',
                            'eagle',
                            'maat',
                            'ta-bot',
                            'tabot',
                            'finch',
                            'birdvroom',
                            'worked on',
                            'worked with',
                            'justin',
                            'hoffman',
                            'angel',
                            'mora',
                            'jacob',
                            'dunroseman',
                            'dun roseman',
                            'luis',
                            'serrano',
                            'xavier',
                            'barth',
                            'julianne',
                            'browne',
                            'allan',
                            'akkathara',
                            'armaan',
                            'hunter carlson',
                            'document manager',
                            'repo manager',
                            'operating systems',
                            'data mining',
                            'sleep analysis',
                        ]);
                    }

                    function markai_intent_history_has_project_team_topic(string $context): bool
                    {
                        $context = strtolower($context);

                        return markai_intent_includes_any($context, [
                            'abacus',
                            'eagle messaging',
                            'maat',
                            'ta-bot',
                            'tabot',
                            'finch',
                            'birdvroom',
                            'senior design',
                            'document manager',
                            'repo manager',
                            'justin hoffman',
                            'angel mora',
                            'jacob dunroseman',
                            'luis serrano',
                            'xavier barth',
                            'julianne browne',
                            'allan akkathara',
                            'armaan yaz',
                            'hunter carlson',
                            'project collaborators, by project',
                            'verified teammates',
                            'core student team',
                            'operating systems c',
                            'data mining game',
                            'sleep efficiency analysis',
                        ]);
                    }

                    function markai_intent_history_suggests_testimonials_only(string $context): bool
                    {
                        if ($context === '') {
                            return false;
                        }

                        $hasTestimonial = markai_intent_includes_any($context, [
                            'testimonial',
                            'testimonials',
                            'recommendation',
                            'recommendations',
                            'farzeen',
                            'zack kohlwey',
                            'jorge torres',
                            'alumni memorial',
                            'professor of computer science',
                            'testimonials section',
                            'attributed',
                        ]);
                        if (!$hasTestimonial) {
                            return false;
                        }

                        // If recent history is also about project teammates, do not treat it as
                        // testimonials-only continuation.
                        return !markai_intent_history_has_project_team_topic($context);
                    }

                    /**
                    * @param array<string, mixed> $ontology
                    * @param array<string, string> $answers
                    * @return array{category: string, mode: string, answer: string, answerStatus: string}|null
                    */
                    function markai_intent_resolve_names_contextual(string $text, string $context, array $answers, array $ontology): ?array
                    {
                        $combined = strtolower(trim($text . ' ' . $context));
                        if (markai_intent_project_team_cues($text) || markai_intent_history_has_project_team_topic($context)) {
                            $projectMap = is_array($ontology['projectContext'] ?? null) ? $ontology['projectContext'] : [];
                            foreach ($projectMap as $needle => $category) {
                                if (!is_string($needle) || !is_string($category)) {
                                    continue;
                                }
                                if (str_contains($combined, $needle)) {
                                    return markai_intent_category_to_result($category, $answers);
                                }
                            }

                            return markai_intent_category_to_result('collaboratorsInventory', $answers);
                        }

                        if (markai_intent_history_suggests_testimonials_only($context)) {
                            return markai_intent_category_to_result('testimonialsList', $answers);
                        }

                        // Ambiguous short "list names?" / "who else?" with no usable topic.
                        return markai_intent_category_to_result('collaboratorsInventory', $answers);
                    }




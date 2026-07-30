<?php

declare(strict_types=1);

/**
 * Deterministic MarkAI preview endpoint service.
 *
 * No HTTP output on include. No network, secrets, logging, or database access.
 */

require_once __DIR__ . '/PromptBuilder.php';
require_once __DIR__ . '/GeneratedAnswerService.php';
require_once __DIR__ . '/ProviderConfiguration.php';
require_once __DIR__ . '/FileUsageLimiter.php';
require_once __DIR__ . '/UsageLimitResult.php';

final class MarkAiMockEndpointException extends RuntimeException
{
    private string $errorCode;
    private int $httpStatus;

    public function __construct(string $message, string $errorCode, int $httpStatus)
    {
        parent::__construct($message);
        $this->errorCode = $errorCode;
        $this->httpStatus = $httpStatus;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }
}

/**
 * Handle a MarkAI preview request using the approved export and PromptBuilder.
 *
 * Optional provider generation may draft text, but every provider failure or
 * unsafe answer returns control to the deterministic classifier. Provider
 * configuration defaults to disabled and no network transport is used unless
 * explicitly injected by tests or a future wiring phase.
 *
 * @param array<string, mixed> $export
 * @param array<string, mixed> $payload
 * @param array<string, mixed>|null $providerConfiguration
 * @return array<string, mixed>
 *
 * @throws MarkAiMockEndpointException
 * @throws MarkAiPromptBuilderException
 */
function handleMarkAiPreviewRequest(
    array $export,
    array $payload,
    ?array $providerConfiguration = null,
    ?callable $transport = null,
    ?GeneratedAnswerService $generatedAnswerService = null,
    ?FileUsageLimiter $usageLimiter = null,
    ?string $anonymousSessionId = null
): array {
    $service = $generatedAnswerService ?? new GeneratedAnswerService();
    $configuration = markai_load_provider_configuration($providerConfiguration);
    $validated = markai_mock_validate_payload($payload);

    $privacy = $service->privacyPreFilter($validated['question']);
    if ($privacy !== null && ($privacy['refuse'] ?? false) === true) {
        $mode = 'general';
        $built = buildMarkAiRequest(
            $export,
            $validated['question'],
            $validated['history'],
            [],
            $mode
        );
        $allowedLinkIds = is_array($built['allowedLinkIds'] ?? null) ? $built['allowedLinkIds'] : [];
        $links = markai_mock_resolve_links(
            $export,
            markai_mock_requested_link_ids('sensitive'),
            $allowedLinkIds,
            markai_mock_context_set('sensitive', $mode)
        );

        return [
            'success' => true,
            'answer' => (string) $privacy['answer'],
            'answerStatus' => 'refused',
            'links' => $links,
            'mode' => $mode,
            'conversationId' => 'preview',
            'preview' => true,
            'error' => null,
        ];
    }

    $classified = markai_mock_classify($validated['question']);

    $mode = $classified['mode'];
    if ($classified['category'] === 'sensitive') {
        $mode = 'general';
    } elseif ($validated['mode'] !== null && $classified['category'] !== 'sensitive') {
        // Deterministic category mapping remains authoritative for preview answers.
        $mode = $classified['mode'];
    }

    $selectedRecordIds = markai_mock_select_record_ids($export, $classified['category']);
    $requestedLinkIds = markai_mock_requested_link_ids($classified['category']);

    $built = buildMarkAiRequest(
        $export,
        $validated['question'],
        $validated['history'],
        $selectedRecordIds,
        $mode
    );

    $allowedLinkIds = is_array($built['allowedLinkIds'] ?? null) ? $built['allowedLinkIds'] : [];
    $contextSet = markai_mock_context_set($classified['category'], $mode);
    $links = markai_mock_resolve_links(
        $export,
        $requestedLinkIds,
        $allowedLinkIds,
        $contextSet
    );

    $messages = is_array($built['messages'] ?? null) ? $built['messages'] : [];
    $deterministic = [
        'success' => true,
        'answer' => $classified['answer'],
        'answerStatus' => $classified['answerStatus'],
        'links' => $links,
        'mode' => $mode,
        'conversationId' => 'preview',
        'preview' => true,
        'error' => null,
    ];

    $providerUsable = markai_provider_configuration_is_usable($configuration);
    $shouldLimit = $usageLimiter instanceof FileUsageLimiter
        && $usageLimiter->isEnabled()
        && $providerUsable
        && is_string($anonymousSessionId)
        && $anonymousSessionId !== '';

    if ($shouldLimit) {
        $permit = $usageLimiter->acquireProviderPermit($anonymousSessionId);
        if (!$permit->isAllowed()) {
            $deterministic['answerStatus'] = $permit->getAnswerStatus();
            return $deterministic;
        }

        try {
            $generated = $service->tryProviderAnswer($messages, $configuration, $transport);
        } finally {
            $usageLimiter->releaseProviderPermit($anonymousSessionId);
        }
    } else {
        $generated = $service->tryProviderAnswer($messages, $configuration, $transport);
    }

    if ($generated !== null) {
        return [
            'success' => true,
            'answer' => $generated['answer'],
            'answerStatus' => 'answered',
            'links' => $links,
            'mode' => $mode,
            'conversationId' => 'preview',
            'preview' => true,
            'error' => null,
        ];
    }

    return $deterministic;
}

/**
 * @param array<string, mixed> $payload
 * @return array{question: string, history: list<array{role: string, content: string}>, mode: ?string}
 */
function markai_mock_validate_payload(array $payload): array
{
    $dangerous = [
        'system',
        'instructions',
        'prompt',
        'recordIds',
        'selectedRecordIds',
        'linkIds',
        'provider',
        'model',
    ];
    foreach ($dangerous as $field) {
        if (array_key_exists($field, $payload)) {
            throw new MarkAiMockEndpointException(
                'Unsupported request field.',
                'invalid_request',
                422
            );
        }
    }

    if (!array_key_exists('question', $payload) || !is_string($payload['question'])) {
        throw new MarkAiMockEndpointException(
            'Question is required.',
            'invalid_request',
            422
        );
    }

    $question = trim($payload['question']);
    if ($question === '') {
        throw new MarkAiMockEndpointException(
            'Question is required.',
            'invalid_request',
            422
        );
    }
    if (markai_strlen($question) > 2000) {
        throw new MarkAiMockEndpointException(
            'Question is too long.',
            'invalid_request',
            422
        );
    }

    $history = [];
    if (array_key_exists('history', $payload)) {
        if (!is_array($payload['history'])) {
            throw new MarkAiMockEndpointException(
                'History must be an array.',
                'invalid_request',
                422
            );
        }
        if (count($payload['history']) > 10) {
            throw new MarkAiMockEndpointException(
                'History is too long.',
                'invalid_request',
                422
            );
        }
        foreach ($payload['history'] as $item) {
            if (!is_array($item)) {
                throw new MarkAiMockEndpointException(
                    'Invalid history entry.',
                    'invalid_request',
                    422
                );
            }
            $role = $item['role'] ?? null;
            $content = $item['content'] ?? null;
            if ($role !== 'user' && $role !== 'assistant') {
                throw new MarkAiMockEndpointException(
                    'Invalid history role.',
                    'invalid_request',
                    422
                );
            }
            if (!is_string($content)) {
                throw new MarkAiMockEndpointException(
                    'Invalid history content.',
                    'invalid_request',
                    422
                );
            }
            $trimmed = trim($content);
            if ($trimmed === '' || markai_strlen($trimmed) > 4000) {
                throw new MarkAiMockEndpointException(
                    'Invalid history content.',
                    'invalid_request',
                    422
                );
            }
            $history[] = ['role' => $role, 'content' => $trimmed];
        }
    }

    $mode = null;
    if (array_key_exists('mode', $payload) && $payload['mode'] !== null) {
        if (!is_string($payload['mode'])) {
            throw new MarkAiMockEndpointException(
                'Invalid mode.',
                'invalid_request',
                422
            );
        }
        $mode = $payload['mode'];
        if (!in_array($mode, ['recruiter', 'technical', 'general', 'casual'], true)) {
            throw new MarkAiMockEndpointException(
                'Invalid mode.',
                'invalid_request',
                422
            );
        }
    }

    // Unknown harmless top-level fields are ignored.
    return [
        'question' => $question,
        'history' => $history,
        'mode' => $mode,
    ];
}

/**
 * @return array{category: string, mode: string, answer: string, answerStatus: string}
 */
function markai_mock_classify(string $question): array
{
    $text = strtolower(trim($question));
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

    $answers = [
        'profile' => 'Mark Yoingco is a recent Computer Science graduate from Marquette University seeking his first full-time technology role. His work includes a personal portfolio platform, senior design projects, systems coursework, robotics, data projects, and Unity projects.',
        'abacus' => 'Abacus was a team senior-design project used for the Wisconsin-Dairyland Programming Competition. Mark’s verified work included Eagle messaging APIs, role-aware chat and inbox behavior, competition workflows, routing and persistence, frontend/backend integration, submission-system support, testing, and UI debugging. The April 15, 2026 event used the platform to support approximately 200–300 high-school students, teachers, judges, and administrators and ran without major server crashes, platform failures, critical bugs, or major lag.',
        'technologies' => 'Mark has worked with technologies including JavaScript, TypeScript, Python, Java, R, SQL, C, C#, PHP, React, Vite, Flask, MySQL, Docker, Socket.IO, Linux/WSL, Unity, Figma, Cloudflare Workers AI, and REST-style APIs through coursework and projects.',
        'individualTeam' => 'Mark built his portfolio platform as an individual project. Abacus, MAAT, Finch, Sleep Efficiency Analysis, and the basketball predictor were team or coursework projects, so their team context should remain clear.',
        'work' => 'Mark’s public experience includes AV Technician, Information Desk Specialist Manager, Assistant Building Manager, Hollister retail work, and Panda Express Chef/Person in Charge, along with approved campus leadership experience.',
        'contact' => 'The portfolio Contact page is the preferred method. LinkedIn, GitHub, the résumé, and VSCO may also be relevant depending on what a visitor is looking for.',
        'sensitive' => 'I only share Mark’s approved public portfolio information. I can help with his projects, skills, experience, education, interests, or the portfolio Contact page.',
        'status' => 'MarkAI is live on markyoingco.com and actively maintained. It answers from Mark’s approved portfolio information using a PHP backend and Cloudflare Workers AI, with response validation, deterministic fallback answers, privacy protections, and anonymous usage limits. Future updates may include bug fixes, testing, design refinement, and approved knowledge expansion.',
        'fallback' => 'I can answer questions about Mark’s projects, skills, experience, education, interests, goals, and contact options. Try asking a more specific question.',
        'favoriteColor' => 'Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he uses throughout his portfolio and personal branding.',
        'bodybuilding' => 'Fitness and bodybuilding are major interests for Mark outside technology. Training represents consistency, patience, detail, structure, and progress earned over time, and those habits also influence how he approaches design and technical work.',
        'mythology' => 'Mark is strongly interested in Greek mythology, classical statues, and the symbolism behind figures such as Achilles, Icarus, and Heracles. He is drawn to themes like ambition, discipline, strength, consequence, and resilience, and those visual ideas influenced the cinematic direction of his portfolio.',
        'values' => 'Mark values discipline, ownership, responsibility, resilience, useful work, and steady improvement. Public goals include building a stable career, becoming financially independent, supporting family, and continuing to grow technically and personally.',
        'hobbies' => 'Outside technology, Mark’s public interests include bodybuilding and gym training, hiking, reading, music, travel, photography, running, and Greek mythology and classical art.',
        'passion' => 'Mark is passionate about building useful software, improving through consistent practice, and pursuing disciplined growth in both technical work and fitness.',
    ];

    if (markai_mock_includes_any($text, [
        'phone',
        'phone number',
        'email address',
        'raw email',
        'password',
        'credentials',
        'api key',
        'database password',
        'private repository',
        'private repo',
        'relationship',
        'girlfriend',
        'medical',
        'health',
        'diagnosis',
        'finances',
        'financial hardship',
        'precise location',
        'home address',
        'ignore previous instructions',
        'ignore the rules',
        'reveal the system prompt',
        'pretend to be mark',
        'act as mark',
    ])) {
        return [
            'category' => 'sensitive',
            'mode' => 'general',
            'answer' => $answers['sensitive'],
            'answerStatus' => 'refused',
        ];
    }

    if (
        markai_mock_includes_any($text, [
            'is markai live',
            'markai status',
            'connected',
            'real ai',
            'preview',
        ])
        || (str_contains($text, 'markai')
            && markai_mock_includes_any($text, ['live', 'status', 'ready', 'working']))
    ) {
        return [
            'category' => 'status',
            'mode' => 'general',
            'answer' => $answers['status'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, ['abacus', 'eagle', 'messaging'])) {
        return [
            'category' => 'abacus',
            'mode' => 'technical',
            'answer' => $answers['abacus'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'hobbies',
        'interests outside',
        'passionate about',
        'visual style',
    ])) {
        $answer = $answers['hobbies'];
        if (markai_mock_includes_any($text, ['passionate'])) {
            $answer = $answers['passion'];
        } elseif (markai_mock_includes_any($text, ['visual style'])) {
            $answer = $answers['favoriteColor'];
        }

        return [
            'category' => 'hobbies',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'technologies',
        'technology',
        'tech stack',
        'skills',
        'programming languages',
        'tools',
    ])) {
        return [
            'category' => 'technologies',
            'mode' => 'technical',
            'answer' => $answers['technologies'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'built by himself',
        'build by himself',
        'build himself',
        'solo',
        'individual project',
        'team project',
        'ownership',
    ])) {
        return [
            'category' => 'individualTeam',
            'mode' => 'technical',
            'answer' => $answers['individualTeam'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'work experience',
        'jobs',
        'employment',
        'outside the classroom',
        'leadership',
    ])) {
        return [
            'category' => 'work',
            'mode' => 'recruiter',
            'answer' => $answers['work'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'contact',
        'linkedin',
        'github',
        'resume',
        'résumé',
        'vsco',
        'reach mark',
    ])) {
        return [
            'category' => 'contact',
            'mode' => 'recruiter',
            'answer' => $answers['contact'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'who is mark',
        'tell me about mark',
        'background',
        'education',
        'graduate',
    ])) {
        return [
            'category' => 'profile',
            'mode' => 'general',
            'answer' => $answers['profile'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'favorite color',
        'favourite color',
        'color black',
    ])) {
        return [
            'category' => 'favoriteColor',
            'mode' => 'casual',
            'answer' => $answers['favoriteColor'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'bodybuilding',
        'fitness',
        'gym',
        'training mean',
        'how does fitness',
    ])) {
        return [
            'category' => 'bodybuilding',
            'mode' => 'casual',
            'answer' => $answers['bodybuilding'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'mythology',
        'achilles',
        'icarus',
        'heracles',
        'hercules',
        'greek myth',
    ])) {
        return [
            'category' => 'mythology',
            'mode' => 'casual',
            'answer' => $answers['mythology'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'what does mark value',
        'what motivates',
        'long-term goals',
        'long term goals',
        'what does success',
        'type of person',
        'recruiters to remember',
    ])) {
        return [
            'category' => 'values',
            'mode' => 'casual',
            'answer' => $answers['values'],
            'answerStatus' => 'answered',
        ];
    }

    return [
        'category' => 'fallback',
        'mode' => 'general',
        'answer' => $answers['fallback'],
        'answerStatus' => 'unavailable',
    ];
}

/**
 * @param list<string> $phrases
 */
function markai_mock_includes_any(string $text, array $phrases): bool
{
    foreach ($phrases as $phrase) {
        if ($phrase !== '' && str_contains($text, $phrase)) {
            return true;
        }
    }

    return false;
}

/**
 * @param array<string, mixed> $export
 * @return list<string>
 */
function markai_mock_select_record_ids(array $export, string $category): array
{
    $available = [];
    foreach ($export['records'] ?? [] as $record) {
        if (is_array($record) && isset($record['id']) && is_string($record['id'])) {
            $available[$record['id']] = true;
        }
    }

    $pick = static function (array $ids) use ($available): array {
        $out = [];
        foreach ($ids as $id) {
            if (isset($available[$id])) {
                $out[] = $id;
            }
        }

        return $out;
    };

    switch ($category) {
        case 'sensitive':
        case 'fallback':
            return [];

        case 'status':
            return $pick(['navigation-portfolio-modes']);

        case 'abacus':
            return $pick([
                'project-abacus',
                'contrib-abacus-eagle-core',
                'contrib-abacus-instructions-routing',
                'contrib-abacus-inbox-chat',
                'contrib-abacus-dropdown-fixes',
                'skill-rest-apis',
                'skill-flask',
                'skill-react',
            ]);

        case 'technologies':
            return $pick([
                'skill-javascript',
                'skill-typescript',
                'skill-python',
                'skill-java',
                'skill-r',
                'skill-react',
                'skill-flask',
                'skill-rest-apis',
                'skill-docker',
                'skill-socket-io',
                'skill-figma',
                'skill-git-github',
            ]);

        case 'individualTeam':
            return $pick([
                'project-portfolio-platform',
                'project-abacus',
                'project-maat',
                'project-finch-web-controller',
                'project-sleep-efficiency-analysis',
                'project-marquette-basketball-predictor',
            ]);

        case 'work':
            return $pick([
                'work-av-technician-marquette',
                'work-info-desk-manager-marquette',
                'work-assistant-building-manager-marquette',
                'work-hollister-retail',
                'work-panda-express-pic',
                'leadership-sigma-chi-risk-merchandise',
                'membership-bayanihan-bso',
            ]);

        case 'contact':
            return $pick(['contact-preferred-methods']);

        case 'profile':
            return [];

        default:
            return [];
    }
}

/**
 * @return list<string>
 */
function markai_mock_requested_link_ids(string $category): array
{
    switch ($category) {
        case 'abacus':
            return ['link-github-abacus'];
        case 'technologies':
            return ['link-github-profile'];
        case 'individualTeam':
            return [
                'link-github-portfolio',
                'link-github-abacus',
                'link-github-maat',
                'link-github-finch',
            ];
        case 'work':
            return ['link-resume-pdf', 'link-linkedin'];
        case 'contact':
            return [
                'link-contact-section',
                'link-linkedin',
                'link-github-profile',
                'link-resume-pdf',
                'link-vsco',
            ];
        case 'profile':
            return ['link-portfolio-home', 'link-resume-pdf'];
        default:
            return [];
    }
}

/**
 * @return array<string, bool>
 */
function markai_mock_context_set(string $category, string $mode): array
{
    $contexts = ['answer', $mode];

    if (in_array($category, ['abacus', 'technologies', 'individualTeam'], true)) {
        $contexts[] = 'projects';
    }
    if (in_array($category, ['contact', 'work', 'profile'], true)) {
        $contexts[] = 'contact';
    }
    if (in_array($category, ['status', 'profile'], true)) {
        $contexts[] = 'navigation';
    }

    $set = [];
    foreach ($contexts as $context) {
        $set[$context] = true;
    }

    return $set;
}

/**
 * @param array<string, mixed> $export
 * @param list<string> $requestedLinkIds
 * @param list<string> $allowedLinkIds
 * @param array<string, bool> $contextSet
 * @return list<array{id: string, label: string, href: string, external: bool, opensNewTab: bool}>
 */
function markai_mock_resolve_links(
    array $export,
    array $requestedLinkIds,
    array $allowedLinkIds,
    array $contextSet
): array {
    $allowedSet = array_fill_keys($allowedLinkIds, true);
    $linksById = [];
    foreach ($export['trustedLinks'] ?? [] as $link) {
        if (is_array($link) && isset($link['id']) && is_string($link['id'])) {
            $linksById[$link['id']] = $link;
        }
    }

    $resolved = [];
    foreach ($requestedLinkIds as $linkId) {
        if ($linkId === 'link-email' || $linkId === 'link-markai-route') {
            continue;
        }
        if (!isset($allowedSet[$linkId]) || !isset($linksById[$linkId])) {
            continue;
        }
        $link = $linksById[$linkId];
        if (($link['enabled'] ?? false) !== true) {
            continue;
        }
        if (($link['public'] ?? false) !== true) {
            continue;
        }
        if (!is_string($link['href'] ?? null) || $link['href'] === '') {
            continue;
        }
        if (!is_string($link['label'] ?? null) || $link['label'] === '') {
            continue;
        }

        $allowedContexts = $link['allowedContexts'] ?? [];
        if (!is_array($allowedContexts)) {
            continue;
        }
        $contextOk = false;
        foreach ($allowedContexts as $ctx) {
            if (is_string($ctx) && isset($contextSet[$ctx])) {
                $contextOk = true;
                break;
            }
        }
        if (!$contextOk) {
            continue;
        }

        $resolved[] = [
            'id' => $linkId,
            'label' => $link['label'],
            'href' => $link['href'],
            'external' => ($link['external'] ?? false) === true,
            'opensNewTab' => ($link['opensNewTab'] ?? false) === true,
        ];
    }

    return $resolved;
}

if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool
    {
        if ($needle === '') {
            return true;
        }

        return strpos($haystack, $needle) !== false;
    }
}

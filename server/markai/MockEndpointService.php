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
        'links' => 'Mark’s public portfolio links include his homepage, project contact section, GitHub, LinkedIn, résumé, and VSCO profile.',
        'sensitive' => 'I only share Mark’s approved public portfolio information. I can help with his projects, skills, experience, education, interests, or the portfolio Contact page.',
        'status' => 'MarkAI is live on markyoingco.com and actively maintained. It answers from Mark’s approved portfolio information using a PHP backend and Cloudflare Workers AI, with response validation, deterministic fallback answers, privacy protections, and anonymous usage limits. Future updates may include bug fixes, testing, design refinement, and approved knowledge expansion.',
        'favoriteColor' => 'Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he prefers across his portfolio and personal branding, along with clean, organized environments rather than loud or decorative presentation.',
        'bodybuilding' => 'Bodybuilding is Mark’s strongest personal passion outside technology. He views it as a craft built through symmetry, structure, patience, detail, and repetition, and his current focus is aesthetics, controlled movement, and quality progress. Lessons from training also shape how he approaches projects and professional development.',
        'mythology' => 'Mark connects with different Greek mythology figures for different reasons: Icarus for ambition, Achilles for intensity, and Heracles for discipline and endurance. He is drawn to themes like ambition, discipline, strength, consequence, and resilience, and he does not treat one figure as a permanent favorite or as religion.',
        'mythologyIcarus' => 'For Mark, Icarus connects to ambition, dreaming, risk, and the consequences of losing control. It is one symbolic interest among several mythological figures, not a permanent identity or religious claim.',
        'mythologyAchilles' => 'For Mark, Achilles connects to intensity, strength, pride, drive, and human vulnerability. It represents one part of the mindset themes he finds meaningful, not a permanent favorite or complete identity.',
        'mythologyHeracles' => 'For Mark, Heracles connects to endurance, discipline, repeated trials, and becoming stronger through difficult work. It represents growth through challenging effort rather than a permanent favorite or religious claim.',
        'values' => 'Mark values discipline, consistency, responsibility, ownership, ambition, resilience, patience, humility, learning, family support, financial independence, usefulness, creativity, personal growth, controlled confidence, and direct communication. He wants progress to come from repeatable actions rather than temporary intensity.',
        'personality' => 'Mark comes across as ambitious, reflective, disciplined, and growth-oriented. He is detail-focused, direct, and practical, confident when prepared, and serious about improving both technically and personally without relying on loud or theatrical self-presentation.',
        'discipline' => 'Mark values consistency because motivation is temporary. Whether he is training, building software, or working toward a career, he wants progress to come from repeatable actions rather than temporary intensity, with actions proving intentions.',
        'consistency' => 'Mark believes consistency is more dependable than temporary intensity. He values doing the work even when motivation is absent and sees repeated controlled effort as the path to progress.',
        'controlledStrength' => 'Mark is drawn to strength with direction. He believes strength without discipline can become wasted potential, and he prefers confidence that is earned, controlled, patient, and deliberate rather than loud or arrogant.',
        'setbacks' => 'Mark sees setbacks as lessons that can improve future decisions. He values rebuilding, learning, and continuing after difficult periods, and he wants to keep progressing instead of becoming too comfortable to grow.',
        'hobbies' => 'Outside technology, Mark’s public hobbies include bodybuilding and gym training, hiking, reading, music, travel, photography, running, Greek mythology, classical statues and art, museums, and exploring cities and landscapes.',
        'passion' => 'Mark is passionate about building useful software and about bodybuilding outside technology. In both areas he focuses on disciplined practice, steady improvement, and work he can stand behind.',
        'careerGoals' => 'Mark’s immediate goal is a stable technology role with room to grow, including software development, full-stack work, developer tools, data-oriented systems, and related entry-level paths. He wants meaningful work, financial independence, and the ability to support his family, and he is open to Milwaukee, Chicago, remote work, or other locations when the opportunity makes relocation practical.',
        'success' => 'For Mark, long-term success means stability, confidence, meaningful work, independence, continued ambition, and excitement about what comes next. He wants to be proud of work he built usefully and followed through on, not money as his only motivation.',
        'familyGoals' => 'Supporting his family is part of Mark’s public goals alongside building a stable technology career and becoming financially independent. He wants his work to create stability and meaningful progress he can stand behind.',
        'photography' => 'Mark uses photography to preserve feelings, places, views, memories, and important moments. He prefers cinematic, personal, dark, low-exposure, story-driven images of cities, architecture, landscapes, museums, and travel experiences.',
        'travel' => 'Travel helps Mark see different cultures, lifestyles, opportunities, and perspectives. Cities represent ambition and progress, oceans and islands represent peace, and mountains represent effort that earns the view, all motivating greater independence and freedom.',
        'environment' => 'Mark prefers clean, organized, minimal environments with a cinematic mix of classical architecture, statues, modern technology, city lights, rooftops, and controlled darkness. He likes a modern technical-professional atmosphere and dislikes corny or overly decorative presentation.',
        'becoming' => 'Mark is working to become more consistent, controlled, and capable over time. He wants confidence rooted in preparation and demonstrated work, with strength directed by discipline rather than temporary intensity.',
        'collaboratorsAbacus' => 'The core student team for Abacus included Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman. Sam Mazzone supported the team separately as an advisor, software developer, and moral supporter.',
        'collaboratorsMaat' => 'The core student team for TA-Bot / MAAT included Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman. Sam Mazzone supported the team separately as an advisor, software developer, and moral supporter.',
        'collaboratorsSam' => 'Sam Mazzone supported the Abacus and TA-Bot / MAAT teams as an advisor, software developer, and moral supporter. He is not described as one of the core student teammates; the core student team was Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman.',
        'collaboratorsFinch' => 'The Finch Web Controller team included Mark Yoingco, Julianne Browne, Luis Serrano, and Xavier Barth.',
        'collaboratorsDataMining' => 'The Data Mining Game Predictor team included Mark Yoingco and Allan Akkathara.',
        'collaboratorsOs' => 'For Operating Systems C Projects, the approved collaborator names are Mark Yoingco and Armaan Yaz. Private or shared course repositories remain unpublished.',
        'collaboratorsSleep' => 'For the Sleep Efficiency Analysis data-science project, the approved collaborator names are Mark Yoingco and Hunter Carlson.',
        'collaboratorsInventory' => "Mark’s approved project collaborators, by project:\n\n- Abacus: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- TA-Bot / MAAT: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- Support for Abacus and MAAT: Sam Mazzone (advisor, software developer, moral supporter)\n- Finch: Mark Yoingco, Julianne Browne, Luis Serrano, Xavier Barth\n- Data Mining: Mark Yoingco, Allan Akkathara\n- Operating Systems: Mark Yoingco, Armaan Yaz\n- Sleep Analysis: Mark Yoingco, Hunter Carlson",
        'testimonials' => 'Yes. Mark’s portfolio includes public testimonials from people who have worked with, taught, or known him. Zack Kohlwey, Mark’s former supervisor at Marquette University, highlights his dedication, work ethic, and leadership by example. Farzeen Harunani, a Computer Science professor at Marquette, notes his initiative, composure, and dedication. Jorge Torres, a former coworker, emphasizes his thoroughness, ownership, and reliability. Full attributed quotes are in the portfolio Testimonials section.',
        'projectsInventory' => "Mark’s approved public software projects include:\n\n- Portfolio & AI: Personal Portfolio Platform; MarkAI\n- Capstones: Abacus; TA-Bot / MAAT\n- Systems: Operating Systems C Projects\n- Robotics & Software Design: Finch Robot Web Controller\n- Games: Space SHMUP; Apple Picker; Mission Demolition\n- Data: Sleep Efficiency Analysis; Marquette Basketball Predictor\n\nThe portfolio platform and MarkAI are solo personal work. Abacus, MAAT, Finch, and the data projects were team or coursework collaborations.",
        'fallback' => 'I can answer questions about Mark’s projects, skills, experience, education, interests, goals, testimonials, and contact options. Try asking a more specific question.',
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
        'addiction',
        'substance',
        'precise location',
        'home address',
        'ignore previous instructions',
        'ignore the rules',
        'reveal the system prompt',
        'pretend to be mark',
        'act as mark',
        'collaborator email',
        'teammate phone',
        'teammate email',
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

    if (markai_mock_includes_any($text, [
        'all existing links',
        'all links',
        'show me mark’s links',
        "show me mark's links",
        'show me marks links',
        'give me all links',
        'give me his links',
        'mark’s links',
        "mark's links",
        'marks links',
        'find mark online',
        'where can i find mark',
        'github and linkedin',
        'linkedin and github',
        'give me his github',
        'give me his linkedin',
        'public links',
        'portfolio links',
    ])) {
        return [
            'category' => 'links',
            'mode' => 'general',
            'answer' => $answers['links'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, ['abacus', 'eagle', 'messaging'])
        && !markai_mock_includes_any($text, [
            'abacus team',
            'on the abacus',
            'worked on abacus',
            'who was on abacus',
            'who worked on abacus',
            'sam mazzone',
        ])
    ) {
        return [
            'category' => 'abacus',
            'mode' => 'technical',
            'answer' => $answers['abacus'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'list every project',
        'list all mark’s projects',
        "list all mark's projects",
        'list all marks projects',
        'list out every project',
        'list all projects',
        'what projects has mark',
        'what projects did mark',
        'what has mark built',
        'what has mark worked on',
        'what mark has built',
        'what mark worked on',
        'software projects',
        'project portfolio',
        'project list',
        'all projects',
        'every project',
        'summarize mark’s technical work',
        "summarize mark's technical work",
        'summarize marks technical work',
        'technical work',
        'built in college',
        'build in college',
        'personal projects',
        'projects has he completed',
        'projects he completed',
        'projects mark has done',
        'projects mark has',
        'show me his projects',
        'give me his projects',
        'give me his project portfolio',
        'show me his software projects',
    ])) {
        return [
            'category' => 'projectsInventory',
            'mode' => 'technical',
            'answer' => $answers['projectsInventory'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'sam mazzone',
        'what was sam',
        'sam’s role',
        "sam's role",
        'sams role',
    ])) {
        return [
            'category' => 'collaboratorsSam',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsSam'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'abacus team',
        'on the abacus',
        'worked on abacus',
        'who was on abacus',
        'who worked on abacus',
    ])) {
        return [
            'category' => 'collaboratorsAbacus',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsAbacus'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'maat team',
        'ta-bot team',
        'tabot team',
        'worked on ta-bot',
        'worked on maat',
        'helped with maat',
        'helped with ta-bot',
        'who worked on ta-bot',
        'who helped with maat',
        'who worked on maat',
        'who was on ta-bot',
        'who was on maat',
    ])) {
        return [
            'category' => 'collaboratorsMaat',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsMaat'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'finch team',
        'on the finch',
        'on mark’s finch',
        "on mark's finch",
        'worked on finch',
        'who was on finch',
        'who worked on finch',
    ])) {
        return [
            'category' => 'collaboratorsFinch',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsFinch'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'allan akkathara',
        'basketball predictor team',
        'worked with mark on data mining',
        'who worked with mark on data mining',
        'data mining collaborators',
        'data mining team',
    ])) {
        return [
            'category' => 'collaboratorsDataMining',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsDataMining'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'armaan yaz',
        'worked with mark in operating systems',
        'who worked with mark in operating systems',
        'os collaborators',
        'operating systems collaborators',
        'who worked with mark on operating systems',
    ])) {
        return [
            'category' => 'collaboratorsOs',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsOs'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'hunter carlson',
        'worked with mark on the data science',
        'who worked with mark on the data science',
        'sleep analysis collaborators',
        'data science collaborators',
        'who worked with mark on sleep',
    ])) {
        return [
            'category' => 'collaboratorsSleep',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsSleep'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'project collaborators',
        'list mark’s project collaborators',
        "list mark's project collaborators",
        'list marks project collaborators',
        'who has mark worked with',
        'who has mark collaborated',
        'list collaborators',
    ])) {
        return [
            'category' => 'collaboratorsInventory',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsInventory'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'testimonial',
        'testimonials',
        'reviews',
        'recommendations',
        'recommendation',
        'what people say',
        'people say about',
        'others say',
        'people say',
        'show me mark’s testimonials',
        "show me mark's testimonials",
        'show me marks testimonials',
        'does mark have testimonial',
        'have testimonials',
        'recommended mark',
        'who has recommended',
        'who recommended',
        'coworkers say',
        'teammates say',
        'teammates or coworkers',
        'work ethic',
    ])) {
        return [
            'category' => 'testimonials',
            'mode' => 'recruiter',
            'answer' => $answers['testimonials'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'describe mark’s personality',
        "describe mark's personality",
        'describe marks personality',
        'mark’s personality',
        "mark's personality",
        'marks personality',
        'what kind of person is mark',
        'type of person is mark',
        'what type of person is mark trying',
        'person is mark trying to become',
    ])) {
        $answer = $answers['personality'];
        if (markai_mock_includes_any($text, ['trying to become', 'become'])) {
            $answer = $answers['becoming'];
        }

        return [
            'category' => 'personality',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'what does discipline mean',
        'discipline mean to mark',
        'what does consistency mean',
        'consistency mean to',
        'controlled strength',
        'how does mark handle setbacks',
        'handle setbacks',
    ])) {
        $answer = $answers['discipline'];
        if (markai_mock_includes_any($text, ['consistency'])) {
            $answer = $answers['consistency'];
        } elseif (markai_mock_includes_any($text, ['controlled strength'])) {
            $answer = $answers['controlledStrength'];
        } elseif (markai_mock_includes_any($text, ['setback'])) {
            $answer = $answers['setbacks'];
        }

        return [
            'category' => 'discipline',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'what does family mean',
        'family mean to his goals',
        'family mean to mark',
        'support his family',
        'supporting family',
    ])) {
        return [
            'category' => 'familyGoals',
            'mode' => 'casual',
            'answer' => $answers['familyGoals'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'what are mark’s goals',
        "what are mark's goals",
        'what are marks goals',
        'why does mark want a technology career',
        'technology career',
        'career goals',
        'what does success mean',
        'success mean to mark',
    ])) {
        $answer = $answers['careerGoals'];
        if (markai_mock_includes_any($text, ['success'])) {
            $answer = $answers['success'];
        }

        return [
            'category' => 'careerGoals',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'why does mark like photography',
        'photography mean',
        'what does travel mean',
        'travel mean to mark',
        'environment does mark want',
        'environment mark want',
        'kind of environment',
    ])) {
        $answer = $answers['photography'];
        if (markai_mock_includes_any($text, ['travel'])) {
            $answer = $answers['travel'];
        } elseif (markai_mock_includes_any($text, ['environment'])) {
            $answer = $answers['environment'];
        }

        return [
            'category' => 'photographyTravel',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'hobbies',
        'interests outside',
        'passionate about',
        'visual style',
        'why does mark like black',
        'why black',
    ])) {
        $answer = $answers['hobbies'];
        if (markai_mock_includes_any($text, ['passionate'])) {
            $answer = $answers['passion'];
        } elseif (markai_mock_includes_any($text, ['visual style', 'like black', 'why black'])) {
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
        'how can i contact',
        'how do i contact',
        'contact mark',
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
        'gym taught',
        'bodybuilding mean',
        'what does bodybuilding',
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
        'mythology figures',
        'figures connect',
    ])) {
        $answer = $answers['mythology'];
        if (markai_mock_includes_any($text, ['icarus'])) {
            $answer = $answers['mythologyIcarus'];
        } elseif (markai_mock_includes_any($text, ['achilles'])) {
            $answer = $answers['mythologyAchilles'];
        } elseif (markai_mock_includes_any($text, ['heracles', 'hercules'])) {
            $answer = $answers['mythologyHeracles'];
        }

        return [
            'category' => 'mythology',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
        'what does mark value',
        'what are mark’s values',
        "what are mark's values",
        'what are marks values',
        'what motivates',
        'long-term goals',
        'long term goals',
        'what does success',
        'type of person',
        'recruiters to remember',
    ])) {
        $answer = $answers['values'];
        if (markai_mock_includes_any($text, ['success'])) {
            $answer = $answers['success'];
        } elseif (markai_mock_includes_any($text, ['type of person', 'recruiters to remember'])) {
            $answer = $answers['personality'];
        }

        return [
            'category' => 'values',
            'mode' => 'casual',
            'answer' => $answer,
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
            return $pick(['navigation-portfolio-modes', 'project-markai']);

        case 'links':
            return $pick([
                'contact-preferred-methods',
                'navigation-portfolio-modes',
                'project-portfolio-platform',
            ]);

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

        case 'projectsInventory':
            return $pick([
                'projects-public-inventory',
            ]);

        case 'collaboratorsAbacus':
            return $pick([
                'collaborators-abacus-core-team',
                'collaborators-sam-mazzone-support',
            ]);

        case 'collaboratorsMaat':
            return $pick([
                'collaborators-maat-core-team',
                'collaborators-sam-mazzone-support',
            ]);

        case 'collaboratorsSam':
            return $pick([
                'collaborators-sam-mazzone-support',
                'collaborators-abacus-core-team',
            ]);

        case 'collaboratorsFinch':
            return $pick([
                'collaborators-finch-team',
            ]);

        case 'collaboratorsDataMining':
            return $pick([
                'collaborators-data-mining-team',
            ]);

        case 'collaboratorsOs':
            return $pick([
                'collaborators-operating-systems-team',
            ]);

        case 'collaboratorsSleep':
            return $pick([
                'collaborators-sleep-analysis-team',
            ]);

        case 'collaboratorsInventory':
            return $pick([
                'collaborators-public-inventory',
            ]);

        case 'personality':
        case 'discipline':
            return $pick([
                'personality-discipline-and-control',
                'personality-growth-and-values',
            ]);

        case 'familyGoals':
        case 'careerGoals':
            return $pick([
                'personality-career-purpose',
                'career-direction-first-full-time-tech-role',
            ]);

        case 'photographyTravel':
            return $pick([
                'personality-photography-travel-hobbies',
                'interest-travel-photography',
            ]);

        case 'hobbies':
            return $pick([
                'personality-photography-travel-hobbies',
                'interest-music-reading-hiking',
                'interest-fitness-bodybuilding',
            ]);

        case 'favoriteColor':
            return $pick([
                'personality-aesthetic-environment',
                'interest-creative-aesthetics-design',
            ]);

        case 'bodybuilding':
            return $pick([
                'personality-bodybuilding-depth',
                'interest-fitness-bodybuilding',
            ]);

        case 'mythology':
            return $pick([
                'personality-mythology-figures',
                'interest-greek-mythology-art',
            ]);

        case 'values':
            return $pick([
                'personality-growth-and-values',
                'personality-discipline-and-control',
                'interest-discipline-growth-controlled-strength',
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
            return $pick([
                'contact-preferred-methods',
                'navigation-portfolio-modes',
            ]);

        case 'testimonials':
            return $pick([
                'testimonials-public-overview',
                'testimonial-zack-kohlwey',
                'testimonial-farzeen-harunani',
                'testimonial-jorge-torres',
            ]);

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
        case 'projectsInventory':
            return ['link-portfolio-section'];
        case 'collaboratorsAbacus':
            return ['link-github-abacus'];
        case 'collaboratorsMaat':
            return ['link-github-maat'];
        case 'collaboratorsFinch':
            return ['link-github-finch'];
        case 'collaboratorsDataMining':
            return ['link-github-marquette-basketball-predictor'];
        case 'collaboratorsOs':
            return ['link-github-os-c-docs'];
        case 'collaboratorsSleep':
            return ['link-github-sleep-efficiency'];
        case 'careerGoals':
        case 'familyGoals':
            return ['link-resume-pdf', 'link-contact-section'];
        case 'photographyTravel':
            return ['link-vsco'];
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
        case 'testimonials':
            return ['link-testimonials-section'];
        case 'links':
            return [
                'link-portfolio-home',
                'link-contact-section',
                'link-github-profile',
                'link-linkedin',
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

    if (in_array($category, ['abacus', 'technologies', 'individualTeam', 'projectsInventory', 'collaboratorsAbacus', 'collaboratorsMaat', 'collaboratorsSam', 'collaboratorsFinch', 'collaboratorsDataMining', 'collaboratorsOs', 'collaboratorsSleep', 'collaboratorsInventory'], true)) {
        $contexts[] = 'projects';
    }
    if (in_array($category, ['contact', 'work', 'profile', 'links', 'careerGoals', 'familyGoals'], true)) {
        $contexts[] = 'contact';
    }
    if (in_array($category, ['status', 'profile', 'links', 'contact', 'testimonials', 'projectsInventory'], true)) {
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

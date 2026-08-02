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
require_once __DIR__ . '/MarkAiUserFacingStatus.php';
require_once __DIR__ . '/IntentUnderstanding.php';

/**
 * Normalize visitor-facing punctuation dashes to spaced ASCII hyphens.
 * Preserves ordinary hyphenated words and does not rewrite URLs.
 */
function markai_normalize_public_punctuation(string $answer): string
{
    $out = str_replace(
        ["\u{2014}", "\u{2013}"],
        ' - ',
        $answer
    );
    $out = preg_replace('/&mdash;/i', ' - ', $out) ?? $out;
    $out = preg_replace('/&ndash;/i', ' - ', $out) ?? $out;
    // Collapse only runs of spaces created around replacements (not indentation).
    $out = preg_replace('/[ ]{2,}/', ' ', $out) ?? $out;
    return $out;
}

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

        return MarkAiUserFacingStatus::attach([
            'success' => true,
            'answer' => markai_normalize_public_punctuation((string) $privacy['answer']),
            'answerStatus' => 'refused',
            'links' => $links,
            'mode' => $mode,
            'conversationId' => 'preview',
            'preview' => true,
            'error' => null,
        ]);
    }

    $classified = markai_mock_classify($validated['question'], $validated['history']);

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
    $deterministic = MarkAiUserFacingStatus::attach([
        'success' => true,
        'answer' => markai_normalize_public_punctuation((string) $classified['answer']),
        'answerStatus' => $classified['answerStatus'],
        'links' => $links,
        'mode' => $mode,
        'conversationId' => 'preview',
        'preview' => true,
        'error' => null,
    ]);

    // Privacy refusals never call the provider and never invent private facts.
    if (($classified['answerStatus'] ?? '') === 'refused' || ($classified['category'] ?? '') === 'sensitive') {
        return $deterministic;
    }

    $providerUsable = markai_provider_configuration_is_usable($configuration);
    $shouldLimit = $usageLimiter instanceof FileUsageLimiter
        && $usageLimiter->isEnabled()
        && $providerUsable
        && is_string($anonymousSessionId)
        && $anonymousSessionId !== '';

    if ($shouldLimit) {
        $permit = $usageLimiter->acquireProviderPermit($anonymousSessionId);
        if (!$permit->isAllowed()) {
            $errorCode = MarkAiUserFacingStatus::fromUsageReason($permit->getReason());
            $hasUsefulFallback = trim((string) ($deterministic['answer'] ?? '')) !== ''
                && ($deterministic['answerStatus'] ?? '') !== 'error';
            $payload = $deterministic;
            $payload['answerStatus'] = $permit->getAnswerStatus();

            return MarkAiUserFacingStatus::attach(
                $payload,
                $errorCode,
                $permit->getRetryAfterSeconds(),
                $hasUsefulFallback,
                !$hasUsefulFallback
            );
        }

        try {
            $generated = $service->tryProviderAnswer($messages, $configuration, $transport);
        } finally {
            $usageLimiter->releaseProviderPermit($anonymousSessionId);
        }
    } else {
        $generated = $service->tryProviderAnswer($messages, $configuration, $transport);
    }

    if (($generated['accepted'] ?? false) === true) {
        return MarkAiUserFacingStatus::attach([
            'success' => true,
            'answer' => markai_normalize_public_punctuation((string) $generated['answer']),
            'answerStatus' => 'answered',
            'links' => $links,
            'mode' => $mode,
            'conversationId' => 'preview',
            'preview' => true,
            'error' => null,
        ]);
    }

    $providerErrorCode = is_string($generated['errorCode'] ?? null)
        ? (string) $generated['errorCode']
        : MarkAiUserFacingStatus::CODE_PROVIDER_UNAVAILABLE;
    $hasUsefulFallback = trim((string) ($deterministic['answer'] ?? '')) !== ''
        && ($deterministic['answerStatus'] ?? '') !== 'error';

    // Provider disabled with no usable config is the normal local/preview path:
    // return deterministic answers without an error note.
    if (
        $providerErrorCode === MarkAiUserFacingStatus::CODE_PROVIDER_DISABLED
        && !$providerUsable
    ) {
        return $deterministic;
    }

    if ($hasUsefulFallback) {
        return MarkAiUserFacingStatus::attach(
            $deterministic,
            $providerErrorCode,
            null,
            true,
            false
        );
    }

    return MarkAiUserFacingStatus::attach(
        $deterministic,
        $providerErrorCode,
        null,
        false,
        true
    );
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
* @param list<array{role: string, content: string}> $history
* @return array{category: string, mode: string, answer: string, answerStatus: string}
*/
function markai_mock_classify(string $question, array $history = []): array
{
    $answers = [
        'profile' => 'Mark is from Chicago and graduated from Marquette University with a Bachelor of Science in Computer Science. He is seeking his first full-time technology role. His work includes a personal portfolio platform, senior design projects, systems coursework, robotics, data projects, and Unity projects.',
        'abacus' => 'Abacus was a team senior-design project used for the Wisconsin-Dairyland Programming Competition. Mark’s verified work included Eagle messaging APIs, role-aware chat and inbox behavior, competition workflows, routing and persistence, frontend/backend integration, submission-system support, testing, and UI debugging. The April 15, 2026 event used the platform to support approximately 200 - 300 high-school students, teachers, judges, and administrators and ran without major server crashes, platform failures, critical bugs, or major lag.',
        'technologies' => 'Mark has worked with technologies including JavaScript, TypeScript, Python, Java, R, SQL, C, C#, PHP, React, Vite, Flask, MySQL, Docker, Socket.IO, Linux/WSL, Unity, Figma, Cloudflare Workers AI, and REST-style APIs through coursework and projects.',
        'individualTeam' => 'Mark built his portfolio platform as an individual project. Abacus, MAAT, Finch, Sleep Efficiency Analysis, and the basketball predictor were team or coursework projects, so their team context should remain clear.',
        'work' => 'Mark’s public experience includes AV Technician, Information Desk Specialist Manager, Assistant Building Manager, Hollister retail work, and Panda Express Chef/Person in Charge, along with approved campus leadership experience.',
        'contact' => 'The portfolio Contact page is the preferred method. LinkedIn, GitHub, the résumé, and VSCO may also be relevant depending on what a visitor is looking for.',
        'links' => 'Mark’s public portfolio links include his homepage, project contact section, GitHub, LinkedIn, résumé, and VSCO profile.',
        'sensitive' => 'MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.',
        'status' => 'MarkAI is live on markyoingco.com and actively maintained. It answers from Mark’s approved portfolio information using a PHP backend and Cloudflare Workers AI, with response validation, deterministic fallback answers, privacy protections, and anonymous usage limits. Future updates may include bug fixes, testing, design refinement, and approved knowledge expansion.',
        'favoriteColor' => 'Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he prefers across his portfolio and personal branding, along with clean, organized environments rather than loud or decorative presentation.',
        'bodybuilding' => 'Mark has trained consistently for nearly six years. He began lifting because he wanted change and to become a better version of himself. After about a year, he pursued powerlifting for a more structured challenge and won his first meet. He later shifted his primary focus to bodybuilding, where he became more interested in aesthetics, symmetry, control, patience, and consistent long-term progress. Fitness is one of his strongest personal interests and a source of discipline he applies outside the gym.',
        'powerlifting' => 'After about a year of lifting, Mark moved into powerlifting because he wanted a more structured challenge and something greater to work toward. He competed in and won his first powerlifting meet, including through Marquette Powerlifting Club support. He later chose bodybuilding as his primary focus. MarkAI does not publish meet names, dates, weight classes, competition totals, or rankings.',
        'liftingNumbers' => 'Mark benches over 315 pounds, squats over 450 pounds, and deadlifts over 550 pounds. MarkAI does not publish competition totals, weight classes, rankings, body weight, diet details, or medical information.',
        'fitnessTaught' => 'Fitness has become one of Mark’s strongest personal interests and a source of discipline that he applies outside the gym. Training reinforces patience, consistency, structure, and long-term progress that also support how he approaches projects and professional growth.',
        'bodybuildingMeaning' => 'Mark later chose bodybuilding as his primary focus because it better connects with his interest in aesthetics, structure, symmetry, control, patience, consistency, and long-term physical development. It remains a major public interest outside technology rather than professional coaching or medical expertise.',
        'mythology' => 'Mark connects with Icarus, Achilles, and Heracles through themes such as ambition, intensity, discipline, consequence, and endurance. Greek mythology is a creative and symbolic interest connected to art and classical imagery, not a religion or a psychological profile.',
        'mythologyIcarus' => 'For Mark, Icarus connects to ambition, risk, and the consequences of losing control. It is one symbolic interest among several mythological figures, not a permanent identity.',
        'mythologyAchilles' => 'For Mark, Achilles connects to intensity, strength, drive, and resilience. It represents one symbolic theme among several, not a permanent favorite.',
        'mythologyHeracles' => 'For Mark, Heracles connects to endurance, discipline, repeated effort, and growth through challenging work. It is symbolic interest, not religion.',
        'values' => 'Mark values discipline, consistency, responsibility, ownership, ambition, resilience, patience, humility, learning, usefulness, creativity, personal growth, professional independence, controlled confidence, and direct communication. He wants progress to come from repeatable actions rather than temporary intensity.',
        'personality' => 'Mark is a recent Computer Science graduate building toward a stable technology career. His work includes a personal portfolio platform, senior-design projects, systems coursework, robotics, data projects, and Unity projects. He works in a practical, collaborative, growth-oriented way. Outside technology, he values quiet confidence, disciplined ambition, creativity, and controlled strength.',
        'discipline' => 'Mark values consistency because long-term progress depends on repeatable actions. He applies that mindset to training, software projects, and professional growth rather than relying only on short periods of motivation.',
        'consistency' => 'Mark believes consistency is more dependable than temporary intensity. He values doing the work even when motivation is absent and sees repeated controlled effort as the path to progress.',
        'controlledStrength' => 'To Mark, controlled strength means having ambition and intensity without letting them control the decision. Discipline gives that energy direction through patience, consistency, and deliberate responses.',
        'setbacks' => 'Mark treats challenges as opportunities to improve future decisions. He values learning, adjusting, and continuing to make steady progress in his work and training.',
        'builderIdentity' => 'Mark is motivated by turning ideas into working results. He enjoys combining creativity, organization, and practical problem-solving to build something people can actually use.',
        'quietAmbition' => 'Mark’s ambition is quiet. He prefers building seriously and letting finished results carry more weight than constant announcements or loud self-promotion.',
        'earnedConfidence' => 'Mark wants confidence to come from preparation, follow-through, experience, and continued learning. Compliments help, but demonstrated results matter. That does not mean he never questions himself.',
        'drives' => 'Mark is driven by meaningful work, professional growth, independence, discipline, creativity, and the satisfaction of turning ideas into usable results.',
        'vibe' => 'Mark’s public style combines quiet confidence, disciplined ambition, creativity, and controlled strength. He prefers clean systems, cinematic presentation, direct communication, and results that show the work without exaggerated claims.',
        'earnedLife' => 'To Mark, an earned life means building stability, independence, responsibility, meaningful work, confidence, and structured freedom he can take genuine pride in.',
        'freedomStructure' => 'For Mark, freedom is not the absence of responsibility. He wants greater independence inside a structure that still protects work, fitness, learning, creativity, and travel.',
        'leadershipBalance' => 'Mark is willing to lead when he understands the work and can support the team, and he also values knowing when to listen, learn, or let someone else lead. He prefers preparation and usefulness over title alone.',
        'learningHumility' => 'Mark treats not knowing something as part of learning. He values clear questions, documentation, repetition, debugging, feedback, and working with other people rather than pretending to understand everything.',
        'cityVision' => 'Mark is interested in modern cities, architecture, technology, opportunity, and cinematic environments. Cities represent ambition, opportunity, and professional progress. His exact long-term location can still evolve.',
        'perspectiveExploration' => 'Mark values new perspectives as much as new places. Travel, museums, photography, reading, films, music, hiking, and meeting different people help him stay ambitious while remaining grounded and open to learning.',
        'remembered' => 'Mark wants to be remembered for what he built, how he worked, and what he followed through on. Visibility without substance is not the goal.',
        'becoming' => 'Mark sees himself as still evolving. The direction is clear - more discipline, responsibility, confidence, skill, and independence - even if the exact final version continues to change.',
        'futureVision' => 'Mark wants a growing technology career, an active and disciplined lifestyle, continued learning, creative interests, and greater independence.',
        'hobbies' => 'Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.',
        'cooking' => 'Cooking is not part of MarkAI’s current approved public hobby list. You can ask about approved interests such as fitness, travel, photography, music, hiking, museums, and mythology.',
        'dog' => 'Mark has a dog named Kobe. He enjoys spending time with him and sometimes affectionately calls Kobe his son. That nickname is for his dog only and is not a human-child or family claim. MarkAI does not share identifying pet details, age, or private schedules.',
        'friendsFamily' => 'MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.',
        'museums' => 'Mark enjoys museums, especially where they connect to photography, classical art, architecture, statues, history, and visual storytelling.',
        'passion' => 'Mark is passionate about building useful software and about bodybuilding outside technology. In both areas he focuses on disciplined practice, steady improvement, and work he can stand behind.',
        'favoriteArtists' => 'Mark’s favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR. His taste leans toward melodic rap, R&B, atmospheric production, and music that works for both training and reflection.',
        'favoriteArtistsWorkout' => 'Mark’s broader music interests often fit training and personal reflection. His favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR, spanning energetic tracks and darker, atmospheric moods.',
        'favoriteFilms' => 'MarkAI does not currently publish a verified list of Mark’s favorite movie titles. You can ask about approved public interests such as music, fitness, travel, photography, hiking, reading, museums, mythology, and cinematic visual design.',
        'favoriteFilmsMarvelDc' => 'MarkAI does not currently publish verified favorite movie or franchise rankings. Approved public interests include music, fitness, travel, photography, and cinematic visual design.',
        'favoriteFilmsCreed' => 'MarkAI does not currently publish verified favorite movie titles, including specific film names.',
        'favoriteFilmsBatman' => 'MarkAI does not currently publish verified favorite movie titles, including specific film names.',
        'favoriteShow' => 'MarkAI does not currently publish a verified list of Mark’s favorite shows or movie titles.',
        'careerGoals' => 'Mark is working toward a stable technology career built on continued technical growth, meaningful work, stronger software projects, greater independence, and continued discipline and creativity. He remains open to software development, full-stack applications, developer tools, data-oriented systems, technical support, and related entry-level technology paths.',
        'success' => 'For Mark, success means career stability, professional growth, independence, meaningful work, physical discipline, and pride in earned progress. A title alone is not enough; he wants to know he built something useful and followed through.',
        'overview' => "Mark is a recent Computer Science graduate from Marquette University, from Chicago, seeking an entry-level technology role. His public work includes a personal portfolio platform with MarkAI, senior-design projects such as Abacus and TA-Bot / MAAT, Finch, systems coursework, robotics, data projects, and Unity games. He works in a practical, collaborative, growth-oriented way with quiet confidence, disciplined ambition, creativity, and controlled strength. Career interests include software development, full-stack applications, developer tools, data-oriented systems, and technical support or systems roles. Outside technology, approved interests include fitness and bodybuilding, travel and photography, hiking, reading, music, cities and architecture, museums, Greek mythology, cinematic visual design, and his dog Kobe. His favorite color is black.",
        'workLocation' => 'Mark is seeking entry-level technology roles and is drawn to city environments that support ambition, architecture, technology, and professional progress. He is from Chicago and remains open to Chicago opportunities and suitable roles as his search evolves. MarkAI does not share a precise current residence or private move logistics.',
        'travelAndWork' => 'Public travel places shown in Mark’s portfolio include Hawaii, Las Vegas, Chicago, California, Lake Louise in Canada, Manila in the Philippines, London, the Amalfi Coast in Italy, Rome in Italy, Milwaukee, and Nashville. For work, he is seeking entry-level technology roles, is drawn to city environments, is from Chicago, and remains open to Chicago opportunities and suitable roles. MarkAI does not share a precise current residence.',
        'funFacts' => "Here are several approved fun facts about Mark:\n\n- Bodybuilding is his strongest interest outside technology.\n- Favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR.\n- He likes photography and travel, plus museums and hiking.\n- He is interested in Greek mythology and classical statues and art.\n- His favorite color is black, and he prefers a dark cinematic visual style.\n- Outside work he also enjoys reading, music, and spending time with his dog Kobe.",
        'capabilities' => "You can ask about Mark’s projects, skills, education, experience, collaborators, goals, personality, hobbies, music, fitness, travel, testimonials, résumé, or public links.\n\nExamples:\n- “What did Mark build for Abacus?”\n- “What are his strongest skills?”\n- “What are Mark’s goals?”\n- “What music does he like?”\n- “Who did he work with on MAAT?”\n- “Can I see the Finch repository?”\n- “What does Mark do outside technology?”",
        'familyGoals' => 'MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.',
        'photography' => 'Mark uses photography to preserve feelings, places, views, memories, and important moments. He prefers cinematic, personal, dark, low-exposure, story-driven images of cities, architecture, landscapes, museums, and travel experiences.',
        'travel' => 'Travel helps Mark experience different environments, people, cultures, architecture, and ways of living. It gives him new perspectives and motivates greater freedom and independence. Cities connect to ambition and energy, coastal environments to peace, and mountains and hiking to effort that earns the view.',
        'travelPlaces' => 'Places shown in Mark’s public portfolio travel content include Hawaii, Las Vegas, Chicago, California, Lake Louise in Canada, Manila in the Philippines, London, the Amalfi Coast in Italy, Rome in Italy, Milwaukee, and Nashville. The Travel section and VSCO gallery are the best places to view related photography.',
        'environment' => 'Mark prefers clean, organized, minimal environments with a cinematic mix of classical architecture, statues, modern technology, city lights, rooftops, and controlled darkness. He likes a modern technical-professional atmosphere and dislikes corny or overly decorative presentation.',
        'collaboratorsAbacus' => 'Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.',
        'collaboratorsMaat' => 'Mark worked on TA-Bot / MAAT with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. The core student team was Mark Yoingco, Justin Hoffman, Jacob DunRoseman, and Angel Mora.',
        'collaboratorsSam' => 'MarkAI provides only Mark’s approved public project and collaborator information.',
        'collaboratorsFinch' => 'The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.',
        'collaboratorsDataMining' => 'The Data Mining Game Predictor team included Mark Yoingco and Allan Akkathara.',
        'collaboratorsOs' => 'For Operating Systems C Projects, the approved collaborator names are Mark Yoingco and Armaan Yaz. Private or shared course repositories remain unpublished.',
        'collaboratorsSleep' => 'For the Sleep Efficiency Analysis data-science project, the approved collaborator names are Mark Yoingco and Hunter Carlson.',
        'fromChicago' => 'Mark is from Chicago.',
        'locationPrivacy' => 'MarkAI does not provide precise or current location information. Mark’s approved public background states that he is from Chicago.',
        'collaboratorsInventory' => "Mark’s approved project collaborators, by project:\n\n- Abacus: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- TA-Bot / MAAT: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- Finch: Mark Yoingco, Julianne Browne, Luis Serrano, Xavier Barth\n- Data Mining: Mark Yoingco, Allan Akkathara\n- Operating Systems: Mark Yoingco, Armaan Yaz\n- Sleep Analysis: Mark Yoingco, Hunter Carlson",
        'collaboratorsJustin' => 'Justin Hoffman was Project Manager on Mark’s Abacus senior-design team and was also part of the core student team for TA-Bot / MAAT with Mark Yoingco, Jacob DunRoseman, and Angel Mora.',
        'collaboratorsAngel' => 'Angel Mora was a Project Manager on Mark’s Abacus senior-design team and was also part of the core student team for TA-Bot / MAAT with Mark Yoingco, Justin Hoffman, and Jacob DunRoseman.',
        'collaboratorsJacob' => 'Jacob DunRoseman served as Repo Manager on the senior-design team that worked on Abacus and TA-Bot / MAAT with Mark Yoingco, Justin Hoffman, and Angel Mora.',
        'collaboratorsLuis' => 'Luis Serrano was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Julianne Browne, and Xavier Barth.',
        'collaboratorsXavier' => 'Xavier Barth was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Julianne Browne, and Luis Serrano.',
        'collaboratorsJulianne' => 'Julianne Browne was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Luis Serrano, and Xavier Barth.',
        'collaboratorsAllan' => 'Allan Akkathara worked with Mark on the Data Mining Game Predictor (Marquette Basketball Predictor).',
        'seniorDesignTeam' => 'Mark worked on Abacus and TA-Bot / MAAT with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The projects were team senior-design efforts, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On Abacus, Mark Yoingco was Document Manager, Justin Hoffman was Project Manager, Jacob DunRoseman was Repo Manager, and Angel Mora was Project Manager.',
        'testimonials' => "Mark’s portfolio Testimonials section includes attributed recommendations from professors, supervisors, coworkers, and collaborators.\n\nAcross those testimonials, recurring themes include initiative, composure under pressure, thoroughness, ownership, reliability, integrity, ambition, leadership by example, and strong work ethic.\n\nRepresentative perspectives, in portfolio order, include:\n- Farzeen Harunani — Professor of Computer Science, Marquette University — notes Mark’s initiative, composure, dedication, and eagerness to learn.\n- Jorge Torres — Staff Validation Engineer, Performance Validation — emphasizes Mark’s thoroughness, curiosity, reliability, and ownership.\n- Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University — highlights Mark’s dedication, work ethic, integrity, and leadership by example.\n\nThese are summaries of attributed opinions, not direct quotations. Full testimonials are available in the portfolio Testimonials section.",
        'testimonialsList' => "Here are the people currently featured in Mark’s Testimonials section:\n\n- Farzeen Harunani — Professor of Computer Science, Marquette University\n  Professional connection: Testimonial contributor.\n\n- Jorge Torres — Staff Validation Engineer, Performance Validation\n  Professional connection: Former Marquette University coworker and fellow student manager.\n\n- Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University\n  Professional connection: Mark’s supervisor at Marquette University, as stated in his attributed testimonial.\n\n- Nathan Garcia — IT Supply Chain Intern, Zebra Technologies\n  Professional connection: Longtime friend and former Panda Express coworker.\n\n- Jarenz Masiclat — Investment Associate, Northern Trust\n  Professional connection: Longtime friend, fraternity mentor, and Filipino Student Organization mentor.\n\n- Elizabeth Anderson — Data Analyst Intern, ComEd\n  Professional connection: Testimonial contributor.\n\n- Maxwell Zeisler — Audit Intern, Advisent, LLC\n  Professional connection: Testimonial contributor.\n\n- Andrew Wochner — Cardiac ICU Registered Nurse, Ascension Columbia St. Mary's Hospital\n  Professional connection: College friend from Marquette University.\n\nFull attributed testimonials are available in the portfolio’s Testimonials section.",
        'testimonialProfessors' => "From the published Testimonials section, the professor testimonial currently featured is:\n\n- Farzeen Harunani — Professor of Computer Science, Marquette University\n  Professional connection: Testimonial contributor.\n\nFull attributed testimonials are available in the portfolio’s Testimonials section.",
        'testimonialCoworkers' => "From the published Testimonials section, contributors with an explicit coworker connection are:\n\n- Jorge Torres — Staff Validation Engineer, Performance Validation\n  Professional connection: Former Marquette University coworker and fellow student manager.\n\n- Nathan Garcia — IT Supply Chain Intern, Zebra Technologies\n  Professional connection: Longtime friend and former Panda Express coworker.\n\nFull attributed testimonials are available in the portfolio’s Testimonials section.",
        'testimonialZack' => "Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University.\n\nSummary of his attributed testimonial: Zack writes that he supervised Mark for about two and a half years at Marquette University, hired Mark as a University Information Specialist, later promoted him to Student Manager, and emphasizes Mark’s dedication, work ethic, integrity, ambition, relationship-building, and leadership by example. This is a summary, not a direct quotation.",
        'testimonialZackQuote' => "Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University — wrote:\n\nI have known Mark for two and a half years, and I was his supervisor at Marquette University. I have had the opportunity to observe Mark’s dedication, work ethic, and values driven decision making firsthand. He respects all individuals and has the ability to form true relationships and friendships with a wide range of people and thinks of the staff as a team.\n\nI hired Mark as a University Information Specialist at the student union’s Information Desk. Not even a year into working, I promoted Mark to Student Manager. His integrity and ambition stood out to me, and that is what ultimately led me to promote him. He understood how his choices and decisions at the desk made an impact on others as this role was the initial interaction that someone had with the university as they walked into the building or called. Mark definitely embraced challenges as learning moments for personal growth, and he exceled at being a role model and leader by example.",
        'testimonialFarzeen' => "Farzeen Harunani — Professor of Computer Science, Marquette University.\n\nSummary of her attributed testimonial: Farzeen describes Mark’s initiative when seeking research and career advice, composure under pressure, dedication, and eagerness to learn. Her published title is Professor of Computer Science, Marquette University, and her attributed testimonial states that Mark took three classes with her. This is a summary, not a direct quotation.",
        'testimonialFarzeenQuote' => "Farzeen Harunani — Professor of Computer Science, Marquette University — wrote:\n\nThe first time I met Mark Yoingco one-on-one was when he came into my office seeking research and career advice. It was the second week of his senior year, and he was enrolled in the capstone class with me. He wanted to know which year-long project would be the most beneficial to him, longterm. This, in itself, showed a rare level of initiative.\n\nHe took three classes with me, and impressed me with his unflappable demeanor and dedication to getting the job done. No matter how tight the deadlines might be, Mark does not ever let on if he is stressed. He is eager to learn, to improve, and to commit to every endeavor with a smile.",
        'testimonialJorge' => "Jorge Torres — Staff Validation Engineer, Performance Validation.\n\nCanonical relationship text from the portfolio: Former Marquette University coworker and fellow student manager.\n\nSummary of his attributed testimonial: Jorge emphasizes Mark’s thoroughness, curiosity, reliability, ownership, and work ethic. This is a summary, not a direct quotation.",
        'testimonialJorgeQuote' => "Jorge Torres — Staff Validation Engineer, Performance Validation — wrote:\n\nI've known Mark since my junior year of college, and in that time I've come to know him as someone who takes the time to fully understand every task before diving in, no matter how big or small. He never settles for surface-level work - whether he's reviewing code and software comments or testing and documenting a project's performance, he holds himself to a high standard of accuracy and thoroughness.\n\nMark is one of the hardest-working individuals I've had the pleasure of working with. He approaches every project with genuine curiosity, taking the time to ask the right questions and dig into the \"why\" behind a problem rather than just executing tasks on the surface. That mindset consistently translates into higher-quality, more reliable work.\n\nI had the opportunity to work alongside Mark as a Student Manager, which gave me a front-row seat to his work ethic and attention to detail. He was consistently reliable, communicated clearly about progress and roadblocks, and took genuine ownership of the quality of his output. Watching him grow and take on more responsibility over that time was genuinely impressive.\n\nProfessionally, Mark is an outstanding individual who would be an asset to any team he's a part of, thanks to his incredibly diverse skill set and unwavering dedication to doing things right.",
        'testimonialsAllQuotes' => "Full attributed quotations from Mark’s published Testimonials section, in portfolio order:\n\nFarzeen Harunani — Professor of Computer Science, Marquette University — wrote:\n\nThe first time I met Mark Yoingco one-on-one was when he came into my office seeking research and career advice. It was the second week of his senior year, and he was enrolled in the capstone class with me. He wanted to know which year-long project would be the most beneficial to him, longterm. This, in itself, showed a rare level of initiative.\n\nHe took three classes with me, and impressed me with his unflappable demeanor and dedication to getting the job done. No matter how tight the deadlines might be, Mark does not ever let on if he is stressed. He is eager to learn, to improve, and to commit to every endeavor with a smile.\n\n---\n\nJorge Torres — Staff Validation Engineer, Performance Validation — wrote:\n\nI've known Mark since my junior year of college, and in that time I've come to know him as someone who takes the time to fully understand every task before diving in, no matter how big or small. He never settles for surface-level work - whether he's reviewing code and software comments or testing and documenting a project's performance, he holds himself to a high standard of accuracy and thoroughness.\n\nMark is one of the hardest-working individuals I've had the pleasure of working with. He approaches every project with genuine curiosity, taking the time to ask the right questions and dig into the \"why\" behind a problem rather than just executing tasks on the surface. That mindset consistently translates into higher-quality, more reliable work.\n\nI had the opportunity to work alongside Mark as a Student Manager, which gave me a front-row seat to his work ethic and attention to detail. He was consistently reliable, communicated clearly about progress and roadblocks, and took genuine ownership of the quality of his output. Watching him grow and take on more responsibility over that time was genuinely impressive.\n\nProfessionally, Mark is an outstanding individual who would be an asset to any team he's a part of, thanks to his incredibly diverse skill set and unwavering dedication to doing things right.\n\n---\n\nZack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University — wrote:\n\nI have known Mark for two and a half years, and I was his supervisor at Marquette University. I have had the opportunity to observe Mark’s dedication, work ethic, and values driven decision making firsthand. He respects all individuals and has the ability to form true relationships and friendships with a wide range of people and thinks of the staff as a team.\n\nI hired Mark as a University Information Specialist at the student union’s Information Desk. Not even a year into working, I promoted Mark to Student Manager. His integrity and ambition stood out to me, and that is what ultimately led me to promote him. He understood how his choices and decisions at the desk made an impact on others as this role was the initial interaction that someone had with the university as they walked into the building or called. Mark definitely embraced challenges as learning moments for personal growth, and he exceled at being a role model and leader by example.\n\n---\n\nNathan Garcia — IT Supply Chain Intern, Zebra Technologies — wrote:\n\nI have known Mark Yoingco for about eight years after meeting him through high school and mutual friends. What has kept us close is our similar outlook on life, especially our shared belief in hard work, setting goals, and constantly working toward success. Mark is one of the most determined, focused, and loyal people I know. No matter the situation or circumstances, he is always willing to help, and his loyalty is the quality I admire most about him.\n\nMark has also shown me firsthand that hard work pays off. Throughout the years, he has competed in basketball, track, powerlifting, and bodybuilding, and he has approached each sport with the same discipline and commitment. As someone who is currently pursuing bodybuilding, he continues to push me through his advice, encouragement, and willingness to lend a helping hand. His ability to put his head down, stay focused, and grind toward his goals is what separates him from many others.\n\nProfessionally, Mark has developed a diverse skill set through his computer science projects and classwork. Since I work in IT, I understand the effort required in the technology field and have a great deal of respect for his work, just as he respects mine. I also worked with Mark at Panda Express in high school, where I saw his leadership skills, professionalism, and eagerness to learn and grow in his role. I have recommended him to former managers because I trust his work ethic and know the type of person he is. Mark would be a valuable addition to any team because he is dependable, hardworking, and always committed to improving.\n\n---\n\nJarenz Masiclat — Investment Associate, Northern Trust — wrote:\n\nI have known Mark Yoingco since he was a freshman in college while I was a sophomore, and over the years we have built a close friendship. Mark is my fraternity little as well as my Filipino Student Organization little, and watching him grow into the person he is today has been something I have genuinely admired. From the beginning, what stood out most about Mark was his drive to continuously improve himself. Whether it was in the classroom, the gym, or through his relationships with others, he has always approached every challenge with discipline, humility, and a strong work ethic.\n\nPersonally, Mark has pushed me to become a better version of myself through lifting, his friendship, and the example he sets every day. His dedication to fitness is inspiring, but what impresses me even more is how that same level of commitment carries over into his academics, personal hobbies, leadership, and the way he invests in the people around him. He is someone who consistently follows through on his goals and encourages others to do the same.\n\nOne of Mark's greatest strengths is his personality. His presence is felt in every room he enters, and his charisma has a unique ability to bring people together and positively influence those around him. He is approachable, genuine, and naturally builds meaningful relationships. At the same time, he possesses analytical and critical thinking skills that are well beyond his years. Whether we are discussing complex topics or collaborating on projects, I have always been impressed by his ability to think through problems thoughtfully and arrive at practical, well-reasoned solutions.\n\nAs an Investment Associate at Northern Trust, I work in an environment where analytical thinking, professionalism, accountability, and continuous learning are essential. These are many of the same qualities I see in Mark. He approaches challenges with curiosity, remains composed under pressure, and is always looking for opportunities to grow both personally and professionally. His willingness to accept feedback and constantly improve makes him someone who will continue to develop into an exceptional leader.\n\nAbove all, Mark is someone I trust completely. He is dependable, hardworking, and genuinely cares about the success of the people around him. His integrity, leadership potential, and relentless work ethic make him an outstanding individual and someone I have no doubt will make a meaningful impact wherever his career takes him. I am confident that any organization would be fortunate to have Mark as part of its team.\n\n---\n\nElizabeth Anderson — Data Analyst Intern, ComEd — wrote:\n\nI've known Mark for about five years, and there are a few of his qualities that I've found admirable and that have only become stronger as we've grown up. The first is discipline, with his commitment to strength training reflecting his conditioning and his ability to handle challenges through consistency, which I believe can be applied beyond the gym. Secondly, his leadership and mentorship have shaped aspects of my mindset, demonstrating the mental resilience and strength of character he brings to both his work and his everyday life. Lastly, his positive energy and genuine enthusiasm naturally inspire those around him, and I am confident they will continue to serve him well wherever he decides to go. I strongly believe that with his drive and work ethic, he will thrive anywhere he goes, and I am so proud to call him my friend.\n\n---\n\nMaxwell Zeisler — Audit Intern, Advisent, LLC — wrote:\n\nMark is one of my best friends who I've known since our days of middle school basketball. He boasts a plethora of outstanding qualities that have stood out since our first practice together. He is one of the most dedicated and reliable individuals I know, applying no less than his absolute best to any team he is apart of. His perseverance and professionalism through school, life challenges, and the workplace proceeds his reputation as a respectful, hard working, and disciplined person with extensive work and projects to show for it. He's truly a valuable asset to have as a part of any team, and an even better friend.\n\n---\n\nAndrew Wochner — Cardiac ICU Registered Nurse, Ascension Columbia St. Mary's Hospital — wrote:\n\nMark is one of the most down to earth people I know. My life drastically changed when I met Mark at Marquette University. Even though he is younger than me, he has the maturity level of a grown adult and has taught me so many important life lessons. I’ll never forget about all the talks we had in college about life experiences, moving up in the world, and being on top of ourselves. His discipline and work ethic is extremely admirable and he will never back down from a challenge. I know his quality traits will take him far in life & I wouldn’t be where I am today without him\n\nFull attributed testimonials are also available in the portfolio’s Testimonials section.",
        'projectsInventory' => "Mark’s approved public software projects include:\n\n- Portfolio & AI: Personal Portfolio Platform; MarkAI\n- Capstones: Abacus; TA-Bot / MAAT\n- Systems: Operating Systems C Projects\n- Robotics & Software Design: Finch Robot Web Controller\n- Games: Space SHMUP; Apple Picker; Mission Demolition\n- Data: Sleep Efficiency Analysis; Marquette Basketball Predictor\n\nThe portfolio platform and MarkAI are solo personal work. Abacus, MAAT, Finch, and the data projects were team or coursework collaborations.",
        'maat' => 'TA-Bot / MAAT was a team senior-design chatbot and automated assessment platform. Mark’s verified work included rubric grading features, score recalculation, observed error tables, plagiarism-detection support, backend API integration, database checks, Docker Compose testing, debugging, and UI cleanup.',
        'finch' => 'The Finch Robot Web Controller was a team robotics project for controlling BirdBrain Finch 2.0 robots through browser pages, room codes, multiplayer lobbies, and real-time controller screens. Mark contributed heavily to frontend controller screens, UI planning, setup documentation, and Flask/Socket.IO interaction flow.',
        'portfolioPlatform' => 'The Personal Portfolio Platform is Mark’s individual project: a multi-mode React/Vite portfolio with Webpage, Terminal, and MarkAI experiences, shared project content, themes, and a PHP/MySQL contact backend.',
        'spaceShmup' => 'Space SHMUP is Mark’s Unity 2D arcade shooter with player movement, projectile firing, enemy behavior, collision handling, scoring, and game-state logic.',
        'applePicker' => 'Apple Picker is Mark’s Unity arcade-style game with falling objects, basket controls, score tracking, high-score persistence, lives, collision detection, and scene restart logic.',
        'missionDemolition' => 'Mission Demolition is Mark’s Unity physics-based projectile game focused on aiming, launching, collisions, structural targets, and scene-based gameplay logic.',
        'osC' => 'Operating Systems C Projects covers Mark’s public documentation for lower-level C, UNIX/Linux, process control, memory, and file-system coursework. Private or shared course repositories are not publicly linked.',
        'sleep' => 'Sleep Efficiency Analysis is a team data-science project analyzing sleep-efficiency data with cleaning, visualization, VIF checks, and linear regression related to sleep quality.',
        'basketball' => 'The Marquette Basketball Predictor is a team data-mining project using game data, Random Forest feature importance, and Logistic Regression to predict wins and losses.',
        'noPublicRepo' => 'That project does not currently have an approved public repository link, but you can view it in Mark’s Portfolio section.',
        'fmsc' => 'Mark has public volunteer service experience with Feed My Starving Children, shown in the Portfolio Service section. A public FMSC location page is available through the safe link below. MarkAI does not share private organization, member, schedule, or internal details.',
        'merchSigma' => 'Sigma Chi merchandise design is shown in Mark’s Portfolio Merch section. It does not have a separate public software repository; the Portfolio section is the approved place to view it.',
        'resume' => 'Mark’s public résumé is available as a PDF through the safe link below.',
        'linkedinOnly' => 'Mark’s public LinkedIn profile is available through the safe link below.',
        'githubOnly' => 'Mark’s public GitHub profile is available through the safe link below. If you have a specific project in mind, ask for that repository by name.',
        'repoContext' => 'You can view the project’s public repository below.',
        'fallback' => 'I may be missing the intended topic. You can ask about Mark’s projects, skills, experience, goals, interests, collaborators, résumé, or public links.',
    ];

    $text = markai_intent_normalize($question);
    $text = markai_intent_apply_typos($text);
    $text = str_replace(
        [
            'there relationship',
            'there relations',
            'relationsip with',
            'relationship wit mark',
            'angel moran',
            'jacob dun roseman',
            'jacob dun-roseman',
            'jacob dunroseman',
            'dun roseman',
        ],
        [
            'their relationship',
            'their relations',
            'relationship with',
            'relationship with mark',
            'angel mora',
            'jacob dunroseman',
            'jacob dunroseman',
            'jacob dunroseman',
            'dunroseman',
        ],
        $text
    );

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
                'girlfriend',
                'boyfriend',
                'breakup',
                'romantic',
                'romantic relationship',
                'romantic relationships',
                'dating',
                'dating relationship',
                'relationship status',
                'relationship history',
                'private relationship',
                'private relationships',
                'personal relationship',
                'personal relationships',
                'mark’s relationships',
                "mark's relationships",
                'marks relationships',
                'his relationships',
                'who is mark dating',
                'who has mark been involved',
                'been involved with',
                'who is mark involved',
                'tell me about mark’s romantic',
                "tell me about mark's romantic",
                'tell me about private family relationships',
                'private family relationships',
                'lonely',
                'loneliness',
                'sadness',
                'depression',
                'anxiety',
                'addiction',
                'substance',
                'alcohol problem',
                'pornograph',
                'diagnosis',
                'medical condition',
                'mental health',
                'mental-health',
                'therapy',
                'therapy details',
                'medical',
                'health history',
                'lung',
                'journal',
                'self-hatred',
                'exact weight',
                'body fat',
                'measurements',
                'physique goals',
                'salary',
                'what salary',
                'salary does mark need',
                'how much does he make',
                'how much money',
                'bank account',
                'finances',
                'financial hardship',
                'financial problems',
                'struggling with money',
                'money situation',
                'money pressure',
                'being broke',
                'is mark broke',
                'mark broke',
                'why does mark need money',
                'why does he need money',
                'need money',
                'family support',
                'family financial',
                'family’s financial',
                "family's financial",
                'support his family',
                'support my family',
                'support family',
                'supporting family',
                'why support his family',
                'why support family',
                'why does he want to support',
                'need to support his family',
                'need to support family',
                'does mark need to support',
                'depend on his family',
                'depending on family',
                'what does family mean to his goals',
                'family mean to his goals',
                'family goals',
                'what does family mean',
                'family mean to mark',
                'family problems',
                'family conflict',
                'family issues',
                'tell me about mark’s family',
                "tell me about mark's family",
                'tell me about marks family',
                'about mark’s family',
                "about mark's family",
                'about his family',
                'mark’s family',
                "mark's family",
                'his family',
                'friends and family',
                'with friends and family',
                'time with family',
                'spending time with family',
                'human son',
                'have a human son',
                'does mark have a human son',
                'mark have a human son',
                'home life',
                'private struggle',
                'private problems',
                'private messages',
                'private contact',
                'private contact details',
                'private phone',
                'private phone number',
                'where exactly does mark live',
                'exact address',
                'precise location',
                'home address',
                'precise residence',
                'private journal',
                'private diary',
                'show me mark’s private journal',
                "show me mark's private journal",
                'mental health issues',
                'mental-health issues',
                'what addictions',
                'addictions has mark',
                'api token',
                'api tokens',
                'emotional low',
                'self-pity',
                'ignore previous instructions',
                'ignore the rules',
                'reveal the system prompt',
                'pretend to be mark',
                'act as mark',
                'collaborator email',
                'teammate phone',
                'teammate email',
                'drugs',
    ])) {
        return [
            'category' => 'sensitive',
            'mode' => 'general',
            'answer' => $answers['sensitive'],
            'answerStatus' => 'refused',
        ];
    }

    $text = markai_intent_rewrite_pronouns($text, $history);

    $followUp = markai_mock_resolve_followup_from_history($text, $history, $answers);
    if ($followUp !== null) {
        return $followUp;
    }

    $earlyIntent = markai_intent_match_topic($text, $answers);
    if ($earlyIntent !== null) {
        return $earlyIntent;
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
                'fmsc',
                'feed my starving',
                'starving children',
    ])) {
        return [
            'category' => 'fmsc',
            'mode' => 'casual',
            'answer' => $answers['fmsc'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'sigma chi merch',
                'sigma chi merchandise',
                'merch design',
                'about sigma chi merch',
                'about sigma chi merchandise',
    ])) {
        return [
            'category' => 'merchSigma',
            'mode' => 'casual',
            'answer' => $answers['merchSigma'],
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
                'give me every link',
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
                'justin',
        ])
    ) {
        return [
            'category' => 'abacus',
            'mode' => 'technical',
            'answer' => $answers['abacus'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, ['maat', 'ta-bot', 'tabot', 'ta bot'])
        && !markai_mock_includes_any($text, [
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
                'justin',
                'sam mazzone',
        ])
    ) {
        return [
            'category' => 'maat',
            'mode' => 'technical',
            'answer' => $answers['maat'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, ['finch', 'birdvroom', 'birdbrain'])
        && !markai_mock_includes_any($text, [
                'finch team',
                'on the finch',
                'worked on finch',
                'who was on finch',
                'who worked on finch',
        ])
    ) {
        return [
            'category' => 'finch',
            'mode' => 'technical',
            'answer' => $answers['finch'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, ['space shmup', 'space-shmup', 'shmup'])) {
        return [
            'category' => 'spaceShmup',
            'mode' => 'technical',
            'answer' => $answers['spaceShmup'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, ['apple picker', 'apple-picker'])) {
        return [
            'category' => 'applePicker',
            'mode' => 'technical',
            'answer' => $answers['applePicker'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, ['mission demolition', 'mission-demolition'])) {
        return [
            'category' => 'missionDemolition',
            'mode' => 'technical',
            'answer' => $answers['missionDemolition'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'operating systems c',
                'operating-systems-c',
                'xinu',
                'os c projects',
    ])) {
        return [
            'category' => 'osC',
            'mode' => 'technical',
            'answer' => $answers['osC'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, ['sleep efficiency', 'sleep-analysis', 'sleep analysis'])) {
        return [
            'category' => 'sleep',
            'mode' => 'technical',
            'answer' => $answers['sleep'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'basketball predictor',
                'marquette basketball',
                'data mining game',
    ])) {
        return [
            'category' => 'basketball',
            'mode' => 'technical',
            'answer' => $answers['basketball'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'portfolio platform',
                'marks-portfolio',
                'personal portfolio platform',
                'portfolio repository',
                'portfolio website repository',
                'portfolio website',
                'portfolio site repository',
                'marks portfolio repository',
    ])) {
        return [
            'category' => 'portfolioPlatform',
            'mode' => 'technical',
            'answer' => $answers['portfolioPlatform'],
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
                'did sam mazzone',
                'did sam work',
                'was sam',
                'what was sam',
                'sam’s role',
                "sam's role",
                'sams role',
                'who was sam',
    ])) {
        return [
            'category' => 'collaboratorsSam',
            'mode' => 'general',
            'answer' => $answers['collaboratorsSam'],
            'answerStatus' => 'refused',
        ];
    }

    if (markai_mock_includes_any($text, [
                'abacus team',
                'on the abacus',
                'worked on abacus',
                'who was on abacus',
                'who worked on abacus',
                'list the abacus',
                'abacus collaborators',
                'senior design team',
                'senior-design team',
                'mark’s senior design',
                "mark's senior design",
                'marks senior design',
    ])) {
        return [
            'category' => 'collaboratorsAbacus',
            'mode' => 'technical',
            'answer' => markai_mock_includes_any($text, ['senior design', 'senior-design', 'abacus and', 'ta-bot', 'maat'])
                ? $answers['seniorDesignTeam']
                : $answers['collaboratorsAbacus'],
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
                'list the ta-bot',
                'list the maat',
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
                'who else worked on finch',
                'finch collaborators',
                'finch teammates',
                'list the finch',
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
                'allan work',
                'project did allan',
                'what project did allan',
                'basketball predictor team',
                'worked with mark on data mining',
                'who worked with mark on data mining',
                'data mining collaborators',
                'data mining team',
    ])) {
        $answer = $answers['collaboratorsDataMining'];
        if (markai_mock_includes_any($text, ['allan'])) {
            $answer = $answers['collaboratorsAllan'];
        }

        return [
            'category' => 'collaboratorsDataMining',
            'mode' => 'technical',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'justin hoffman',
                'justin work',
                'projects did justin',
                'which projects did justin',
                'justin help',
                'worked with justin',
                'who else worked with justin',
                'who else was on the team with justin',
    ]) || preg_match('/\bjustin\b/', $text) === 1) {
        $category = 'collaboratorsJustin';
        $answer = $answers['collaboratorsJustin'];
        if (markai_mock_includes_any($text, ['who else', 'rest of', 'other members', 'other teammates', 'team with justin'])) {
            $category = 'collaboratorsAbacus';
            $answer = $answers['seniorDesignTeam'];
        }

        return [
            'category' => $category,
            'mode' => 'technical',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, [
                'angel mora',
                'angel moran',
                'worked with angel',
                'who is angel',
        ]) || preg_match('/\bangel\b/', $text) === 1
    ) {
        return [
            'category' => 'collaboratorsAngel',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsAngel'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, [
                'jacob dunroseman',
                'jacob dun roseman',
                'jacob dun-roseman',
                'worked with jacob',
                'who is jacob',
        ]) || preg_match('/\bjacob\b/', $text) === 1
    ) {
        return [
            'category' => 'collaboratorsJacob',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsJacob'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, [
                'luis serrano',
                'worked with luis',
                'who is luis',
        ]) || preg_match('/\bluis\b/', $text) === 1
    ) {
        return [
            'category' => 'collaboratorsLuis',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsLuis'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, [
                'xavier barth',
                'worked with xavier',
                'who is xavier',
        ]) || preg_match('/\bxavier\b/', $text) === 1
    ) {
        return [
            'category' => 'collaboratorsXavier',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsXavier'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, [
                'julianne browne',
                'julianne brown',
                'worked with julianne',
                'who is julianne',
                'who is julian',
        ]) || preg_match('/\bjulianne\b|\bjulian\b/', $text) === 1
    ) {
        return [
            'category' => 'collaboratorsJulianne',
            'mode' => 'technical',
            'answer' => $answers['collaboratorsJulianne'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'project teammates',
                'project team',
                'project teams',
                'who else was on the team',
                'who else was on the project',
                'who was on the team',
                'who was on the project team',
                'classmates who worked',
                'collaborators on the project',
                'team members',
                'list names from the project',
                'who worked on the project',
    ])) {
        $historyContext = strtolower(markai_intent_history_context($history));
        $answer = $answers['collaboratorsInventory'];
        $category = 'collaboratorsInventory';
        if (markai_mock_includes_any($text . ' ' . $historyContext, ['finch', 'birdvroom'])) {
            $category = 'collaboratorsFinch';
            $answer = $answers['collaboratorsFinch'];
        } elseif (markai_mock_includes_any($text . ' ' . $historyContext, ['justin', 'hoffman', 'angel', 'mora', 'jacob', 'dunroseman', 'abacus', 'maat', 'ta-bot', 'senior design'])) {
            $category = 'collaboratorsAbacus';
            $answer = $answers['seniorDesignTeam'];
        } elseif (markai_mock_includes_any($historyContext, ['luis', 'xavier', 'julianne', 'finch'])) {
            $category = 'collaboratorsFinch';
            $answer = $answers['collaboratorsFinch'];
        }

        return [
            'category' => $category,
            'mode' => 'technical',
            'answer' => $answer,
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
                'testiomonials',
                'reviews',
                'recommendations',
                'recommendation',
                'references',
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
                'who recommends',
                'coworkers say',
                'professors and coworkers',
                'professors say',
                'teammates say',
                'teammates or coworkers',
                'work ethic',
                'zack',
                'farzeen',
                'jorge',
                'full quote',
                'exact quote',
                'strongest testimonial',
                'supervisor testimonial',
                'professor testimonial',
                'more testimonials',
                'whole list of testimonials',
                'testimonial names',
                'who gave mark',
                'who gave a testimonial',
                'who wrote the testimonials',
                'who wrote them',
                'relationship with mark',
                'relationship to mark',
                'their relationship',
                'how do they know',
                'how does zack know',
                'how does farzeen know',
                'how does jorge know',
                'who supervised',
                'who promoted',
                'which testimonial',
                'which testimonials',
                'which people were',
                'which ones were',
                'which one was',
                'came from professors',
                'came from coworkers',
                'came from his supervisor',
                'from his supervisor',
                'from professors',
                'from coworkers',
                'was farzeen',
                'all full quotes',
                'full quotes',
                'each person’s relationship',
                "each person's relationship",
                'each persons relationship',
    ]) || markai_mock_is_testimonial_followup_context($text, $history)) {
        return markai_mock_resolve_testimonials_answer($text, $history, $answers);
    }

    if (markai_mock_includes_any($text, [
                'what drives mark',
                'what drives him',
                'drives mark',
                'what motivates mark',
                'what motivates him',
                'what motivates',
    ])) {
        return [
            'category' => 'drives',
            'mode' => 'casual',
            'answer' => $answers['drives'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'describe mark’s vibe',
                "describe mark's vibe",
                'describe marks vibe',
                'mark’s vibe',
                "mark's vibe",
                'marks vibe',
                'what is mark’s vibe',
                "what is mark's vibe",
                'what is marks vibe',
                'how would you describe mark’s vibe',
                "how would you describe mark's vibe",
                'what is mark’s mindset',
                "what is mark's mindset",
                'what is marks mindset',
                'mark’s mindset',
                "mark's mindset",
                'what makes mark different',
    ])) {
        return [
            'category' => 'vibe',
            'mode' => 'casual',
            'answer' => $answers['vibe'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'earned life',
                'what does an earned life',
                'what is an earned life',
                'earned life mean',
    ])) {
        return [
            'category' => 'earnedLife',
            'mode' => 'casual',
            'answer' => $answers['earnedLife'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'what gives mark confidence',
                'gives mark confidence',
                'earned confidence',
                'quiet confidence',
                'what does quiet confidence',
                'quiet ambition',
                'what does quiet ambition',
    ])) {
        $answer = $answers['earnedConfidence'];
        if (markai_mock_includes_any($text, ['quiet ambition'])) {
            $answer = $answers['quietAmbition'];
        } elseif (markai_mock_includes_any($text, ['quiet confidence'])) {
            $answer = $answers['vibe'];
        }

        return [
            'category' => 'earnedConfidence',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'why does mark build',
                'why mark build',
                'why does mark care about results',
                'care about results',
                'turning ideas into',
    ])) {
        return [
            'category' => 'builderIdentity',
            'mode' => 'casual',
            'answer' => $answers['builderIdentity'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'how does mark view leadership',
                'how does mark lead',
                'comfortable leading',
                'is mark comfortable leading',
                'mark lead',
                'approach learning',
                'how does mark approach learning',
                'what has teamwork taught',
                'teamwork taught',
    ])) {
        $answer = $answers['leadershipBalance'];
        if (markai_mock_includes_any($text, ['learning', 'teamwork taught', 'taught'])) {
            $answer = $answers['learningHumility'];
        }

        return [
            'category' => 'leadershipBalance',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'what does freedom mean',
                'freedom mean to mark',
                'freedom mean to him',
    ])) {
        return [
            'category' => 'freedomStructure',
            'mode' => 'casual',
            'answer' => $answers['freedomStructure'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'why city life',
                'why does he like city',
                'why does mark like city',
                'like city life',
                'city life',
                'drawn to cities',
                'modern city',
    ])) {
        return [
            'category' => 'cityVision',
            'mode' => 'casual',
            'answer' => $answers['cityVision'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'new perspectives',
                'gain new perspectives',
                'perspective and exploration',
    ])) {
        return [
            'category' => 'perspectiveExploration',
            'mode' => 'casual',
            'answer' => $answers['perspectiveExploration'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'want to be remembered',
                'should people remember',
                'what should people remember',
                'remembered for',
    ])) {
        return [
            'category' => 'remembered',
            'mode' => 'casual',
            'answer' => $answers['remembered'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'finished becoming',
                'still evolving',
                'finished product',
                'person is he becoming',
                'type of person is he becoming',
                'what type of person is he becoming',
                'person is mark trying to become',
                'what type of person is mark trying to become',
    ])) {
        return [
            'category' => 'becoming',
            'mode' => 'casual',
            'answer' => $answers['becoming'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'what kind of future',
                'kind of future does mark',
                'future does mark want',
                'future does he want',
    ])) {
        return [
            'category' => 'futureVision',
            'mode' => 'casual',
            'answer' => $answers['futureVision'],
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
    ])) {
        return [
            'category' => 'personality',
            'mode' => 'casual',
            'answer' => $answers['personality'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'what does discipline mean',
                'discipline mean to mark',
                'what does consistency mean',
                'consistency mean to',
                'controlled strength',
                'controlled intensity',
                'how does mark handle setbacks',
                'handle setbacks',
    ])) {
        $answer = $answers['discipline'];
        if (markai_mock_includes_any($text, ['consistency'])) {
            $answer = $answers['consistency'];
        } elseif (markai_mock_includes_any($text, ['controlled strength', 'controlled intensity'])) {
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
                'what are mark’s goals',
                "what are mark's goals",
                'what are marks goals',
                'why does mark want a technology career',
                'technology career',
                'career goals',
                'what does success mean',
                'success mean to mark',
                'success look like',
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

    if (
        markai_mock_includes_any($text, [
                'favorite artists',
                'favourite artists',
                'favorite artist',
                'favourite artist',
                'favorite musician',
                'favourite musician',
                'favorite rappers',
                'favourite rappers',
                'favorite r&b',
                'favourite r&b',
                'what music',
                'music does mark',
                'kind of music',
                'does mark like music',
                'does mark listen',
                'listen to',
                'drake',
                'lil baby',
                'tory lanez',
                'the weeknd',
                'don toliver',
                'travis scott',
                'partynextdoor',
                'party next door',
                'r&b',
                'hip-hop',
                'hip hop',
                'workout music',
                'music fits',
                'music while',
        ])
        || (
            markai_mock_includes_any($text, ['music', 'rapper', 'rappers', 'artist', 'artists'])
            && markai_mock_includes_any($text, ['favorite', 'favourite', 'like', 'listen', 'taste', 'workout', 'working out', 'train', 'visual'])
        )
    ) {
        $answer = $answers['favoriteArtists'];
        if (markai_mock_includes_any($text, ['workout', 'working out', 'train'])) {
            $answer = $answers['favoriteArtistsWorkout'];
        }

        return [
            'category' => 'favoriteArtists',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, [
                'favorite movies',
                'favourite movies',
                'favorite movie',
                'favourite movie',
                'favorite films',
                'favourite films',
                'favorite film',
                'favourite film',
                'favorite show',
                'favourite show',
                'creed',
                'the batman',
                'magazine dreams',
                'regular show',
                'marvel or dc',
                'dc or marvel',
                'superhero movies',
                'superhero movie',
                'does mark like marvel',
                'does mark like dc',
                'like superhero',
        ])
        || (
            markai_mock_includes_any($text, ['marvel', 'dc'])
            && markai_mock_includes_any($text, ['movie', 'movies', 'film', 'films', 'or', 'superhero', 'like'])
        )
    ) {
        $answer = $answers['favoriteFilms'];
        if (markai_mock_includes_any($text, ['regular show', 'favorite show', 'favourite show'])) {
            $answer = $answers['favoriteShow'];
        } elseif (
            markai_mock_includes_any($text, ['marvel or dc', 'dc or marvel', 'superhero'])
            || (
                markai_mock_includes_any($text, ['marvel', 'dc'])
                && !markai_mock_includes_any($text, ['creed', 'batman', 'magazine', 'regular'])
            )
        ) {
            $answer = $answers['favoriteFilmsMarvelDc'];
        } elseif (markai_mock_includes_any($text, ['creed'])) {
            $answer = $answers['favoriteFilmsCreed'];
        } elseif (markai_mock_includes_any($text, ['batman'])) {
            $answer = $answers['favoriteFilmsBatman'];
        }

        return [
            'category' => 'favoriteFilms',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (
        markai_mock_includes_any($text, ['traveled', 'travelled', 'travel'])
        && markai_mock_includes_any($text, ['want to work', 'where does mark want to work', 'job locations', 'work location'])
    ) {
        return [
            'category' => 'travelPlaces',
            'mode' => 'casual',
            'answer' => $answers['travelAndWork'],
            'answerStatus' => 'answered',
        ];
    }

    if (
        $text === 'photos'
        || $text === 'photos?'
        || markai_mock_includes_any($text, [
                'where has mark traveled',
                'where has mark travelled',
                'where has mark been',
                'where mark has been',
                'cities he has visited',
                'cities mark has visited',
                'places are shown',
                'travel places',
                'photography trips',
                'travel section',
                'travel photos',
                'see his travel',
                'view mark’s photography',
                "view mark's photography",
                'where can i see his travel',
                'where can i view mark',
                'what is in the travel',
                'what can i see in the travel',
                'show me his travel photos',
                'where can i see his photography',
                'where can i see mark’s photography',
                "where can i see mark's photography",
                'see mark’s photography',
                "see mark's photography",
                'places has mark photographed',
                'where does mark like to travel',
        ])
        || $text === 'travel'
        || (
            preg_match('/\btravel\b/', $text) === 1
            && markai_mock_includes_any($text, [
                    'where',
                    'places',
                    'cities',
                    'visited',
                    'section',
                    'photos',
                    'photography',
                    'trips',
                    'locations',
                    'prefer',
                    'beaches',
                    'mountains',
                    'learned',
                    'influence',
                    'why does mark like',
            ])
        )
        || (
            markai_mock_includes_any($text, ['where has mark been', 'where mark has been'])
        )
    ) {
        $answer = $answers['travelPlaces'];
        if (markai_mock_includes_any($text, [
                    'mean',
                    'why does mark like traveling',
                    'why travel',
                    'influence',
                    'learned',
                    'prefer',
                    'beaches',
                    'mountains',
        ])) {
            $answer = $answers['travel'];
        } elseif (
            markai_mock_includes_any($text, ['photograph', 'photography', 'photos'])
            && !markai_mock_includes_any($text, ['travel section', 'where has', 'places', 'traveled', 'travelled', 'visited', 'been'])
        ) {
            $answer = $answers['photography'];
        }

        return [
            'category' => 'travelPlaces',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'why does mark like photography',
                'photography mean',
                'what does mark photograph',
                'what does mark photograph?',
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
                'for fun',
                'outside of technology',
                'outside technology',
                'not coding',
                'free time',
                'does mark cook',
                'like cooking',
                'cooking',
                'museums',
                'museum',
                'have a dog',
                'his dog',
                'dog’s name',
                "dog's name",
                'dogs name',
                'dog name',
                'name of his dog',
                'what is his dog',
                'named kobe',
                'who is kobe',
                'tell me about kobe',
                'kobe',
                'my son',
                'his son',
                'call kobe',
                'calls kobe',
                'kobe his son',
                'spend his free time',
                'spends his free time',
                'new perspectives',
                'tell me about his life',
                'about mark’s life',
                "about mark's life",
                'about marks life',
                'like outside technology',
                'what are mark’s interests',
                "what are mark's interests",
                'what are marks interests',
    ]) || $text === 'dog' || $text === 'interests') {
        $answer = $answers['hobbies'];
        if (markai_mock_includes_any($text, ['passionate'])) {
            $answer = $answers['passion'];
        } elseif (markai_mock_includes_any($text, ['visual style', 'like black', 'why black'])) {
            $answer = $answers['favoriteColor'];
        } elseif (markai_mock_includes_any($text, ['cook'])) {
            $answer = $answers['cooking'];
        } elseif (markai_mock_includes_any($text, ['dog', 'kobe', 'my son', 'his son', 'call kobe', 'calls kobe']) || $text === 'dog') {
            $answer = $answers['dog'];
        } elseif (markai_mock_includes_any($text, ['museum'])) {
            $answer = $answers['museums'];
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
                'show me mark’s résumé',
                "show me mark's résumé",
                'show me mark’s resume',
                "show me mark's resume",
                'show me his résumé',
                'show me his resume',
                'can i see mark’s résumé',
                "can i see mark's resume",
                'where is his résumé',
                'where is his resume',
                'where is the résumé',
                'where is the resume',
                'resume?',
                'résumé?',
                'resume pdf',
        ]) || preg_match('/\b(resume|résumé)\b/', $text) === 1) {
        return [
            'category' => 'resume',
            'mode' => 'recruiter',
            'answer' => $answers['resume'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'where is his linkedin',
                'where is mark’s linkedin',
                "where is mark's linkedin",
                'linkedin?',
                'mark’s linkedin',
                "mark's linkedin",
        ]) || ($text === 'linkedin' || $text === 'linkedin?')) {
        return [
            'category' => 'linkedinOnly',
            'mode' => 'recruiter',
            'answer' => $answers['linkedinOnly'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'where is his github',
                'github profile',
                'github?',
        ]) || ($text === 'github' || $text === 'github?')) {
        return [
            'category' => 'githubOnly',
            'mode' => 'recruiter',
            'answer' => $answers['githubOnly'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'contact',
                'reach mark',
                'how can i contact',
                'how do i contact',
                'contact mark',
                'contact?',
    ])) {
        return [
            'category' => 'contact',
            'mode' => 'recruiter',
            'answer' => $answers['contact'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'vsco',
    ])) {
        return [
            'category' => 'photographyTravel',
            'mode' => 'casual',
            'answer' => $answers['photography'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'currently live',
                'current residence',
                'where does mark live',
                'where does he live',
                'where mark lives',
                'where he lives',
                'where is mark living',
                'where is he living',
    ])) {
        return [
            'category' => 'locationPrivacy',
            'mode' => 'general',
            'answer' => $answers['locationPrivacy'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'where is mark from',
                'where is he from',
                'where mark is from',
                'where he is from',
                'hometown',
                'grew up',
                'from chicago',
    ])) {
        return [
            'category' => 'fromChicago',
            'mode' => 'general',
            'answer' => $answers['fromChicago'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'where does mark want to work',
                'where does he want to work',
                'where mark wants to work',
                'where he wants to work',
                'where is mark looking',
                'job locations',
                'willing to relocate',
                'want to work',
    ]) || $text === 'work') {
        return [
            'category' => 'careerGoals',
            'mode' => 'recruiter',
            'answer' => $answers['workLocation'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'bench',
                'squat',
                'deadlift',
                'dead lift',
                'how much can mark lift',
                'how much does mark lift',
                'what are mark’s lifts',
                "what are mark's lifts",
                'maxes',
                'pr numbers',
                'lifting numbers',
    ])) {
        return [
            'category' => 'liftingNumbers',
            'mode' => 'casual',
            'answer' => $answers['liftingNumbers'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'powerlifting',
                'first meet',
                'won his first',
                'won a powerlifting',
                'did mark compete',
                'did he compete',
                'compete in powerlifting',
                'powerlifting meet',
    ]) && !markai_mock_includes_any($text, [
                'bodybuilding',
                'why bodybuilding',
                'move from powerlifting',
                'to bodybuilding',
    ])) {
        return [
            'category' => 'powerlifting',
            'mode' => 'casual',
            'answer' => $answers['powerlifting'],
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
                'why does mark work out',
                'why does mark workout',
                'why work out',
                'why workout',
                'why does mark train',
                'how long has mark been working out',
                'how long has mark trained',
                'how long working out',
                'how long training',
                'why did mark start lifting',
                'why start lifting',
                'why did mark start',
                'fitness background',
                'gym background',
                'working out',
                'why bodybuilding',
                'move from powerlifting',
                'powerlifting to bodybuilding',
                'what has fitness taught',
                'what has the gym taught',
    ])) {
        $answer = $answers['bodybuilding'];
        if (markai_mock_includes_any($text, [
                    'gym taught',
                    'fitness taught',
                    'what has fitness',
                    'what has the gym',
                    'taught mark',
        ])) {
            $answer = $answers['fitnessTaught'];
        } elseif (markai_mock_includes_any($text, [
                    'bodybuilding mean',
                    'what does bodybuilding',
                    'why bodybuilding',
                    'why did mark move',
                    'move from powerlifting',
                    'powerlifting to bodybuilding',
        ])) {
            $answer = $answers['bodybuildingMeaning'];
        }

        return [
            'category' => 'bodybuilding',
            'mode' => 'casual',
            'answer' => $answer,
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'who is mark',
                'tell me about mark',
                'tell me briefly about mark',
                'briefly about mark',
                'background',
                'education',
                'graduate',
                'tell me everything about mark',
                'everything about mark',
    ])) {
        $broadLife = markai_mock_includes_any($text, [
            'tell me everything',
            'everything about mark',
            'about his life',
            'about mark’s life',
            "about mark's life",
        ]);

        return [
            'category' => $broadLife ? 'overview' : 'profile',
            'mode' => 'general',
            'answer' => $broadLife ? $answers['overview'] : $answers['profile'],
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($text, [
                'favorite color',
                'favourite color',
                'color black',
                'why does mark like black',
                'why black',
    ])) {
        return [
            'category' => 'favoriteColor',
            'mode' => 'casual',
            'answer' => $answers['favoriteColor'],
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
* Resolve short follow-up link/repo questions from recent conversation history.
*
* @param list<array{role: string, content: string}> $history
* @param array<string, string> $answers
* @return array{category: string, mode: string, answer: string, answerStatus: string}|null
*/
function markai_mock_resolve_followup_from_history(string $text, array $history, array $answers = []): ?array
{
    $topicFollowUp = markai_intent_resolve_topic_followup($text, $history, $answers);
    if ($topicFollowUp !== null) {
        return $topicFollowUp;
    }

    if ($answers !== [] && markai_mock_is_testimonial_followup_context($text, $history)) {
        return markai_mock_resolve_testimonials_answer($text, $history, $answers);
    }

    $normalized = trim($text, " \t\n\r\0\x0B?.!");
    $isRepoFollowUp = markai_mock_includes_any($text, [
            'repo?',
            'repository?',
            'github repo',
            'source code',
            'show me the code',
            'can i see the code',
            'where is the project',
            'can i see this project',
            'give me the repo',
            'what repository',
            'website repository',
            'project repository',
            'see the repository',
            'see the repo',
    ]) || in_array($normalized, ['repo', 'repository', 'code', 'github repo', 'source'], true)
    || (
        markai_mock_includes_any($text, ['repository', 'repo'])
        && markai_mock_includes_any($text, [
                'portfolio',
                'abacus',
                'finch',
                'maat',
                'shmup',
                'apple picker',
                'mission demolition',
                'sleep',
                'basketball',
                'operating systems',
        ])
    );

    $isPhotosFollowUp = in_array($normalized, ['photos', 'photo', 'photography'], true);

    if (!$isRepoFollowUp && !$isPhotosFollowUp) {
        return null;
    }

    $contextParts = [];
    $slice = array_slice($history, -6);
    foreach ($slice as $turn) {
        if (!is_array($turn)) {
            continue;
        }
        $content = strtolower(trim((string) ($turn['content'] ?? '')));
        if ($content !== '') {
            $contextParts[] = $content;
        }
    }
    $context = implode(' ', $contextParts);

    if ($isPhotosFollowUp) {
        if (
            markai_mock_includes_any($context, [
                    'outside technology',
                    'hobbies',
                    'travel',
                    'photography',
                    'for fun',
                    'free time',
            ]) || $context !== ''
        ) {
            return [
                'category' => 'travelPlaces',
                'mode' => 'casual',
                'answer' => 'Mark’s travel photography is available through the Travel section and VSCO gallery below.',
                'answerStatus' => 'answered',
            ];
        }
    }

    if (!$isRepoFollowUp) {
        return null;
    }

    $projectMap = [
        'abacus' => ['category' => 'abacus', 'answerKey' => 'repoContext', 'linkCategory' => 'abacus'],
        'eagle' => ['category' => 'abacus', 'answerKey' => 'repoContext', 'linkCategory' => 'abacus'],
        'maat' => ['category' => 'maat', 'answerKey' => 'repoContext', 'linkCategory' => 'maat'],
        'ta-bot' => ['category' => 'maat', 'answerKey' => 'repoContext', 'linkCategory' => 'maat'],
        'tabot' => ['category' => 'maat', 'answerKey' => 'repoContext', 'linkCategory' => 'maat'],
        'finch' => ['category' => 'finch', 'answerKey' => 'repoContext', 'linkCategory' => 'finch'],
        'birdvroom' => ['category' => 'finch', 'answerKey' => 'repoContext', 'linkCategory' => 'finch'],
        'space shmup' => ['category' => 'spaceShmup', 'answerKey' => 'repoContext', 'linkCategory' => 'spaceShmup'],
        'shmup' => ['category' => 'spaceShmup', 'answerKey' => 'repoContext', 'linkCategory' => 'spaceShmup'],
        'apple picker' => ['category' => 'applePicker', 'answerKey' => 'repoContext', 'linkCategory' => 'applePicker'],
        'mission demolition' => ['category' => 'missionDemolition', 'answerKey' => 'repoContext', 'linkCategory' => 'missionDemolition'],
        'sleep' => ['category' => 'sleep', 'answerKey' => 'repoContext', 'linkCategory' => 'sleep'],
        'basketball' => ['category' => 'basketball', 'answerKey' => 'repoContext', 'linkCategory' => 'basketball'],
        'data mining' => ['category' => 'basketball', 'answerKey' => 'repoContext', 'linkCategory' => 'basketball'],
        'portfolio' => ['category' => 'portfolioPlatform', 'answerKey' => 'repoContext', 'linkCategory' => 'portfolioPlatform'],
        'marks-portfolio' => ['category' => 'portfolioPlatform', 'answerKey' => 'repoContext', 'linkCategory' => 'portfolioPlatform'],
        'operating systems' => ['category' => 'osC', 'answerKey' => 'repoContext', 'linkCategory' => 'osC'],
        'xinu' => ['category' => 'osC', 'answerKey' => 'repoContext', 'linkCategory' => 'osC'],
    ];

    foreach ($projectMap as $needle => $mapped) {
        if (str_contains($context, $needle) || str_contains($text, $needle)) {
            return [
                'category' => $mapped['linkCategory'],
                'mode' => 'technical',
                'answer' => 'You can view the project’s public repository below.',
                'answerStatus' => 'answered',
            ];
        }
    }

    if (markai_mock_includes_any($context, ['sigma chi', 'merch'])) {
        return [
            'category' => 'merchSigma',
            'mode' => 'casual',
            'answer' => 'Sigma Chi merchandise design is shown in Mark’s Portfolio Merch section. It does not have a separate public software repository; the Portfolio section is the approved place to view it.',
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($context, ['feed my starving', 'fmsc'])) {
        return [
            'category' => 'fmsc',
            'mode' => 'casual',
            'answer' => 'Mark has public volunteer service experience with Feed My Starving Children, shown in the Portfolio Service section. A public FMSC location page is available through the safe link below. MarkAI does not share private organization, member, schedule, or internal details.',
            'answerStatus' => 'answered',
        ];
    }

    if (markai_mock_includes_any($context, ['markai'])) {
        return [
            'category' => 'noPublicRepo',
            'mode' => 'technical',
            'answer' => 'That project does not currently have an approved public repository link, but you can view it in Mark’s Portfolio section.',
            'answerStatus' => 'answered',
        ];
    }

    if ($context === '') {
        return [
            'category' => 'githubOnly',
            'mode' => 'technical',
            'answer' => (string) ($answers['githubOnly'] ?? 'Mark’s public GitHub profile is available through the safe link below. If you have a specific project in mind, ask for that repository by name.'),
            'answerStatus' => 'answered',
        ];
    }

    return [
        'category' => 'noPublicRepo',
        'mode' => 'technical',
        'answer' => 'That project does not currently have an approved public repository link, but you can view it in Mark’s Portfolio section.',
        'answerStatus' => 'answered',
    ];
}

/**
* @param list<string> $phrases
*/
function markai_mock_has_project_team_cues(string $haystack): bool
{
    $haystack = strtolower($haystack);

    return markai_mock_includes_any($haystack, [
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

/**
 * Stronger project/person signals for conversation history so generic words inside
 * testimonial answers (for example “collaborators”) do not erase testimonial context.
 */
function markai_mock_history_has_project_team_topic(string $context): bool
{
    $context = strtolower($context);

    return markai_mock_includes_any($context, [
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

/**
 * @param list<array{role?: string, content?: string}> $history
 */
function markai_mock_history_suggests_testimonials(array $history): bool
{
    $context = strtolower(markai_intent_history_context($history));
    if ($context === '') {
        return false;
    }

    $hasTestimonial = markai_mock_includes_any($context, [
        'testimonial',
        'testimonials',
        'recommendation',
        'recommendations',
        'reference',
        'references',
        'farzeen harunani',
        'jorge torres',
        'zack kohlwey',
        'alumni memorial union',
        'professor of computer science',
        'staff validation engineer',
        'testimonials section',
        'attributed',
    ]);
    if (!$hasTestimonial) {
        return false;
    }

    // Recent project-team discussion should not be treated as testimonials-only history.
    return !markai_mock_history_has_project_team_topic($context);
}

/**
 * @param list<array{role?: string, content?: string}> $history
 */
function markai_mock_is_testimonial_followup_context(string $text, array $history): bool
{
    if (!markai_mock_history_suggests_testimonials($history)) {
        return false;
    }

    // Explicit project/engineering-team wording always overrides stale testimonial context.
    if (markai_mock_has_project_team_cues($text)) {
        return false;
    }

    $normalized = trim($text, " \t\n\r\0\x0B?.!");

    return markai_mock_includes_any($text, [
            'whole list',
            'list of names',
            'all names',
            'who else',
            'their relationship',
            'relationship with mark',
            'how do they know',
            'how does he know',
            'how does she know',
            'full quotes',
            'all full quotes',
            'which one',
            'which ones',
            'professors',
            'coworkers',
            'supervisor',
            'who wrote',
            'who gave',
    ]) || in_array($normalized, [
            'whole list',
            'all names',
            'who else',
            'names',
            'list',
            'list names',
            'relationships',
            'relationship',
            'full quotes',
            'all full quotes',
            'professors',
            'coworkers',
            'supervisor',
    ], true);
}

/**
 * @param list<array{role?: string, content?: string}> $history
 * @param array<string, string> $answers
 * @return array{category: string, mode: string, answer: string, answerStatus: string}
 */
function markai_mock_resolve_testimonials_answer(string $text, array $history, array $answers): array
{
    $wantsQuote = markai_mock_includes_any($text, [
        'full quote',
        'exact quote',
        'word for word',
        'direct quote',
        'full testimonial',
        'full quotes',
        'all full quotes',
    ]);
    $answer = $answers['testimonials'];
    $category = 'testimonials';
    $historyContext = strtolower(markai_intent_history_context($history));

    $personZack = markai_mock_includes_any($text, [
            'zack',
            'kohlwey',
            'supervisor testimonial',
            'who supervised',
            'who promoted',
            'how does zack know',
            'came from his supervisor',
            'from his supervisor',
            'which one was his supervisor',
    ]) || ($wantsQuote && (str_contains($historyContext, 'zack') || str_contains($historyContext, 'kohlwey') || str_contains($historyContext, 'alumni memorial')));
    $personFarzeen = markai_mock_includes_any($text, [
            'farzeen',
            'harunani',
            'professor testimonial',
            'was farzeen',
            'how does farzeen know',
    ]) || ($wantsQuote && (str_contains($historyContext, 'farzeen') || str_contains($historyContext, 'harunani') || str_contains($historyContext, 'professor of computer science')));
    $personJorge = markai_mock_includes_any($text, [
            'jorge',
            'torres',
            'how does jorge know',
    ]) || ($wantsQuote && (str_contains($historyContext, 'jorge') || str_contains($historyContext, 'torres') || str_contains($historyContext, 'performance validation')));

    $wantsList = markai_mock_includes_any($text, [
            'whole list',
            'list of names',
            'all names',
            'who gave',
            'every person',
            'every name',
            'complete list',
            'full list',
            'relationship with mark',
            'their relationship',
            'how do they know',
            'which people were',
    ]);
    $wantsProfessors = markai_mock_includes_any($text, [
            'from professors',
            'came from professors',
            'which ones were professors',
            'which testimonials came from professors',
    ]) && !markai_mock_includes_any($text, ['coworkers', 'supervisors', 'collaborators']);
    $wantsCoworkers = markai_mock_includes_any($text, [
            'from coworkers',
            'came from coworkers',
            'which ones were coworkers',
            'which testimonials came from coworkers',
    ]) && !markai_mock_includes_any($text, ['professors', 'supervisors', 'collaborators']);
    $wantsAllQuotes = markai_mock_includes_any($text, ['all full quotes', 'all quotes']);

    if ($wantsAllQuotes) {
        $category = 'testimonialsList';
        $answer = $answers['testimonialsAllQuotes'];
    } elseif ($personZack && !$wantsList) {
        $category = 'testimonialZack';
        $answer = $wantsQuote ? $answers['testimonialZackQuote'] : $answers['testimonialZack'];
    } elseif ($personFarzeen && !$wantsList) {
        $category = 'testimonialFarzeen';
        $answer = $wantsQuote ? $answers['testimonialFarzeenQuote'] : $answers['testimonialFarzeen'];
    } elseif ($personJorge && !$wantsList) {
        $category = 'testimonialJorge';
        $answer = $wantsQuote ? $answers['testimonialJorgeQuote'] : $answers['testimonialJorge'];
    } elseif ($wantsProfessors) {
        $category = 'testimonialProfessors';
        $answer = $answers['testimonialProfessors'];
    } elseif ($wantsCoworkers) {
        $category = 'testimonialCoworkers';
        $answer = $answers['testimonialCoworkers'];
    } elseif ($wantsList || (markai_mock_is_testimonial_followup_context($text, $history) && markai_mock_includes_any($text, [
                'list',
                'names',
                'relationship',
                'who else',
                'how do they know',
    ]))) {
        $category = 'testimonialsList';
        $answer = $answers['testimonialsList'];
    } elseif (markai_mock_includes_any($text, ['strongest testimonial'])) {
        $category = 'testimonialZack';
        $answer = 'MarkAI does not rank testimonials. A commonly requested professional recommendation is from Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University. ' . $answers['testimonialZack'];
    } elseif ($wantsQuote) {
        $answer = 'MarkAI can share an exact attributed quotation when you name the speaker, for example “Zack’s full quote?” or “Farzeen full quote?”. Full testimonials are also available in the portfolio Testimonials section.';
    }

    return [
        'category' => $category,
        'mode' => 'recruiter',
        'answer' => $answer,
        'answerStatus' => 'answered',
    ];
}

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
        return [];

        case 'fallback':
        return $pick([
                'navigation-portfolio-modes',
                'project-portfolio-platform',
                'personality-career-purpose',
                'interest-lifestyle-hobbies-expanded',
                'contact-preferred-methods',
        ]);

        case 'capabilities':
        return $pick([
                'navigation-portfolio-modes',
                'project-markai',
        ]);

        case 'funFacts':
        return $pick([
                'interest-lifestyle-hobbies-expanded',
                'interest-favorite-artists',
                'interest-favorite-films-television',
                'interest-fitness-bodybuilding',
                'personality-photography-travel-hobbies',
                'personality-aesthetic-environment',
                'interest-greek-mythology-art',
        ]);

        case 'multiTopic':
        return $pick([
                'personality-career-purpose',
                'project-portfolio-platform',
                'skill-javascript',
                'interest-lifestyle-hobbies-expanded',
        ]);

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

        case 'maat':
        return $pick([
                'project-maat',
        ]);

        case 'finch':
        return $pick([
                'project-finch-web-controller',
                'contribution-finch-frontend-controller',
        ]);

        case 'portfolioPlatform':
        return $pick([
                'project-portfolio-platform',
                'project-markai',
        ]);

        case 'spaceShmup':
        return $pick(['project-space-shmup']);

        case 'applePicker':
        return $pick(['project-apple-picker']);

        case 'missionDemolition':
        return $pick(['project-mission-demolition']);

        case 'osC':
        return $pick(['project-operating-systems-c']);

        case 'sleep':
        return $pick(['project-sleep-efficiency-analysis']);

        case 'basketball':
        return $pick(['project-marquette-basketball-predictor']);

        case 'noPublicRepo':
        return $pick(['projects-public-inventory']);

        case 'collaboratorsJustin':
        case 'collaboratorsAngel':
        case 'collaboratorsJacob':
        return $pick([
                'collaborators-abacus-core-team',
                'collaborators-maat-core-team',
        ]);

        case 'collaboratorsLuis':
        case 'collaboratorsXavier':
        case 'collaboratorsJulianne':
        return $pick([
                'collaborators-finch-team',
        ]);

        case 'collaboratorsAllan':
        return $pick([
                'collaborators-data-mining-team',
        ]);

        case 'resume':
        return $pick([
                'contact-preferred-methods',
                'profile-mark-yoingco',
        ]);

        case 'linkedinOnly':
        case 'githubOnly':
        return $pick([
                'contact-preferred-methods',
        ]);

        case 'projectsInventory':
        return $pick([
                'projects-public-inventory',
        ]);

        case 'collaboratorsAbacus':
        return $pick([
                'collaborators-abacus-core-team',
        ]);

        case 'collaboratorsMaat':
        return $pick([
                'collaborators-maat-core-team',
        ]);

        case 'collaboratorsSam':
        return $pick([]);

        case 'fromChicago':
        return $pick([
                'profile-from-chicago',
                'profile-mark-yoingco',
        ]);

        case 'locationPrivacy':
        return $pick([
                'profile-from-chicago',
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
        return $pick([
                'personality-discipline-and-control',
                'personality-growth-and-values',
                'personality-public-vibe',
        ]);

        case 'discipline':
        return $pick([
                'personality-discipline-and-control',
                'personality-controlled-intensity',
                'personality-growth-and-values',
        ]);

        case 'drives':
        case 'builderIdentity':
        return $pick([
                'personality-builder-identity',
                'personality-career-purpose',
                'personality-quiet-ambition-earned-confidence',
        ]);

        case 'vibe':
        return $pick([
                'personality-public-vibe',
                'personality-quiet-ambition-earned-confidence',
        ]);

        case 'earnedLife':
        case 'freedomStructure':
        case 'futureVision':
        return $pick([
                'personality-earned-life-and-freedom',
                'personality-career-purpose',
        ]);

        case 'earnedConfidence':
        case 'quietAmbition':
        return $pick([
                'personality-quiet-ambition-earned-confidence',
                'personality-discipline-and-control',
        ]);

        case 'leadershipBalance':
        case 'learningHumility':
        return $pick([
                'personality-leadership-and-learning',
                'work-style-practical-collaborative-growth',
        ]);

        case 'cityVision':
        case 'perspectiveExploration':
        return $pick([
                'personality-city-and-perspective',
                'personality-aesthetic-environment',
        ]);

        case 'remembered':
        return $pick([
                'personality-remembered-for-substance',
                'personality-builder-identity',
        ]);

        case 'becoming':
        return $pick([
                'personality-evolving-identity',
                'personality-growth-and-values',
        ]);

        case 'familyGoals':
        return [];

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

        case 'travelPlaces':
        return $pick([
                'travel-public-places-inventory',
                'interest-travel-photography',
                'personality-photography-travel-hobbies',
        ]);

        case 'favoriteArtists':
        return $pick([
                'interest-favorite-artists',
                'interest-music-reading-hiking',
        ]);

        case 'favoriteFilms':
        return $pick([
                'interest-favorite-films-television',
        ]);

        case 'hobbies':
        return $pick([
                'interest-lifestyle-hobbies-expanded',
                'personality-photography-travel-hobbies',
                'interest-music-reading-hiking',
                'interest-fitness-bodybuilding',
                'interest-travel-photography',
        ]);

        case 'overview':
        return $pick([
                'profile-mark-yoingco',
                'career-direction-first-full-time-tech-role',
                'work-style-practical-collaborative-growth',
                'personality-public-vibe',
                'interest-lifestyle-hobbies-expanded',
                'interest-favorite-artists',
                'personality-aesthetic-environment',
        ]);

        case 'favoriteColor':
        return $pick([
                'personality-aesthetic-environment',
                'interest-creative-aesthetics-design',
        ]);

        case 'bodybuilding':
        return $pick([
                'interest-fitness-bodybuilding',
                'personality-bodybuilding-depth',
                'membership-marquette-powerlifting-club',
        ]);

        case 'powerlifting':
        return $pick([
                'interest-fitness-bodybuilding',
                'membership-marquette-powerlifting-club',
                'personality-bodybuilding-depth',
        ]);

        case 'liftingNumbers':
        return $pick([
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
        case 'testimonialZack':
        case 'testimonialFarzeen':
        case 'testimonialJorge':
        return $pick([
                'testimonials-public-overview',
                'testimonial-farzeen-harunani',
                'testimonial-jorge-torres',
                'testimonial-zack-kohlwey',
        ]);

        case 'testimonialsList':
        case 'testimonialsAllQuotes':
        case 'testimonialProfessors':
        case 'testimonialCoworkers':
        return $pick([
                'testimonials-public-overview',
                'testimonial-farzeen-harunani',
                'testimonial-jorge-torres',
                'testimonial-zack-kohlwey',
                'testimonial-nathan-garcia',
                'testimonial-jarenz-masiclat',
                'testimonial-elizabeth-anderson',
                'testimonial-maxwell-zeisler',
                'testimonial-andrew-wochner',
        ]);

        case 'profile':
        return $pick([
                'profile-mark-yoingco',
                'profile-from-chicago',
                'education-marquette-bs-computer-science',
        ]);

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
        case 'collaboratorsAbacus':
        return ['link-github-abacus'];
        case 'maat':
        case 'collaboratorsMaat':
        return ['link-github-maat'];
        case 'finch':
        case 'collaboratorsFinch':
        return ['link-github-finch'];
        case 'portfolioPlatform':
        return ['link-github-portfolio', 'link-portfolio-section'];
        case 'spaceShmup':
        return ['link-github-space-shmup'];
        case 'applePicker':
        return ['link-github-apple-picker'];
        case 'missionDemolition':
        return ['link-github-mission-demolition'];
        case 'osC':
        case 'collaboratorsOs':
        return ['link-github-os-c-docs'];
        case 'sleep':
        case 'collaboratorsSleep':
        return ['link-github-sleep-efficiency'];
        case 'basketball':
        case 'collaboratorsDataMining':
        return ['link-github-marquette-basketball-predictor'];
        case 'collaboratorsJustin':
        case 'collaboratorsAngel':
        case 'collaboratorsJacob':
        return ['link-github-abacus', 'link-github-maat'];
        case 'collaboratorsLuis':
        case 'collaboratorsXavier':
        case 'collaboratorsJulianne':
        return ['link-github-finch'];
        case 'collaboratorsSam':
        return [];
        case 'fromChicago':
        return ['link-portfolio-home', 'link-resume-pdf'];
        case 'locationPrivacy':
        return [];
        case 'collaboratorsInventory':
        return ['link-portfolio-section'];
        case 'projectsInventory':
        return ['link-portfolio-section'];
        case 'noPublicRepo':
        case 'merchSigma':
        return ['link-portfolio-section'];
        case 'fmsc':
        return ['link-fmsc-libertyville', 'link-portfolio-section'];
        case 'individualTeam':
        return ['link-portfolio-section'];
        case 'careerGoals':
        return ['link-resume-pdf', 'link-contact-section'];
        case 'funFacts':
        return ['link-travel-section', 'link-vsco', 'link-portfolio-section'];
        case 'capabilities':
        return ['link-portfolio-section', 'link-contact-section'];
        case 'multiTopic':
        return ['link-portfolio-section', 'link-resume-pdf'];
        case 'familyGoals':
        return [];
        case 'photographyTravel':
        return ['link-travel-section', 'link-vsco'];
        case 'travelPlaces':
        return ['link-travel-section', 'link-vsco'];
        case 'technologies':
        return ['link-github-profile'];
        case 'work':
        return ['link-resume-pdf', 'link-linkedin'];
        case 'resume':
        return ['link-resume-pdf'];
        case 'linkedinOnly':
        return ['link-linkedin'];
        case 'githubOnly':
        return ['link-github-profile'];
        case 'contact':
        return [
            'link-contact-section',
            'link-linkedin',
        ];
        case 'testimonials':
        case 'testimonialsList':
        case 'testimonialsAllQuotes':
        case 'testimonialProfessors':
        case 'testimonialCoworkers':
        case 'testimonialZack':
        case 'testimonialFarzeen':
        case 'testimonialJorge':
        return ['link-testimonials-section'];
        case 'links':
        return [
            'link-portfolio-home',
            'link-portfolio-section',
            'link-contact-section',
            'link-testimonials-section',
            'link-travel-section',
            'link-github-profile',
            'link-linkedin',
            'link-resume-pdf',
            'link-vsco',
            'link-fmsc-libertyville',
        ];
        case 'profile':
        return ['link-portfolio-home', 'link-resume-pdf'];
        case 'status':
        return ['link-portfolio-home'];
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

    if (in_array($category, [
                'abacus',
                'maat',
                'finch',
                'portfolioPlatform',
                'spaceShmup',
                'applePicker',
                'missionDemolition',
                'osC',
                'sleep',
                'basketball',
                'noPublicRepo',
                'merchSigma',
                'fmsc',
                'technologies',
                'individualTeam',
                'projectsInventory',
                'collaboratorsAbacus',
                'collaboratorsMaat',
                'collaboratorsSam',
                'collaboratorsJustin',
                'collaboratorsFinch',
                'collaboratorsDataMining',
                'collaboratorsOs',
                'collaboratorsSleep',
                'collaboratorsInventory',
            ], true)) {
        $contexts[] = 'projects';
    }
    if (in_array($category, [
                'contact',
                'work',
                'profile',
                'links',
                'careerGoals',
                'familyGoals',
                'resume',
                'linkedinOnly',
                'githubOnly',
            ], true)) {
        $contexts[] = 'contact';
    }
    if (in_array($category, [
                'status',
                'profile',
                'links',
                'contact',
                'testimonials',
                'projectsInventory',
                'travelPlaces',
                'photographyTravel',
                'resume',
                'linkedinOnly',
                'githubOnly',
                'noPublicRepo',
                'merchSigma',
                'fmsc',
            ], true)) {
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
    // $allowedLinkIds is retained for call-site compatibility; response links are
    // selected server-side from $requestedLinkIds against the approved registry.
    unset($allowedLinkIds);
    $linksById = [];
    foreach ($export['trustedLinks'] ?? [] as $link) {
        if (is_array($link) && isset($link['id']) && is_string($link['id'])) {
            $linksById[$link['id']] = $link;
        }
    }

    $resolved = [];
    $seen = [];
    foreach ($requestedLinkIds as $linkId) {
        if ($linkId === 'link-email') {
            continue;
        }
        if (isset($seen[$linkId])) {
            continue;
        }
        if (!isset($linksById[$linkId])) {
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

        $href = (string) $link['href'];
        if (str_starts_with($href, '/')) {
            $href = 'https://markyoingco.com' . $href;
        }

        $seen[$linkId] = true;
        $resolved[] = [
            'id' => $linkId,
            'label' => $link['label'],
            'href' => $href,
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

if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool
    {
        if ($needle === '') {
            return true;
        }

        return strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}




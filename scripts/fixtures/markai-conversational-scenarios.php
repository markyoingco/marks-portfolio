<?php

declare(strict_types=1);

/**
 * MarkAI conversational regression scenario catalog.
 *
 * Returned shape:
 * [
 *   [
 *     'id' => string,
 *     'section' => string,
 *     'mode' => 'deterministic'|'provider_fail'|'rate_limit',
 *     'turns' => list<array{user: string, expect?: array}>,
 *   ],
 *   ...
 * ]
 *
 * Expect keys (all optional):
 * - contains: list<string>
 * - excludes: list<string>
 * - status_in: list<string>
 * - error_code_in: list<string|null>
 * - fallback_note: bool
 * - limit_note: bool
 * - numbered: bool
 * - user_note_exact: string
 */

$scenarios = [
    // --- Greetings / profile ---
    [
        'id' => 'greeting-standalone',
        'section' => 'Greeting',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'hello',
                'expect' => [
                    'contains' => ['MarkAI', 'projects', 'skills'],
                    'excludes' => ['I may be missing the intended topic'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'profile-who-is',
        'section' => 'Profile',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Who is Mark Yoingco?',
                'expect' => [
                    'contains' => ['Marquette', 'Computer Science'],
                    'excludes' => ['girlfriend', 'private phone'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'profile-overview-and-summary',
        'section' => 'Profile',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'tell me everything about Mark',
                'expect' => [
                    'contains' => ['Education', 'Strongest projects', 'Technical skills'],
                    'excludes' => ['girlfriend', ' running'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'give me a shorter summary',
                'expect' => [
                    'contains' => ['Marquette'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'profile-recruiter-batch',
        'section' => 'Profile',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "hello\nwho is Mark Yoingco?\nwhat makes Mark different?\nwhy should someone hire Mark?\nwhat is Mark like to work with?",
                'expect' => [
                    'contains' => ['1.', '2.', 'Marquette', 'hire', 'collaborative'],
                    'numbered' => true,
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Skills ---
    [
        'id' => 'skills-strongest',
        'section' => 'Skills',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "What are Mark’s strongest technical skills?",
                'expect' => [
                    'contains' => ['full-stack', 'React'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Which project proves that?',
                'expect' => [
                    'contains' => ['Portfolio', 'MarkAI'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'skills-roles-batch',
        'section' => 'Skills',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "What type of developer is Mark?\nWhat roles is Mark qualified for?\nIs Mark ready for a full-time software job?",
                'expect' => [
                    'contains' => ['entry-level', '1.', '3.'],
                    'excludes' => ['senior engineer with many years'],
                    'numbered' => true,
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'skills-pronoun-followup',
        'section' => 'Skills',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Who is Mark?',
                'expect' => [
                    'contains' => ['Marquette'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'What are his strongest skills?',
                'expect' => [
                    'contains' => ['React'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Projects ---
    [
        'id' => 'projects-strongest',
        'section' => 'Projects',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "What are Mark’s strongest projects?",
                'expect' => [
                    'contains' => ['Portfolio', 'Abacus', 'MAAT'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'projects-comparison-batch',
        'section' => 'Projects',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "Which project best represents Mark?\nWhat did Mark build by himself?\nWhich projects used React, Python, databases, and testing?\nWhich projects show leadership?",
                'expect' => [
                    'contains' => ['MarkAI', 'solo', 'Document Manager', '1.', '4.'],
                    'excludes' => ['Mark was the sole Project Manager on Abacus'],
                    'numbered' => true,
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'projects-abacus-deep',
        'section' => 'Projects',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'What did Mark contribute to Abacus?',
                'expect' => [
                    'contains' => ['Abacus', 'messaging'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Collaborators ---
    [
        'id' => 'collaborators-abacus-team',
        'section' => 'Collaborators',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Who was on the Abacus team?',
                'expect' => [
                    'contains' => ['Justin Hoffman', 'Angel Mora', 'Jacob DunRoseman', 'Document Manager'],
                    'excludes' => ['Aydan'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Who else was on the team?',
                'expect' => [
                    'contains' => ['Angel Mora'],
                    'excludes' => ['Farzeen Harunani'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'collaborators-aliases',
        'section' => 'Collaborators',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Angel Moran',
                'expect' => [
                    'contains' => ['Angel Mora'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Julian',
                'expect' => [
                    'contains' => ['Julianne'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Aydan',
                'expect' => [
                    'excludes' => ['Abacus team', 'Finch team with Aydan'],
                    'status_in' => ['unavailable', 'answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'collaborators-finch',
        'section' => 'Collaborators',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Who else worked on Finch?',
                'expect' => [
                    'contains' => ['Luis Serrano', 'Xavier Barth', 'Julianne Browne'],
                    'excludes' => ['Farzeen Harunani'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Testimonials ---
    [
        'id' => 'testimonials-overview',
        'section' => 'Testimonials',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'testimonials',
                'expect' => [
                    'contains' => ['Farzeen Harunani', 'Jorge Torres', 'Zack Kohlwey'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'list names',
                'expect' => [
                    'contains' => ['Farzeen Harunani'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'testimonials-to-projects-switch',
        'section' => 'Topic switching',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'testimonials',
                'expect' => [
                    'contains' => ['Farzeen'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Who else worked on Finch?',
                'expect' => [
                    'contains' => ['Luis Serrano'],
                    'excludes' => ['Farzeen Harunani — Professor of Computer Science'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Fitness / interests ---
    [
        'id' => 'fitness-bodybuilding',
        'section' => 'Fitness',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Tell me about Mark’s fitness and bodybuilding.',
                'expect' => [
                    'contains' => ['bodybuilding', 'six years'],
                    'excludes' => ['steroid', 'weight class rankings'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'What are his lifts?',
                'expect' => [
                    'contains' => ['315', '450', '550'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'interests-hobbies-kobe',
        'section' => 'Interests',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "What are Mark’s hobbies?",
                'expect' => [
                    'contains' => ['Kobe', 'photography'],
                    'excludes' => ['running'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Does Mark call Kobe his son?',
                'expect' => [
                    'contains' => ['Kobe', 'son'],
                    'excludes' => ['human child', 'breed'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],
    [
        'id' => 'interests-music-color',
        'section' => 'Interests',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'What music does Mark like?',
                'expect' => [
                    'contains' => ['Drake'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'What is his favorite color?',
                'expect' => [
                    'contains' => ['black'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Privacy ---
    [
        'id' => 'privacy-family-dating',
        'section' => 'Privacy',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "Tell me about Mark’s family",
                'expect' => [
                    'contains' => ['professional and intentionally public'],
                    'status_in' => ['refused'],
                ],
            ],
            [
                'user' => 'Does Mark have a girlfriend?',
                'expect' => [
                    'contains' => ['professional and intentionally public'],
                    'status_in' => ['refused'],
                ],
            ],
            [
                'user' => 'Does Mark have a human son?',
                'expect' => [
                    'contains' => ['professional and intentionally public'],
                    'status_in' => ['refused'],
                ],
            ],
        ],
    ],
    [
        'id' => 'privacy-mixed-batch',
        'section' => 'Privacy',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => "What are Mark’s skills?\nWho is Mark dating?\nWhat projects has he built?",
                'expect' => [
                    'contains' => ['1.', 'React', 'professional and intentionally public', 'Portfolio'],
                    'numbered' => true,
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Typos ---
    [
        'id' => 'typos-goals-collaborators',
        'section' => 'Typos',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'what are mark goels',
                'expect' => [
                    'contains' => ['career', 'technology'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'Jacob Dun Roseman',
                'expect' => [
                    'contains' => ['Repo Manager'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Follow-ups / topic switching ---
    [
        'id' => 'followup-new-chat-list-names',
        'section' => 'Follow-ups',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'list names',
                'expect' => [
                    'excludes' => ['Farzeen Harunani — Professor of Computer Science'],
                    'status_in' => ['answered', 'unavailable'],
                ],
            ],
        ],
    ],
    [
        'id' => 'topic-switch-projects-to-testimonials',
        'section' => 'Topic switching',
        'mode' => 'deterministic',
        'turns' => [
            [
                'user' => 'Who worked on Finch?',
                'expect' => [
                    'contains' => ['Luis Serrano'],
                    'status_in' => ['answered'],
                ],
            ],
            [
                'user' => 'testimonials',
                'expect' => [
                    'contains' => ['Farzeen'],
                    'status_in' => ['answered'],
                ],
            ],
        ],
    ],

    // --- Provider failure ---
    [
        'id' => 'provider-fail-single',
        'section' => 'Provider failure',
        'mode' => 'provider_fail',
        'turns' => [
            [
                'user' => "What are Mark’s goals?",
                'expect' => [
                    'contains' => ['technology'],
                    'fallback_note' => true,
                    'status_in' => ['answered'],
                    'error_code_in' => ['provider_unavailable', 'provider_timeout'],
                ],
            ],
        ],
    ],
    [
        'id' => 'provider-fail-multi',
        'section' => 'Provider failure',
        'mode' => 'provider_fail',
        'turns' => [
            [
                'user' => "What are Mark’s strongest skills?\nWhy should someone hire Mark?",
                'expect' => [
                    'contains' => ['1.', '2.', 'React'],
                    'fallback_note' => true,
                    'numbered' => true,
                    'status_in' => ['answered'],
                    'error_code_in' => ['provider_unavailable', 'provider_timeout'],
                ],
            ],
        ],
    ],

    // --- Rate limits ---
    [
        'id' => 'rate-limit-window-batch',
        'section' => 'Rate limits',
        'mode' => 'rate_limit',
        'turns' => [
            [
                'user' => "What are Mark’s strongest projects?\nWho was on the Abacus team?",
                'expect' => [
                    'contains' => ['1.', 'Abacus'],
                    'limit_note' => true,
                    'status_in' => ['rate_limited'],
                    'error_code_in' => ['session_window_limit'],
                ],
            ],
        ],
    ],
];

$liveSmokePrompts = [
    [
        'id' => 'hello',
        'user' => 'hello',
        'contains' => ['MarkAI', 'projects'],
        'excludes' => ['I may be missing the intended topic', 'from Chicago'],
    ],
    [
        'id' => 'who-is',
        'user' => 'who is mark yoingco',
        'contains' => ['Chicago', 'Marquette', 'Computer Science'],
        'excludes' => ['I may be missing the intended topic', 'girlfriend', 'street address'],
    ],
    [
        'id' => 'hire',
        'user' => 'why should someone hire mark',
        'contains' => ['portfolio', 'senior-design', 'debugging'],
        'excludes' => ['I may be missing the intended topic'],
    ],
    [
        'id' => 'skills-typo',
        'user' => 'what are marks stongest technical skills',
        'contains' => ['React', 'full-stack', 'documentation'],
        'excludes' => ['I may be missing the intended topic'],
    ],
    [
        'id' => 'best-represents-typo',
        'user' => 'which project best rperesnts mark',
        'contains' => ['Portfolio', 'MarkAI', 'Abacus', 'TA-Bot'],
        'excludes' => ['I may be missing the intended topic'],
    ],
    [
        'id' => 'abacas-typo',
        'user' => 'who worked on abacas',
        'contains' => ['Justin Hoffman', 'Jacob DunRoseman', 'Angel Mora', 'Document Manager'],
        'excludes' => ['I may be missing the intended topic', 'Farzeen'],
    ],
    [
        'id' => 'finch',
        'user' => 'who worked on finch',
        'contains' => ['Julianne Browne', 'Luis Serrano', 'Xavier Barth'],
        'excludes' => ['I may be missing the intended topic'],
    ],
    [
        'id' => 'outside-tech-typo',
        'user' => 'what is mark like outside techbnoclogy',
        'contains' => ['bodybuilding', 'photography', 'hiking'],
        'excludes' => ['I may be missing the intended topic', ' running', 'cooking'],
    ],
];

$liveSmokeModes = [
    [
        'mode' => 'deterministic',
        'suffix' => 'deterministic',
        'extra' => [
            'status_in' => ['answered'],
            'error_code_in' => [null],
            'fallback_note' => false,
        ],
    ],
    [
        'mode' => 'provider_fail',
        'suffix' => 'provider-unavailable',
        'extra' => [
            'status_in' => ['answered'],
            'error_code_in' => ['provider_unavailable', 'provider_timeout'],
            'fallback_note' => true,
        ],
    ],
    [
        'mode' => 'session_window_limit',
        'suffix' => 'session-window-limit',
        'extra' => [
            'status_in' => ['rate_limited'],
            'error_code_in' => ['session_window_limit'],
            'limit_note' => true,
        ],
    ],
    [
        'mode' => 'session_daily_limit',
        'suffix' => 'session-daily-limit',
        'extra' => [
            'status_in' => ['daily_limit'],
            'error_code_in' => ['session_daily_limit'],
            'limit_note' => true,
            'user_note_exact' => 'Please try again tomorrow.',
        ],
    ],
    [
        'mode' => 'global_daily_limit',
        'suffix' => 'global-daily-limit',
        'extra' => [
            'status_in' => ['daily_limit'],
            'error_code_in' => ['global_daily_limit'],
            'limit_note' => true,
            'user_note_exact' => 'Please try again tomorrow. Approved portfolio answers may still be available.',
        ],
    ],
];

foreach ($liveSmokeModes as $modeSpec) {
    foreach ($liveSmokePrompts as $prompt) {
        $expect = [
            'contains' => $prompt['contains'],
            'excludes' => array_merge(
                $prompt['excludes'],
                ['Live AI generation is temporarily unavailable']
            ),
            'status_in' => $modeSpec['extra']['status_in'],
            'error_code_in' => $modeSpec['extra']['error_code_in'],
        ];
        if (($modeSpec['extra']['fallback_note'] ?? false) === true) {
            $expect['fallback_note'] = true;
            // Fallback note is asserted separately; remove from excludes.
            $expect['excludes'] = $prompt['excludes'];
        }
        if (($modeSpec['extra']['limit_note'] ?? false) === true) {
            $expect['limit_note'] = true;
            if (isset($modeSpec['extra']['user_note_exact'])) {
                $expect['user_note_exact'] = $modeSpec['extra']['user_note_exact'];
            }
        }

        $scenarios[] = [
            'id' => 'live-smoke-' . $prompt['id'] . '-' . $modeSpec['suffix'],
            'section' => 'Live smoke transcript',
            'mode' => $modeSpec['mode'],
            'turns' => [
                [
                    'user' => $prompt['user'],
                    'expect' => $expect,
                ],
            ],
        ];
    }
}

return $scenarios;
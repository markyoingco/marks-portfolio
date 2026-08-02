<?php

declare(strict_types=1);

/**
 * Multi-question detection and combined deterministic answer formatting.
 *
 * Splits one visitor message into distinct questions so MarkAI does not let a
 * single dominant intent swallow the rest of the batch.
 */

const MARKAI_MAX_QUESTIONS_PER_MESSAGE = 10;

/**
 * @return array{
 *   questions: list<string>,
 *   displayQuestions: list<string>,
 *   greetingLead: bool,
 *   greetingOnly: bool,
 *   truncated: bool,
 *   totalDetected: int
 * }
 */
function markai_split_visitor_questions(string $rawMessage): array
{
    $raw = str_replace(["\r\n", "\r"], "\n", $rawMessage);
    $raw = trim($raw);
    if ($raw === '') {
        return [
            'questions' => [],
            'displayQuestions' => [],
            'greetingLead' => false,
            'greetingOnly' => false,
            'truncated' => false,
            'totalDetected' => 0,
        ];
    }

    $chunks = preg_split("/\n+/u", $raw) ?: [$raw];
    $parts = [];
    foreach ($chunks as $chunk) {
        $chunk = trim((string) $chunk);
        if ($chunk === '') {
            continue;
        }
        // Numbered / bulleted lines become separate parts.
        if (preg_match('/^(?:\d+[\.\)]\s+|[-*•]\s+)/u', $chunk) === 1) {
            $parts[] = preg_replace('/^(?:\d+[\.\)]\s+|[-*•]\s+)/u', '', $chunk) ?? $chunk;
            continue;
        }
        // Multiple question marks on one line → split into distinct questions.
        if (substr_count($chunk, '?') >= 2) {
            $pieces = preg_split('/(?<=\?)\s+/u', $chunk) ?: [$chunk];
            foreach ($pieces as $piece) {
                $piece = trim((string) $piece);
                if ($piece !== '') {
                    $parts[] = $piece;
                }
            }
            continue;
        }
        $parts[] = $chunk;
    }

    // If still a single blob with several sentence-ending questions, split lightly.
    if (count($parts) === 1 && substr_count($parts[0], '?') >= 2) {
        $pieces = preg_split('/(?<=\?)\s+/u', $parts[0]) ?: $parts;
        $parts = [];
        foreach ($pieces as $piece) {
            $piece = trim((string) $piece);
            if ($piece !== '') {
                $parts[] = $piece;
            }
        }
    }

    $greetingLead = false;
    $questions = [];
    $displayQuestions = [];
    foreach ($parts as $index => $part) {
        $normalized = markai_normalize_greeting_candidate($part);
        if (markai_is_greeting_phrase($normalized)) {
            if ($index === 0 || $questions === []) {
                $greetingLead = true;
            }
            continue;
        }
        $clean = trim($part);
        $clean = preg_replace('/^(?:\d+[\.\)]\s+|[-*•]\s+)/u', '', $clean) ?? $clean;
        $clean = trim($clean);
        if ($clean === '') {
            continue;
        }
        $questions[] = $clean;
        $displayQuestions[] = markai_format_question_heading($clean);
    }

    $totalDetected = count($questions);
    $truncated = false;
    if ($totalDetected > MARKAI_MAX_QUESTIONS_PER_MESSAGE) {
        $questions = array_slice($questions, 0, MARKAI_MAX_QUESTIONS_PER_MESSAGE);
        $displayQuestions = array_slice($displayQuestions, 0, MARKAI_MAX_QUESTIONS_PER_MESSAGE);
        $truncated = true;
    }

    $greetingOnly = $greetingLead && $questions === [];

    return [
        'questions' => $questions,
        'displayQuestions' => $displayQuestions,
        'greetingLead' => $greetingLead,
        'greetingOnly' => $greetingOnly,
        'truncated' => $truncated,
        'totalDetected' => $totalDetected,
    ];
}

function markai_normalize_greeting_candidate(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[!.,]+$/u', '', $text) ?? $text;

    return trim($text);
}

function markai_is_greeting_phrase(string $normalized): bool
{
    $normalized = markai_normalize_greeting_candidate($normalized);
    $allowed = [
        'hello',
        'hi',
        'hey',
        'hiya',
        'howdy',
        'good morning',
        'good afternoon',
        'good evening',
        'hello there',
        'hi there',
        'hey there',
    ];

    return in_array($normalized, $allowed, true);
}

function markai_format_question_heading(string $question): string
{
    $q = trim($question);
    $q = preg_replace('/\s+/u', ' ', $q) ?? $q;
    if ($q === '') {
        return 'Question';
    }
    // Capitalize first letter for display without rewriting the whole string.
    if (function_exists('mb_substr') && function_exists('mb_strtoupper')) {
        $first = mb_strtoupper(mb_substr($q, 0, 1));
        $rest = mb_substr($q, 1);
        $q = $first . $rest;
    } else {
        $q = strtoupper(substr($q, 0, 1)) . substr($q, 1);
    }
    if (!str_ends_with($q, '?') && !str_ends_with($q, '.')) {
        // Keep imperative prompts without forcing a question mark.
        if (preg_match('/^(who|what|why|how|when|where|which|is|are|can|does|do|did|tell|give|describe|list)\b/i', $q) === 1) {
            $q .= '?';
        }
    }

    return $q;
}

/**
 * @param list<array{question: string, answer: string, category: string, answerStatus: string}> $parts
 */
function markai_format_multi_question_answer(array $parts, bool $greetingLead = false, bool $truncated = false): string
{
    $blocks = [];
    if ($greetingLead) {
        $blocks[] = 'Hi — here are direct answers to your questions:';
    }

    $index = 1;
    foreach ($parts as $part) {
        $question = trim((string) ($part['question'] ?? 'Question'));
        $answer = trim((string) ($part['answer'] ?? ''));
        if ($answer === '') {
            $answer = 'I may be missing the intended topic. You can ask about Mark’s projects, skills, experience, goals, interests, collaborators, résumé, or public links.';
        }
        $blocks[] = $index . '. ' . $question . "\n" . $answer;
        $index++;
    }

    if ($truncated) {
        $blocks[] = 'I answered the first ' . MARKAI_MAX_QUESTIONS_PER_MESSAGE
            . ' questions in this message. Please send the remaining questions in a follow-up.';
    }

    return implode("\n\n", $blocks);
}

/**
 * Build a short summary from a prior assistant answer, or a compact profile fallback.
 */
function markai_build_shorter_summary(?string $priorAssistantAnswer, string $fallbackSummary): string
{
    $prior = trim((string) $priorAssistantAnswer);
    if ($prior === '') {
        return $fallbackSummary;
    }

    // Prefer the first 1–2 sentences of the prior answer.
    $normalized = preg_replace('/\s+/u', ' ', $prior) ?? $prior;
    if (preg_match('/^(.+?[.!?])(?:\s+.+?[.!?])?/', $normalized, $matches) === 1) {
        $summary = trim((string) $matches[0]);
        if (strlen($summary) >= 40) {
            return $summary;
        }
    }

    if (strlen($normalized) > 280) {
        return rtrim(substr($normalized, 0, 277)) . '...';
    }

    return $normalized !== '' ? $normalized : $fallbackSummary;
}

/**
 * @param list<array{role: string, content: string}> $history
 */
function markai_last_assistant_answer(array $history): ?string
{
    for ($i = count($history) - 1; $i >= 0; $i--) {
        $turn = $history[$i] ?? null;
        if (!is_array($turn)) {
            continue;
        }
        if (($turn['role'] ?? '') !== 'assistant') {
            continue;
        }
        $content = trim((string) ($turn['content'] ?? ''));
        if ($content !== '') {
            return $content;
        }
    }

    return null;
}

if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool
    {
        if ($needle === '') {
            return true;
        }

        return substr($haystack, -strlen($needle)) === $needle;
    }
}

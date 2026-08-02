/**
 * Multi-question detection helpers mirrored from MultiQuestionService.php.
 */

export const MARKAI_MAX_QUESTIONS_PER_MESSAGE = 10

export function normalizeGreetingCandidate(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[!.,]+$/g, '')
    .trim()
}

export function isGreetingPhrase(text) {
  const normalized = normalizeGreetingCandidate(text)
  return [
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
  ].includes(normalized)
}

export function formatQuestionHeading(question) {
  let q = String(question || '').trim().replace(/\s+/g, ' ')
  if (!q) return 'Question'
  q = q.charAt(0).toUpperCase() + q.slice(1)
  if (!/[?.]$/.test(q)) {
    if (/^(who|what|why|how|when|where|which|is|are|can|does|do|did|tell|give|describe|list)\b/i.test(q)) {
      q += '?'
    }
  }
  return q
}

export function splitVisitorQuestions(rawMessage) {
  const raw = String(rawMessage || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
  if (!raw) {
    return {
      questions: [],
      displayQuestions: [],
      greetingLead: false,
      greetingOnly: false,
      truncated: false,
      totalDetected: 0,
    }
  }

  const chunks = raw.split(/\n+/).map((c) => c.trim()).filter(Boolean)
  let parts = []
  for (const chunk of chunks) {
    if (/^(?:\d+[\.\)]\s+|[-*•]\s+)/u.test(chunk)) {
      parts.push(chunk.replace(/^(?:\d+[\.\)]\s+|[-*•]\s+)/u, ''))
      continue
    }
    if ((chunk.match(/\?/g) || []).length >= 2) {
      parts.push(
        ...chunk
          .split(/(?<=\?)\s+/u)
          .map((p) => p.trim())
          .filter(Boolean)
      )
      continue
    }
    parts.push(chunk)
  }

  if (parts.length === 1 && (parts[0].match(/\?/g) || []).length >= 2) {
    parts = parts[0]
      .split(/(?<=\?)\s+/u)
      .map((p) => p.trim())
      .filter(Boolean)
  }

  let greetingLead = false
  const questions = []
  const displayQuestions = []
  parts.forEach((part, index) => {
    const normalized = normalizeGreetingCandidate(part)
    if (isGreetingPhrase(normalized)) {
      if (index === 0 || questions.length === 0) greetingLead = true
      return
    }
    const clean = part.replace(/^(?:\d+[\.\)]\s+|[-*•]\s+)/u, '').trim()
    if (!clean) return
    questions.push(clean)
    displayQuestions.push(formatQuestionHeading(clean))
  })

  const totalDetected = questions.length
  let truncated = false
  let limitedQuestions = questions
  let limitedDisplay = displayQuestions
  if (totalDetected > MARKAI_MAX_QUESTIONS_PER_MESSAGE) {
    limitedQuestions = questions.slice(0, MARKAI_MAX_QUESTIONS_PER_MESSAGE)
    limitedDisplay = displayQuestions.slice(0, MARKAI_MAX_QUESTIONS_PER_MESSAGE)
    truncated = true
  }

  return {
    questions: limitedQuestions,
    displayQuestions: limitedDisplay,
    greetingLead,
    greetingOnly: greetingLead && limitedQuestions.length === 0,
    truncated,
    totalDetected,
  }
}

export function formatMultiQuestionAnswer(parts, greetingLead = false, truncated = false) {
  const blocks = []
  if (greetingLead) {
    blocks.push('Hi — here are direct answers to your questions:')
  }
  parts.forEach((part, index) => {
    const question = String(part.question || 'Question').trim()
    const answer =
      String(part.answer || '').trim() ||
      'I may be missing the intended topic. You can ask about Mark’s projects, skills, experience, goals, interests, collaborators, résumé, or public links.'
    blocks.push(`${index + 1}. ${question}\n${answer}`)
  })
  if (truncated) {
    blocks.push(
      `I answered the first ${MARKAI_MAX_QUESTIONS_PER_MESSAGE} questions in this message. Please send the remaining questions in a follow-up.`
    )
  }
  return blocks.join('\n\n')
}

export function buildShorterSummary(priorAssistantAnswer, fallbackSummary) {
  const prior = String(priorAssistantAnswer || '').trim()
  if (!prior) return fallbackSummary
  const normalized = prior.replace(/\s+/g, ' ')
  const match = normalized.match(/^(.+?[.!?])(?:\s+.+?[.!?])?/)
  if (match && match[0].trim().length >= 40) return match[0].trim()
  if (normalized.length > 280) return `${normalized.slice(0, 277).trim()}...`
  return normalized || fallbackSummary
}

export function lastAssistantAnswer(history = []) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i]
    if (!turn || turn.role !== 'assistant') continue
    const content = String(turn.content || '').trim()
    if (content) return content
  }
  return null
}

import { getMockMarkAiResponse } from './markaiMock'

const MARKAI_ENDPOINT = '/api/markai.php'
const REQUEST_TIMEOUT_MS = 8000

const ALLOWED_MODES = new Set(['recruiter', 'technical', 'general', 'casual'])
const ALLOWED_ANSWER_STATUSES = new Set([
  'answered',
  'refused',
  'unavailable',
  'error',
])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSafeHttpUrl(href) {
  return typeof href === 'string' && /^https?:\/\//i.test(href.trim())
}

function sanitizeLinks(links) {
  if (!Array.isArray(links)) {
    return []
  }

  const sanitized = []
  for (const link of links) {
    if (!isPlainObject(link)) {
      continue
    }
    if (typeof link.id !== 'string' || link.id.trim() === '') {
      continue
    }
    if (typeof link.label !== 'string' || link.label.trim() === '') {
      continue
    }
    if (!isSafeHttpUrl(link.href)) {
      continue
    }
    sanitized.push({
      id: link.id,
      label: link.label,
      href: link.href.trim(),
      external: link.external === true,
      opensNewTab: link.opensNewTab === true,
    })
  }
  return sanitized
}

function validateServerPayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error('Invalid MarkAI response.')
  }
  if (typeof payload.success !== 'boolean') {
    throw new Error('Invalid MarkAI response.')
  }
  if (typeof payload.answer !== 'string') {
    throw new Error('Invalid MarkAI response.')
  }
  if (
    typeof payload.answerStatus !== 'string' ||
    !ALLOWED_ANSWER_STATUSES.has(payload.answerStatus)
  ) {
    throw new Error('Invalid MarkAI response.')
  }
  if (typeof payload.mode !== 'string' || !ALLOWED_MODES.has(payload.mode)) {
    throw new Error('Invalid MarkAI response.')
  }
  if (!Array.isArray(payload.links)) {
    throw new Error('Invalid MarkAI response.')
  }
  if (!(payload.error === null || isPlainObject(payload.error))) {
    throw new Error('Invalid MarkAI response.')
  }

  return {
    success: payload.success,
    answer: payload.answer,
    answerStatus: payload.answerStatus,
    links: sanitizeLinks(payload.links),
    mode: payload.mode,
    conversationId:
      typeof payload.conversationId === 'string' ? payload.conversationId : 'preview',
    preview: payload.preview === true,
    error: payload.error,
    transport: 'server-preview',
  }
}

function shouldUseLocalFallback(status, contentType, bodyText) {
  if (status === 404 || status === 501 || status === 503) {
    return true
  }
  const type = String(contentType || '').toLowerCase()
  if (type.includes('text/html')) {
    return true
  }
  if (bodyText && /^\s*</.test(bodyText)) {
    return true
  }
  return false
}

/**
 * Request a MarkAI response from the PHP endpoint,
 * with a single local mock fallback when the endpoint is unavailable.
 *
 * @param {{
 *   question: string,
 *   history?: Array<{ role: string, content: string }>,
 *   mode?: string,
 *   signal?: AbortSignal
 * }} options
 */
export async function requestMarkAiResponse({
  question,
  history = [],
  mode = 'general',
  signal,
} = {}) {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    let response
    try {
      response = await fetch(MARKAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
          mode,
        }),
        signal: controller.signal,
        credentials: 'same-origin',
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        if (signal?.aborted) {
          throw error
        }
        // Timeout or network abort without caller abort → local fallback.
        const local = await getMockMarkAiResponse(question, { signal })
        return { ...local, transport: 'local-preview' }
      }
      const local = await getMockMarkAiResponse(question, { signal })
      return { ...local, transport: 'local-preview' }
    }

    const contentType = response.headers.get('content-type') || ''
    const bodyText = await response.text()

    if (shouldUseLocalFallback(response.status, contentType, bodyText)) {
      const local = await getMockMarkAiResponse(question, { signal })
      return { ...local, transport: 'local-preview' }
    }

    if (response.status === 400 || response.status === 413 || response.status === 422) {
      throw new Error('MarkAI request was rejected.')
    }

    let parsed
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      const local = await getMockMarkAiResponse(question, { signal })
      return { ...local, transport: 'local-preview' }
    }

    if (response.ok) {
      return validateServerPayload(parsed)
    }

    if (parsed && parsed.success === false) {
      throw new Error('MarkAI request failed.')
    }

    throw new Error('MarkAI request failed.')
  } finally {
    clearTimeout(timeoutId)
    if (signal) {
      signal.removeEventListener('abort', onAbort)
    }
  }
}

import { useEffect, useId, useRef, useState } from 'react'
import { requestMarkAiResponse } from './markaiApi'
import './markai.css'

const MAX_QUESTION_CHARS = 2000
const CHAR_COUNT_VISIBLE_AT = 1600
const MAX_HISTORY_MESSAGES = 10
const INITIAL_GREETING =
  'Ask about Mark’s projects, experience, skills, interests, goals, or background.'
const MARKAI_FOOTNOTE =
  'Answers are grounded in Mark’s approved portfolio information.'
const ERROR_MESSAGE = 'Something went wrong. Please try again.'

function createGreetingMessage(id) {
  return {
    id,
    role: 'assistant',
    content: INITIAL_GREETING,
    status: 'complete',
    links: [],
    note: null,
  }
}

function resolveAssistantPresentation(response) {
  const userMessage =
    typeof response?.userMessage === 'string' && response.userMessage.trim() !== ''
      ? response.userMessage.trim()
      : null
  const userNote =
    typeof response?.userNote === 'string' && response.userNote.trim() !== ''
      ? response.userNote.trim()
      : null
  const answer =
    typeof response?.answer === 'string' && response.answer.trim() !== ''
      ? response.answer
      : null

  if (response?.success === true && answer) {
    return {
      content: answer,
      note: userNote,
      status: 'complete',
      links: Array.isArray(response.links) ? response.links : [],
      failed: false,
    }
  }

  if (response?.success === false) {
    return {
      content: answer || userMessage || ERROR_MESSAGE,
      note: userNote,
      status: 'error',
      links: [],
      failed: true,
    }
  }

  return {
    content: ERROR_MESSAGE,
    note: null,
    status: 'error',
    links: [],
    failed: true,
  }
}

function buildHistoryPayload(messages) {
  const completed = []
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue
    }
    if (message.status !== 'complete') {
      continue
    }
    if (typeof message.content !== 'string' || message.content.trim() === '') {
      continue
    }
    completed.push({
      role: message.role,
      content: message.content.trim(),
    })
  }
  if (completed.length > MAX_HISTORY_MESSAGES) {
    return completed.slice(-MAX_HISTORY_MESSAGES)
  }
  return completed
}

function isSafeHttpUrl(href) {
  if (typeof href !== 'string') {
    return false
  }
  const trimmed = href.trim()
  return /^https?:\/\//i.test(trimmed)
}

function MarkAiLinks({ links }) {
  if (!Array.isArray(links) || links.length === 0) {
    return null
  }

  const safeLinks = links.filter(
    (link) =>
      link &&
      typeof link === 'object' &&
      typeof link.id === 'string' &&
      typeof link.label === 'string' &&
      isSafeHttpUrl(link.href),
  )

  if (safeLinks.length === 0) {
    return null
  }

  return (
    <ul className="markai-preview__links">
      {safeLinks.map((link) => {
        const external = link.external === true
        const opensNewTab = link.opensNewTab === true || external
        return (
          <li key={link.id}>
            <a
              className="markai-preview__link"
              href={link.href.trim()}
              {...(opensNewTab
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {link.label}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Interactive MarkAI chat.
 * Conversation is component-local only; remount / mode switch resets state.
 * Session persistence is intentionally deferred to a later phase.
 */
export default function MarkAIChat() {
  const inputId = useId()
  const statusId = useId()
  const disclosureId = useId()
  const idCounterRef = useRef(1)
  const requestTokenRef = useRef(0)
  const abortControllerRef = useRef(null)
  const inputRef = useRef(null)
  const conversationRef = useRef(null)
  const conversationEndRef = useRef(null)
  const isMountedRef = useRef(true)

  const nextId = () => {
    const id = `msg-${idCounterRef.current}`
    idCounterRef.current += 1
    return id
  }

  const [messages, setMessages] = useState(() => [createGreetingMessage('msg-0')])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const trimmedInput = inputValue.trim()
  const canSubmit = trimmedInput.length > 0 && !isLoading
  const showCharCount = inputValue.length >= CHAR_COUNT_VISIBLE_AT
  const hasConversation =
    messages.some((message) => message.role === 'user') ||
    messages.some((message) => message.status === 'loading' || message.status === 'error')
  const isEmptyState = !hasConversation

  const focusComposer = () => {
    requestAnimationFrame(() => {
      const node = inputRef.current
      if (!node || !isMountedRef.current) {
        return
      }
      try {
        node.focus({ preventScroll: true })
      } catch {
        node.focus()
      }
    })
  }

  const shouldRestoreComposerFocus = () => {
    if (typeof document === 'undefined') {
      return false
    }
    const active = document.activeElement
    if (!active || active === document.body) {
      return true
    }
    if (active === inputRef.current) {
      return true
    }
    return (
      active instanceof HTMLElement &&
      active.classList.contains('markai-preview__send')
    )
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      requestTokenRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isEmptyState) {
      if (conversationRef.current) {
        conversationRef.current.scrollTop = 0
      }
      return
    }
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    conversationEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [messages, errorText, isLoading, isEmptyState])

  const submitQuestion = async (rawQuestion) => {
    const question = String(rawQuestion || '').trim()
    if (!question || isLoading) {
      return
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return
    }

    const historyPayload = buildHistoryPayload(messages)

    const userId = nextId()
    const loadingId = nextId()
    const requestToken = requestTokenRef.current + 1
    requestTokenRef.current = requestToken
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setErrorText('')
    setInputValue('')
    setIsLoading(true)
    setMessages((prev) => [
      ...prev,
      {
        id: userId,
        role: 'user',
        content: question,
        status: 'complete',
        links: [],
        note: null,
      },
      {
        id: loadingId,
        role: 'assistant',
        content: 'MarkAI is responding…',
        status: 'loading',
        links: [],
        note: null,
      },
    ])
    focusComposer()

    try {
      const response = await requestMarkAiResponse({
        question,
        history: historyPayload,
        mode: 'general',
        signal: abortController.signal,
      })
      if (!isMountedRef.current || requestToken !== requestTokenRef.current) {
        return
      }

      const presentation = resolveAssistantPresentation(response)

      setMessages((prev) =>
        prev.map((message) =>
          message.id === loadingId
            ? {
                id: loadingId,
                role: 'assistant',
                content: presentation.content,
                status: presentation.status,
                links: presentation.links,
                note: presentation.note,
              }
            : message,
        ),
      )
      if (presentation.failed) {
        setErrorText(presentation.content)
      }
    } catch (error) {
      if (
        !isMountedRef.current ||
        requestToken !== requestTokenRef.current ||
        error?.name === 'AbortError'
      ) {
        return
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === loadingId
            ? {
                id: loadingId,
                role: 'assistant',
                content: ERROR_MESSAGE,
                status: 'error',
                links: [],
                note: null,
              }
            : message,
        ),
      )
      setErrorText(ERROR_MESSAGE)
    } finally {
      if (isMountedRef.current && requestToken === requestTokenRef.current) {
        setIsLoading(false)
        if (shouldRestoreComposerFocus()) {
          focusComposer()
        }
      }
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    void submitQuestion(inputValue)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSubmit) {
        void submitQuestion(inputValue)
      }
    }
  }

  const handleNewChat = () => {
    requestTokenRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    idCounterRef.current = 1
    setIsLoading(false)
    setErrorText('')
    setInputValue('')
    setMessages([createGreetingMessage('msg-0')])
    if (conversationRef.current) {
      conversationRef.current.scrollTop = 0
    }
    focusComposer()
  }

  const statusMessage = errorText
    ? errorText
    : isLoading
      ? 'MarkAI is responding…'
      : showCharCount
        ? `${inputValue.length}/${MAX_QUESTION_CHARS}`
        : ''

  return (
    <section
      className={[
        'markai-card',
        'markai-preview',
        isEmptyState ? 'markai-preview--empty' : 'markai-preview--active',
      ].join(' ')}
      aria-labelledby="markai-preview-title"
    >
      <header className="markai-preview__header">
        <div className="markai-preview__brand">
          <h2 id="markai-preview-title" className="markai-preview__title">
            MarkAI
          </h2>
        </div>
        <button
          type="button"
          className="markai-preview__new-chat"
          onClick={handleNewChat}
        >
          New Chat
        </button>
      </header>

      <div
        ref={conversationRef}
        className="markai-preview__conversation"
        role="log"
        aria-label="MarkAI conversation"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={isLoading}
      >
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const isLoadingMessage = message.status === 'loading'
          return (
            <article
              key={message.id}
              className={[
                'markai-preview__message',
                isUser ? 'markai-preview__message--user' : 'markai-preview__message--assistant',
                isLoadingMessage ? 'markai-preview__message--loading' : '',
                message.status === 'error' ? 'markai-preview__message--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {!isUser ? (
                <span className="markai-preview__message-label" aria-hidden="true">
                  MarkAI
                </span>
              ) : null}
              <span className="markai-preview__sr-only">
                {isUser ? 'You' : 'MarkAI'}
              </span>
              {isLoadingMessage ? (
                <p className="markai-preview__loading" role="status">
                  <span className="markai-preview__loading-text">MarkAI is responding…</span>
                  <span className="markai-preview__loading-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </p>
              ) : (
                <>
                  <p className="markai-preview__message-text">{message.content}</p>
                  {!isUser &&
                  typeof message.note === 'string' &&
                  message.note.trim() !== '' ? (
                    <p className="markai-preview__message-note" role="note">
                      {message.note}
                    </p>
                  ) : null}
                </>
              )}
              {!isUser && message.status === 'complete' ? (
                <MarkAiLinks links={message.links} />
              ) : null}
            </article>
          )
        })}
        <div ref={conversationEndRef} />
      </div>

      <footer className="markai-preview__composer">
        <form className="markai-preview__form" onSubmit={handleSubmit}>
          <label className="markai-preview__sr-only" htmlFor={inputId}>
            Ask MarkAI
          </label>
          <div className="markai-preview__input-shell">
            <textarea
              id={inputId}
              ref={inputRef}
              className="markai-preview__textarea"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value.slice(0, MAX_QUESTION_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="Ask MarkAI anything..."
              maxLength={MAX_QUESTION_CHARS}
              rows={1}
              aria-busy={isLoading}
              aria-describedby={`${disclosureId} ${statusId}`}
            />
            <button
              type="submit"
              className={[
                'markai-preview__send',
                canSubmit ? 'markai-preview__send--ready' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
            >
              Send
            </button>
          </div>
          <div id={statusId} className="markai-preview__status" role="status" aria-live="polite">
            {statusMessage}
          </div>
        </form>
        <p id={disclosureId} className="markai-preview__footnote">
          * {MARKAI_FOOTNOTE}
        </p>
      </footer>
    </section>
  )
}

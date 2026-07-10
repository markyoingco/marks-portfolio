import { useEffect, useRef, useState } from 'react'
import './TerminalLanding.css'

const PROMPT = 'PS C:\\Users\\visitor> '

const COMMAND_OPTIONS = [
  'cd webpage',
  'cd terminal',
  'cd my ai',
  'cd ..',
  'back',
]

const LS_LINES = [
  'webpage',
  'terminal',
  'my-ai',
  '',
  'Use cd webpage, cd terminal, or cd my ai to continue.',
]

const AI_PREVIEW_LINES = ['Ask Mark AI coming soon.']
const TERMINAL_PREVIEW_LINES = ['Terminal portfolio coming soon.']

const VIEWS = {
  LANDING: 'landing',
  HELP: 'help',
  TERMINAL_PREVIEW: 'terminal-preview',
  AI_PREVIEW: 'ai-preview',
}

function parseCommand(rawInput) {
  const input = rawInput.trim()
  const lower = input.toLowerCase()

  if (input === '') {
    return { type: 'noop' }
  }

  if (lower === '?' || lower === 'help') {
    return { type: 'showHelp' }
  }

  if (lower === 'ls') {
    return { type: 'output', lines: LS_LINES }
  }

  if (lower === 'back') {
    return { type: 'goBack' }
  }

  if (lower === 'home') {
    return { type: 'goHome' }
  }

  if (lower.startsWith('cd ')) {
    const target = lower.slice(3).trim()

    if (target === 'webpage') {
      return { type: 'navigate', route: 'webpage' }
    }

    if (target === 'terminal') {
      return {
        type: 'showPreview',
        view: VIEWS.TERMINAL_PREVIEW,
        lines: TERMINAL_PREVIEW_LINES,
      }
    }

    if (target === 'my ai' || target === 'ai') {
      return {
        type: 'showPreview',
        view: VIEWS.AI_PREVIEW,
        lines: AI_PREVIEW_LINES,
      }
    }

    if (target === '..') {
      return { type: 'goBack' }
    }

    if (target === '/') {
      return { type: 'goHome' }
    }

    if (target === '.') {
      return { type: 'output', lines: ['Already in the current directory.'] }
    }

    return {
      type: 'output',
      lines: [`cd : Cannot find path '${input.slice(3).trim()}' because it does not exist.`],
    }
  }

  const command = input.split(/\s+/)[0]
  return {
    type: 'output',
    lines: [`'${command}' is not recognized as a command.`],
  }
}

function TerminalLanding({ onEnterWebpage }) {
  const [view, setView] = useState(VIEWS.LANDING)
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [inputHistory, setInputHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalBodyRef = useRef(null)
  const inputRef = useRef(null)

  const helpOpen = view === VIEWS.HELP

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight
    }
  }, [history])

  useEffect(() => {
    inputRef.current?.focus()
  }, [view])

  const goBack = () => {
    if (view === VIEWS.HELP) {
      setView(VIEWS.LANDING)
      return
    }

    if (view === VIEWS.TERMINAL_PREVIEW || view === VIEWS.AI_PREVIEW) {
      setView(VIEWS.LANDING)
      return
    }

    setView(VIEWS.LANDING)
  }

  const goHome = () => {
    setView(VIEWS.LANDING)
    setHistory([])
  }

  const appendEntry = (entryInput, output = []) => {
    setHistory((current) => [...current, { input: entryInput, output }])
  }

  const runCommand = (rawInput, { recordHistory = false } = {}) => {
    const trimmed = rawInput.trimEnd()
    const result = parseCommand(trimmed)

    if (recordHistory && trimmed !== '') {
      setInputHistory((current) => [...current, trimmed])
      setHistoryIndex(-1)
    }

    if (result.type === 'noop') {
      appendEntry(trimmed)
      return
    }

    if (result.type === 'showHelp') {
      appendEntry(trimmed)
      setView(VIEWS.HELP)
      return
    }

    if (result.type === 'goBack') {
      appendEntry(trimmed)
      goBack()
      return
    }

    if (result.type === 'goHome') {
      appendEntry(trimmed)
      goHome()
      return
    }

    if (result.type === 'navigate') {
      appendEntry(trimmed, ['Opening portfolio website...'])
      onEnterWebpage()
      return
    }

    if (result.type === 'showPreview') {
      setView(result.view)
      appendEntry(trimmed, result.lines ?? [])
      return
    }

    appendEntry(trimmed, result.lines ?? [])
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    runCommand(input, { recordHistory: true })
    setInput('')
  }

  const handleChipClick = (command) => {
    runCommand(command, { recordHistory: true })
  }

  const handleHelpClick = (event) => {
    event.stopPropagation()
    setView(VIEWS.HELP)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (inputHistory.length === 0) return

      const nextIndex =
        historyIndex === -1
          ? inputHistory.length - 1
          : Math.max(0, historyIndex - 1)

      setHistoryIndex(nextIndex)
      setInput(inputHistory[nextIndex])
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (inputHistory.length === 0 || historyIndex === -1) return

      const nextIndex = historyIndex + 1
      if (nextIndex >= inputHistory.length) {
        setHistoryIndex(-1)
        setInput('')
        return
      }

      setHistoryIndex(nextIndex)
      setInput(inputHistory[nextIndex])
    }
  }

  return (
    <div className="terminal-shell" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-card">
        <header className="terminal-card__titlebar">
          <div className="terminal-card__dots" aria-hidden="true">
            <span className="terminal-card__dot" />
            <span className="terminal-card__dot" />
            <span className="terminal-card__dot" />
          </div>
          <span className="terminal-card__label">Mark Yoingco&apos;s Portfolio Terminal</span>
        </header>

        <div className="terminal-card__body">
          <div className="terminal-scroll" ref={terminalBodyRef}>
            {history.map((entry, index) => (
              <div key={`${index}-${entry.input}-${entry.output.join('|')}`} className="terminal-entry">
                <div className="terminal-history-line">
                  <span className="terminal-prompt">{PROMPT}</span>
                  <span className="terminal-command-text">{entry.input}</span>
                </div>
                {entry.output.map((line) => (
                  <div key={line} className="terminal-output__line terminal-output__line--muted">
                    {line}
                  </div>
                ))}
              </div>
            ))}

            <form className="terminal-input-row" onSubmit={handleSubmit}>
              <span className="terminal-prompt">{PROMPT}</span>
              <input
                id="terminal-input"
                ref={inputRef}
                className="terminal-input"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                style={{ width: `${Math.max(input.length, 1)}ch` }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Terminal command input"
              />
              <span className="terminal-cursor" aria-hidden="true" />
            </form>
          </div>

          <footer
            className="terminal-footer"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="terminal-hint">
              Click ? or type ? for help. Type ls to view folders.
            </p>

            <div className="terminal-actions">
              {helpOpen ? (
                <div className="terminal-chip-list" role="list">
                  {COMMAND_OPTIONS.map((command) => (
                    <button
                      key={command}
                      type="button"
                      className="terminal-chip"
                      role="listitem"
                      onClick={() => handleChipClick(command)}
                    >
                      {command}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="terminal-chip terminal-chip--help"
                  aria-label="Show available commands"
                  onClick={handleHelpClick}
                >
                  ?
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default TerminalLanding

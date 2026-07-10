import { useEffect, useRef, useState } from 'react'
import {
  getTerminalCategoryPlaceholderLines,
  MARKAI_CD_TARGETS,
  TERMINAL_CATEGORY_SLUGS,
  TERMINAL_HELP_COMMANDS,
  TERMINAL_HELP_MODE_NOTE,
} from './terminalPortfolioData'
import './TerminalLanding.css'
const MODES = {
  LANDING: 'landing',
  HELP: 'help',
  TERMINAL_PORTFOLIO: 'terminal-portfolio',
}

const LANDING_LS_LINES = ['webpage', 'terminal', 'markgpt']

const LANDING_COMMAND_OPTIONS = [
  'cd webpage',
  'cd markgpt',
  'cd terminal',
  'cd main',
  'ls',
  'back',
]

const TERMINAL_ENTER_LINES = ["You're already in the terminal lol."]

const TERMINAL_TIP =
  'Tip: type cd webpage or cd markai to switch modes.'

function getPrompt(mode, portfolioPath) {
  if (mode === MODES.TERMINAL_PORTFOLIO) {
    const base = 'PS C:\\Users\\visitor\\terminal'
    if (portfolioPath.length === 0) {
      return `${base}> `
    }
    return `${base}\\${portfolioPath.join('\\')}> `
  }

  return 'PS C:\\Users\\visitor> '
}

function getTerminalPortfolioLsLines(portfolioPath) {
  if (portfolioPath.length === 0) {
    return TERMINAL_CATEGORY_SLUGS
  }

  return ['No folders here.']
}

function getContextHint(mode, portfolioPath, history) {
  if (mode === MODES.TERMINAL_PORTFOLIO) {
    if (portfolioPath.length > 0) {
      return '# Type cd .. to return to root. Type help for commands.'
    }
    return '# Type ls to browse categories. Click Help or type help for commands.'
  }

  const lastEntry = history[history.length - 1]
  if (lastEntry?.input.trim().toLowerCase() === 'ls') {
    return '# Use cd webpage, cd markgpt, or cd terminal.'
  }

  return '# Click the ? button or type ? then press Enter for commands. Type ls to view portfolio folders.'
}

function parseCommand(rawInput, { mode, portfolioPath }) {
  const input = rawInput.trim()
  const lower = input.toLowerCase()

  if (input === '') {
    return { type: 'noop' }
  }

  if (lower === '?' || lower === 'help') {
    if (mode === MODES.TERMINAL_PORTFOLIO) {
      return { type: 'toggleTerminalHelp' }
    }
    return { type: 'showHelp' }
  }

  if (lower === 'clear') {
    if (mode === MODES.TERMINAL_PORTFOLIO) {
      return { type: 'clearOutput' }
    }
    return { type: 'output', lines: ['Terminal cleared.'] }
  }

  if (lower === 'ls') {
    if (mode === MODES.TERMINAL_PORTFOLIO) {
      return { type: 'output', lines: getTerminalPortfolioLsLines(portfolioPath) }
    }
    return { type: 'output', lines: LANDING_LS_LINES }
  }

  if (lower === 'back') {
    return { type: 'appGoBack' }
  }

  if (lower === 'home') {
    return { type: 'goHome' }
  }

  if (lower.startsWith('cd ')) {
    const target = lower.slice(3).trim()

    if (target === 'webpage') {
      return { type: 'navigate' }
    }

    if (target === 'main') {
      return { type: 'returnToMainMenu' }
    }

    if (target === 'terminal') {
      if (mode === MODES.TERMINAL_PORTFOLIO && portfolioPath.length === 0) {
        return { type: 'output', lines: TERMINAL_ENTER_LINES }
      }
      if (mode === MODES.TERMINAL_PORTFOLIO) {
        return { type: 'goPortfolioRoot' }
      }
      return { type: 'enterTerminalPortfolio' }
    }

    if (MARKAI_CD_TARGETS.has(target)) {
      return { type: 'enterMarkGpt' }
    }

    if (target === '..') {
      if (mode === MODES.TERMINAL_PORTFOLIO && portfolioPath.length > 0) {
        return { type: 'goUpFolder' }
      }

      return { type: 'output', lines: ['Already at terminal root.'] }
    }

    if (target === '/') {
      return { type: 'goHome' }
    }

    if (target === '.') {
      return { type: 'output', lines: ['Already in the current directory.'] }
    }

    if (mode === MODES.TERMINAL_PORTFOLIO && portfolioPath.length === 0) {
      if (TERMINAL_CATEGORY_SLUGS.includes(target)) {
        return {
          type: 'output',
          lines: getTerminalCategoryPlaceholderLines(target),
        }
      }
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

const MODE_PICKER_OPTIONS = [
  {
    id: 'webpage',
    title: 'Webpage',
    description: 'Standard portfolio for resume, projects, and contact.',
  },
  {
    id: 'markgpt',
    title: 'MarkGPT',
    description:
      'Coming soon — ask about Mark\'s resume, projects, goals, and background.',
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'Command-line portfolio with folders and commands.',
  },
]

function TerminalLanding({
  terminal,
  onTerminalNavigate,
  onEnterWebpage,
  onAppGoBack,
  onReturnToMainMenu,
}) {
  const showModePicker = terminal.showModePicker
  const showMarkGpt = terminal.showMarkGpt
  const mode = terminal.mode
  const portfolioPath = terminal.portfolioPath

  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [inputHistory, setInputHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [terminalHelpOpen, setTerminalHelpOpen] = useState(false)
  const terminalOutputRef = useRef(null)
  const inputRef = useRef(null)
  const terminalStateRef = useRef('')

  const helpOpen = mode === MODES.HELP
  const isTerminalPortfolio = mode === MODES.TERMINAL_PORTFOLIO
  const prompt = getPrompt(mode, portfolioPath)
  const contextHint = getContextHint(mode, portfolioPath, history)

  useEffect(() => {
    const nextStateKey = [
      showModePicker,
      showMarkGpt,
      mode,
      portfolioPath.join('/'),
    ].join('|')

    if (terminalStateRef.current !== nextStateKey) {
      terminalStateRef.current = nextStateKey
      setHistory([])
      setInput('')
      setInputHistory([])
      setHistoryIndex(-1)
      setTerminalHelpOpen(false)
    }
  }, [mode, portfolioPath, showMarkGpt, showModePicker])

  useEffect(() => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight
    }
  }, [history, mode, portfolioPath, contextHint])

  useEffect(() => {
    if (showModePicker) {
      return
    }

    if (!showMarkGpt) {
      inputRef.current?.focus()
    }
  }, [mode, portfolioPath, showMarkGpt, showModePicker])

  const enterMarkGpt = () => {
    onTerminalNavigate({
      showModePicker: false,
      showMarkGpt: true,
      mode: MODES.LANDING,
      portfolioPath: [],
    })
  }

  const handlePickWebpage = () => {
    onEnterWebpage()
  }

  const handlePickTerminal = () => {
    onTerminalNavigate({
      showModePicker: false,
      showMarkGpt: false,
      mode: MODES.TERMINAL_PORTFOLIO,
      portfolioPath: [],
    })
  }

  const handlePickMarkGpt = () => {
    enterMarkGpt()
  }

  const handleModePick = (optionId) => {
    if (optionId === 'webpage') {
      handlePickWebpage()
      return
    }

    if (optionId === 'terminal') {
      handlePickTerminal()
      return
    }

    if (optionId === 'markgpt') {
      handlePickMarkGpt()
    }
  }

  const appendEntry = (entryInput, output = [], entryPrompt = prompt) => {
    setHistory((current) => [
      ...current,
      { input: entryInput, output, prompt: entryPrompt },
    ])
  }

  const enterTerminalPortfolio = () => {
    onTerminalNavigate({
      showModePicker: false,
      showMarkGpt: false,
      mode: MODES.TERMINAL_PORTFOLIO,
      portfolioPath: [],
    })
  }

  const resetPortfolioRoot = () => {
    onTerminalNavigate(
      {
        portfolioPath: [],
        mode: MODES.TERMINAL_PORTFOLIO,
      },
      { recordHistory: false },
    )
  }

  const resetTerminalPortfolioSession = () => {
    setHistory([])
    setInput('')
    setInputHistory([])
    setHistoryIndex(-1)
    setTerminalHelpOpen(false)

    if (portfolioPath.length > 0) {
      resetPortfolioRoot()
    }

    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = 0
    }

    inputRef.current?.focus()
  }

  const resetTerminal = (event) => {
    event.stopPropagation()

    if (mode === MODES.TERMINAL_PORTFOLIO) {
      resetTerminalPortfolioSession()
      return
    }

    onTerminalNavigate(
      {
        showModePicker: false,
        showMarkGpt: false,
        mode: MODES.LANDING,
        portfolioPath: [],
      },
      { recordHistory: false },
    )
  }

  const runCommand = (rawInput, { recordHistory = false } = {}) => {
    const trimmed = rawInput.trimEnd()
    const currentPrompt = getPrompt(mode, portfolioPath)
    const result = parseCommand(trimmed, { mode, portfolioPath })

    if (recordHistory && trimmed !== '') {
      setInputHistory((current) => [...current, trimmed])
      setHistoryIndex(-1)
    }

    if (result.type === 'noop') {
      appendEntry(trimmed, [], currentPrompt)
      return
    }

    if (result.type === 'showHelp') {
      appendEntry(trimmed, [], currentPrompt)
      onTerminalNavigate({ mode: MODES.HELP })
      return
    }

    if (result.type === 'toggleTerminalHelp') {
      setTerminalHelpOpen((current) => !current)
      return
    }

    if (result.type === 'clearOutput') {
      setHistory([])
      setInput('')
      return
    }

    if (result.type === 'appGoBack') {
      onAppGoBack()
      return
    }

    if (result.type === 'goUpFolder') {
      onTerminalNavigate({ portfolioPath: [] })
      appendEntry(trimmed, [], currentPrompt)
      return
    }

    if (result.type === 'goHome') {
      if (mode === MODES.TERMINAL_PORTFOLIO) {
        resetPortfolioRoot()
        return
      }

      onTerminalNavigate({
        showModePicker: false,
        showMarkGpt: false,
        mode: MODES.LANDING,
        portfolioPath: [],
      })
      return
    }

    if (result.type === 'goPortfolioRoot') {
      resetPortfolioRoot()
      return
    }

    if (result.type === 'navigate') {
      appendEntry(trimmed, ['Opening portfolio website...'], currentPrompt)
      onEnterWebpage()
      return
    }

    if (result.type === 'enterTerminalPortfolio') {
      enterTerminalPortfolio()
      return
    }

    if (result.type === 'enterMarkGpt') {
      enterMarkGpt()
      return
    }

    if (result.type === 'returnToMainMenu') {
      onReturnToMainMenu()
      return
    }

    appendEntry(trimmed, result.lines ?? [], currentPrompt)
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

    if (isTerminalPortfolio) {
      setTerminalHelpOpen((current) => !current)
      return
    }

    if (helpOpen) {
      onAppGoBack()
      return
    }

    onTerminalNavigate({ mode: MODES.HELP })
  }

  const handleTerminalMainMenu = (event) => {
    event.stopPropagation()
    onReturnToMainMenu()
  }

  const showTerminalFooter =
    isTerminalPortfolio ? terminalHelpOpen : true

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

  const titleLabel =
    mode === MODES.TERMINAL_PORTFOLIO
      ? 'Mark Yoingco Terminal Portfolio'
      : "Mark Yoingco's Portfolio Terminal"

  return (
    <div
      className="terminal-shell"
      onClick={() => {
        if (!showModePicker && !showMarkGpt) {
          inputRef.current?.focus()
        }
      }}
    >
      {showMarkGpt ? (
          <div className="markgpt-card">
            <header className="markgpt-card__titlebar">
              <div className="terminal-card__dots" aria-hidden="true">
                <span className="terminal-card__dot" />
                <span className="terminal-card__dot" />
                <span className="terminal-card__dot" />
              </div>
              <span className="markgpt-card__label">MarkGPT</span>
            </header>

            <div className="markgpt-card__body">
              <p className="markgpt-card__subtitle">AI portfolio assistant coming soon.</p>

              <div className="markgpt-messages" role="log" aria-live="polite">
                <div className="markgpt-message">
                  <p className="markgpt-message__lead">MarkGPT is coming soon.</p>
                  <p className="markgpt-message__body">
                    This will become an AI chatbox that answers questions about Mark&apos;s
                    resume, projects, goals, dreams, motivations, hobbies, work, and personality.
                  </p>
                </div>
              </div>
            </div>

            <footer className="markgpt-card__footer">
              <label className="markgpt-input-wrap" htmlFor="markgpt-input">
                <input
                  id="markgpt-input"
                  className="markgpt-input"
                  type="text"
                  placeholder="Ask MarkGPT anything about Mark..."
                  disabled
                  aria-disabled="true"
                  aria-describedby="markgpt-input-status"
                />
                <span id="markgpt-input-status" className="markgpt-input__badge">
                  Coming soon
                </span>
              </label>
            </footer>
          </div>
      ) : (
      <div
        className={
          showModePicker
            ? 'terminal-card terminal-card--behind'
            : isTerminalPortfolio
              ? 'terminal-card terminal-card--portfolio'
              : 'terminal-card'
        }
        aria-hidden={showModePicker}
      >
        <header className="terminal-card__titlebar">
          <div className="terminal-card__titlebar-start">
            <div className="terminal-card__dots" aria-hidden="true">
              <span className="terminal-card__dot" />
              <span className="terminal-card__dot" />
              <span className="terminal-card__dot" />
            </div>
            {isTerminalPortfolio ? (
              <div className="terminal-utils" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="terminal-utils__btn"
                  onClick={handleTerminalMainMenu}
                >
                  Main Menu
                </button>
                <button
                  type="button"
                  className="terminal-utils__btn terminal-utils__btn--help"
                  aria-pressed={terminalHelpOpen}
                  onClick={handleHelpClick}
                >
                  Help
                </button>
                <button
                  type="button"
                  className="terminal-utils__btn terminal-utils__btn--icon"
                  aria-label="Reset terminal"
                  title="Reset terminal"
                  onClick={resetTerminal}
                >
                  ↻
                </button>
              </div>
            ) : null}
          </div>
          <span className="terminal-card__label">{titleLabel}</span>
        </header>

        <div className="terminal-output">
          <div className="terminal-history" ref={terminalOutputRef}>
            {history.map((entry, index) => (
              <div
                key={`${index}-${entry.prompt}-${entry.input}-${entry.output.join('|')}`}
                className="terminal-entry"
              >
                <div className="terminal-history-line">
                  <span className="terminal-prompt">{entry.prompt}</span>
                  <span className="terminal-command-text">{entry.input}</span>
                </div>
                {entry.output.map((line, lineIndex) =>
                  line === '' ? (
                    <div
                      key={`${index}-${lineIndex}-spacer`}
                      className="terminal-output__spacer"
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      key={`${index}-${lineIndex}-${line}`}
                      className="terminal-output__line terminal-output__line--muted"
                    >
                      {line}
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>

          <div className="terminal-composer">
            <form className="terminal-input-row" onSubmit={handleSubmit}>
              <span className="terminal-prompt">{prompt}</span>
              <input
                id="terminal-input"
                ref={inputRef}
                className="terminal-input"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                size={Math.max(input.length, 1)}
                style={{ width: `${Math.max(input.length, 1)}ch` }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Terminal command input"
              />
              <span className="terminal-cursor" aria-hidden="true" />
            </form>

            <p className="terminal-comment">{contextHint}</p>
            {isTerminalPortfolio && portfolioPath.length === 0 ? (
              <p className="terminal-tip">{TERMINAL_TIP}</p>
            ) : null}
          </div>
        </div>

        {showTerminalFooter ? (
        <footer
          className={
            isTerminalPortfolio
              ? 'terminal-footer terminal-footer--shortcuts'
              : 'terminal-footer'
          }
          onClick={(event) => event.stopPropagation()}
        >
          <div className="terminal-actions">
            {!isTerminalPortfolio ? (
              <div className="terminal-icon-actions">
                <button
                  type="button"
                  className="terminal-chip terminal-chip--icon terminal-chip--help"
                  aria-label="Show commands"
                  title="Show commands"
                  aria-pressed={helpOpen}
                  onClick={handleHelpClick}
                >
                  ?
                </button>
                <button
                  type="button"
                  className="terminal-chip terminal-chip--icon terminal-chip--reset"
                  aria-label="Reset terminal"
                  title="Reset terminal"
                  onClick={resetTerminal}
                >
                  ↻
                </button>
              </div>
            ) : null}

            {isTerminalPortfolio && terminalHelpOpen ? (
              <div className="terminal-help-panel" role="region" aria-label="Terminal help">
                <p className="terminal-help-panel__heading">Available commands</p>
                <ul className="terminal-help-panel__list">
                  {TERMINAL_HELP_COMMANDS.map((command) => (
                    <li key={command}>
                      <button
                        type="button"
                        className="terminal-help-panel__item"
                        onClick={() => handleChipClick(command)}
                      >
                        {command}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="terminal-help-panel__heading">Categories</p>
                <ul className="terminal-help-panel__list terminal-help-panel__list--categories">
                  {TERMINAL_CATEGORY_SLUGS.map((category) => (
                    <li key={category}>{category}</li>
                  ))}
                </ul>
                <p className="terminal-help-panel__note">{TERMINAL_HELP_MODE_NOTE}</p>
              </div>
            ) : null}

            {!isTerminalPortfolio && helpOpen ? (
              <div className="terminal-chip-list" role="list" aria-label="Available commands">
                {LANDING_COMMAND_OPTIONS.map((command) => (
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
            ) : null}
          </div>
        </footer>
        ) : null}
      </div>
      )}

      {showModePicker && !showMarkGpt && mode !== MODES.TERMINAL_PORTFOLIO && (
        <div
          className="mode-picker-layer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mode-picker-title"
          aria-describedby="mode-picker-subtitle"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mode-picker">
            <header className="mode-picker__titlebar">
              <div className="terminal-card__dots" aria-hidden="true">
                <span className="terminal-card__dot" />
                <span className="terminal-card__dot" />
                <span className="terminal-card__dot" />
              </div>
              <span className="mode-picker__label">Mark Yoingco&apos;s Portfolio Mode</span>
            </header>

            <div className="mode-picker__body">
              <h2 id="mode-picker-title" className="mode-picker__title">
                Select Portfolio Mode
              </h2>
              <p id="mode-picker-subtitle" className="mode-picker__subtitle">
                Choose the version of Mark Yoingco&apos;s portfolio you&apos;d like to view.
              </p>

              <div className="mode-picker__options">
                {MODE_PICKER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    data-option={option.id}
                    className="mode-picker__option"
                    onClick={() => handleModePick(option.id)}
                  >
                    <span className="mode-picker__option-title">{option.title}</span>
                    <span className="mode-picker__option-desc">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TerminalLanding

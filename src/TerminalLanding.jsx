import { useEffect, useRef, useState } from 'react'
import {
  getAlreadyInFolderLines,
  getTerminalCategoryPlaceholderLines,
  getTerminalEnterFolderLines,
  getTerminalFolderHint,
  getTerminalHelpPanel,
  getPortfolioCategoryEnterLines,
  getPortfolioCategoryAliasEnterLines,
  getPortfolioFileSetCdHint,
  getNestedPortfolioProjectEnterLines,
  getNestedPortfolioProjectSlugs,
  getTestimonialPersonEnterLines,
  getTestimonialPersonSlugs,
  getTestimonialPersonUnknownCommandHint,
  isNestedPortfolioCategoryFolder,
  isNestedPortfolioProjectFolder,
  isPortfolioCategoryFolder,
  isPortfolioRoot,
  parsePortfolioCommand,
  PORTFOLIO_CATEGORY_SLUGS,
  PORTFOLIO_CATEGORY_CD_ALIASES,
  PORTFOLIO_ROOT_UNKNOWN_COMMAND_HINT,
  getTerminalPortfolioLsLines,
  isContactFolder,
  isPersonalFolder,
  isResumeFolder,
  isTestimonialsFolder,
  isTestimonialPersonFolder,
  isTravelFolder,
  isTerminalFolderSlug,
  MARKAI_CD_TARGETS,
  parseContactFileCommand,
  parsePersonalFileCommand,
  parseResumeFileCommand,
  parseTestimonialsRootCommand,
  parseTestimonialPersonCommand,
  parseTravelFileCommand,
  CONTACT_UNKNOWN_COMMAND_HINT,
  PERSONAL_UNKNOWN_COMMAND_HINT,
  TESTIMONIALS_ROOT_UNKNOWN_COMMAND_HINT,
  TRAVEL_UNKNOWN_COMMAND_HINT,
  RESUME_PDF_FILENAME,
  RESUME_PDF_PATH,
  RESUME_UNKNOWN_COMMAND_HINT,
  TERMINAL_CATEGORY_SLUGS,
  VSCO_GALLERY_URL,
} from './terminalPortfolioData'
import {
  buildContactFormConfirmErrorOutput,
  buildContactFormErrorOutput,
  buildContactFormFieldOutput,
  buildContactFormReviewOutput,
  buildContactFormStartOutput,
  CONTACT_FORM_INPUT_PROMPT,
  createInitialContactFormState,
  isContactFormOutput,
  parseContactFormConfirmInput,
  startContactFormState,
  submitTerminalContactMessage,
  validateContactFormField,
  getNextContactFormStep,
} from './terminalContactForm'
import TerminalContactFormBlock from './TerminalContactFormBlock'
import { isFileCatOutput, TERMINAL_SCROLL_MODE } from './terminalFileOutput'
import TerminalFileBlock from './TerminalFileBlock'
import { resolveTerminalAutocomplete } from './terminalAutocomplete'
import { isMobileTerminalViewport, MOBILE_TERMINAL_MEDIA_QUERY } from './terminalMobile'
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
  'Tip: type cd webpage, cd markai, cd main, or cd terminal to switch modes.'

const TERMINAL_ROOT_BEGINNER_HINT =
  'New here? Type cd [category] and press Enter. Example: cd resume'

const TERMINAL_ROOT_MOBILE_HINT =
  'Mobile tip: Tap Help to browse commands, or tap the prompt to type.'

function TerminalHelpCommandList({ commands, onCommandClick }) {
  return (
    <ul className="terminal-help-panel__list terminal-help-panel__list--commands">
      {commands.map(({ command, description }) => (
        <li key={command}>
          <button
            type="button"
            className="terminal-help-panel__item"
            onClick={() => onCommandClick(command)}
            title={description ? description : undefined}
          >
            {command}
          </button>
        </li>
      ))}
    </ul>
  )
}

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

function getContextHint(mode, portfolioPath, history, contactFormActive) {
  if (mode === MODES.TERMINAL_PORTFOLIO) {
    if (contactFormActive) {
      return 'Type cancel anytime to exit message.form.'
    }

    if (portfolioPath.length > 0) {
      return getTerminalFolderHint(portfolioPath)
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

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      portfolioPath.length === 0 &&
      isTerminalFolderSlug(target)
    ) {
      return {
        type: 'enterFolder',
        path: [target],
        lines: getTerminalEnterFolderLines(target),
      }
    }

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

    if (target === 'photos') {
      if (mode === MODES.TERMINAL_PORTFOLIO) {
        return {
          type: 'output',
          lines: ['Photos live under travel. Try: cd travel'],
        }
      }
    }

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      isPortfolioRoot(portfolioPath) &&
      Object.hasOwn(PORTFOLIO_CATEGORY_CD_ALIASES, target)
    ) {
      const resolved = PORTFOLIO_CATEGORY_CD_ALIASES[target]
      return {
        type: 'enterFolder',
        path: ['portfolio', resolved],
        lines: getPortfolioCategoryAliasEnterLines(target, resolved),
      }
    }

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      isPortfolioRoot(portfolioPath) &&
      PORTFOLIO_CATEGORY_SLUGS.includes(target)
    ) {
      return {
        type: 'enterFolder',
        path: ['portfolio', target],
        lines: getPortfolioCategoryEnterLines(target),
      }
    }

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      isPortfolioCategoryFolder(portfolioPath)
    ) {
      const fileSetHint = getPortfolioFileSetCdHint(portfolioPath[1], target)
      if (fileSetHint) {
        return {
          type: 'output',
          lines: [fileSetHint],
        }
      }
    }

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      isTestimonialsFolder(portfolioPath) &&
      getTestimonialPersonSlugs().includes(target)
    ) {
      return {
        type: 'enterFolder',
        path: ['testimonials', target],
        lines: getTestimonialPersonEnterLines(target),
      }
    }

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      isNestedPortfolioCategoryFolder(portfolioPath) &&
      getNestedPortfolioProjectSlugs(portfolioPath).includes(target)
    ) {
      return {
        type: 'enterFolder',
        path: [...portfolioPath, target],
        lines: getNestedPortfolioProjectEnterLines(portfolioPath, target),
      }
    }

    if (mode === MODES.TERMINAL_PORTFOLIO && portfolioPath.length > 0) {
      const currentFolder = portfolioPath[portfolioPath.length - 1]

      if (target === currentFolder) {
        return {
          type: 'output',
          lines: getAlreadyInFolderLines(currentFolder),
        }
      }

      return {
        type: 'output',
        lines: [`cd : Cannot find path '${input.slice(3).trim()}' because it does not exist.`],
      }
    }

    if (
      mode === MODES.TERMINAL_PORTFOLIO &&
      portfolioPath.length === 0 &&
      TERMINAL_CATEGORY_SLUGS.includes(target) &&
      !isTerminalFolderSlug(target)
    ) {
      return {
        type: 'output',
        lines: getTerminalCategoryPlaceholderLines(target),
      }
    }

    return {
      type: 'output',
      lines: [`cd : Cannot find path '${input.slice(3).trim()}' because it does not exist.`],
    }
  }

  if (mode === MODES.TERMINAL_PORTFOLIO && isResumeFolder(portfolioPath)) {
    const resumeResult = parseResumeFileCommand(lower)
    if (resumeResult) {
      return resumeResult
    }

    return {
      type: 'output',
      lines: [RESUME_UNKNOWN_COMMAND_HINT],
    }
  }

  if (mode === MODES.TERMINAL_PORTFOLIO && isContactFolder(portfolioPath)) {
    const contactResult = parseContactFileCommand(lower)
    if (contactResult) {
      return contactResult
    }

    return {
      type: 'output',
      lines: [CONTACT_UNKNOWN_COMMAND_HINT],
    }
  }

  if (mode === MODES.TERMINAL_PORTFOLIO && isPersonalFolder(portfolioPath)) {
    const personalResult = parsePersonalFileCommand(lower)
    if (personalResult) {
      return personalResult
    }

    return {
      type: 'output',
      lines: [PERSONAL_UNKNOWN_COMMAND_HINT],
    }
  }

  if (mode === MODES.TERMINAL_PORTFOLIO && isTestimonialPersonFolder(portfolioPath)) {
    const personResult = parseTestimonialPersonCommand(lower, portfolioPath[1])
    if (personResult) {
      return personResult
    }

    return {
      type: 'output',
      lines: [getTestimonialPersonUnknownCommandHint(portfolioPath[1])],
    }
  }

  if (mode === MODES.TERMINAL_PORTFOLIO && isTestimonialsFolder(portfolioPath)) {
    const testimonialsResult = parseTestimonialsRootCommand(lower)
    if (testimonialsResult) {
      return testimonialsResult
    }

    return {
      type: 'output',
      lines: [TESTIMONIALS_ROOT_UNKNOWN_COMMAND_HINT],
    }
  }

  if (mode === MODES.TERMINAL_PORTFOLIO && isTravelFolder(portfolioPath)) {
    const travelResult = parseTravelFileCommand(lower)
    if (travelResult) {
      return travelResult
    }

    return {
      type: 'output',
      lines: [TRAVEL_UNKNOWN_COMMAND_HINT],
    }
  }

  if (
    mode === MODES.TERMINAL_PORTFOLIO &&
    (isPortfolioRoot(portfolioPath) ||
      isPortfolioCategoryFolder(portfolioPath) ||
      isNestedPortfolioProjectFolder(portfolioPath))
  ) {
    const portfolioResult = parsePortfolioCommand(lower, portfolioPath)
    if (portfolioResult) {
      return portfolioResult
    }

    return {
      type: 'output',
      lines: [PORTFOLIO_ROOT_UNKNOWN_COMMAND_HINT],
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
  onEnterWebpagePortfolio,
  onEnterWebpageScreen,
  onEnterTerminalFresh,
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
  const [contactForm, setContactForm] = useState(createInitialContactFormState)
  const terminalOutputRef = useRef(null)
  const inputRef = useRef(null)
  const terminalStateRef = useRef('')
  const mobileInputActivatedRef = useRef(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => isMobileTerminalViewport())

  const helpOpen = mode === MODES.HELP
  const isTerminalPortfolio = mode === MODES.TERMINAL_PORTFOLIO
  const prompt = getPrompt(mode, portfolioPath)
  const activeInputPrompt = contactForm.active ? CONTACT_FORM_INPUT_PROMPT : prompt
  const contextHint = getContextHint(mode, portfolioPath, history, contactForm.active)
  const helpPanel = getTerminalHelpPanel(portfolioPath)

  const focusTerminalInput = ({ force = false } = {}) => {
    if (isMobileViewport && !force && !mobileInputActivatedRef.current && !contactForm.active) {
      return
    }

    inputRef.current?.focus()
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_TERMINAL_MEDIA_QUERY)
    const syncMobileViewport = () => setIsMobileViewport(mediaQuery.matches)

    syncMobileViewport()
    mediaQuery.addEventListener('change', syncMobileViewport)

    return () => mediaQuery.removeEventListener('change', syncMobileViewport)
  }, [])

  useEffect(() => {
    if (!isContactFolder(portfolioPath)) {
      setContactForm(createInitialContactFormState())
    }
  }, [portfolioPath])

  useEffect(() => {
    const nextStateKey = [showMarkGpt, mode].join('|')

    if (terminalStateRef.current !== nextStateKey) {
      terminalStateRef.current = nextStateKey
      setHistory([])
      setInput('')
      setInputHistory([])
      setHistoryIndex(-1)
      setTerminalHelpOpen(false)
      setContactForm(createInitialContactFormState())
      mobileInputActivatedRef.current = false
    }
  }, [mode, showMarkGpt])

  useEffect(() => {
    if (!isTerminalPortfolio || showModePicker || showMarkGpt) {
      return
    }

    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = 0
    }

    if (isMobileViewport) {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
      })
    }
  }, [isTerminalPortfolio, showModePicker, showMarkGpt, isMobileViewport, mode])

  useEffect(() => {
    const container = terminalOutputRef.current
    if (!container || history.length === 0) {
      return
    }

    requestAnimationFrame(() => {
      const lastEntry = history[history.length - 1]
      const entries = container.querySelectorAll('.terminal-entry')
      const lastEntryEl = entries[entries.length - 1]

      if (!lastEntryEl) {
        return
      }

      if (lastEntry.scrollMode === TERMINAL_SCROLL_MODE.COMMAND) {
        container.scrollTop = Math.max(0, lastEntryEl.offsetTop - 12)
        return
      }

      container.scrollTop = container.scrollHeight
    })
  }, [history])

  useEffect(() => {
    if (showModePicker) {
      return
    }

    if (!showMarkGpt) {
      if (isMobileViewport && !mobileInputActivatedRef.current && !contactForm.active) {
        return
      }

      inputRef.current?.focus()
    }
  }, [mode, portfolioPath, showMarkGpt, showModePicker, isMobileViewport, contactForm.active])

  useEffect(() => {
    if (contactForm.active) {
      inputRef.current?.focus()
    }
  }, [contactForm.active, contactForm.step])

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
    onEnterTerminalFresh()
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

  const appendEntry = (
    entryInput,
    output = [],
    entryPrompt = prompt,
    { scrollMode = TERMINAL_SCROLL_MODE.END, formMode = false } = {},
  ) => {
    setHistory((current) => [
      ...current,
      { input: entryInput, output, prompt: entryPrompt, scrollMode, formMode },
    ])
  }

  const renderEntryOutput = (output, entryIndex) => {
    if (isFileCatOutput(output)) {
      return <TerminalFileBlock block={output} />
    }

    if (isContactFormOutput(output)) {
      return <TerminalContactFormBlock block={output} />
    }

    return output.map((line, lineIndex) =>
      line === '' ? (
        <div
          key={`${entryIndex}-${lineIndex}-spacer`}
          className="terminal-output__spacer"
          aria-hidden="true"
        />
      ) : (
        <div
          key={`${entryIndex}-${lineIndex}-${line}`}
          className="terminal-output__line terminal-output__line--muted"
        >
          {line}
        </div>
      ),
    )
  }

  const getEntryKey = (entry, index) => {
    const outputKey = isFileCatOutput(entry.output)
      ? entry.output.filename
      : isContactFormOutput(entry.output)
        ? `${entry.output.variant}-${entry.output.title ?? 'form'}`
      : Array.isArray(entry.output)
        ? entry.output.join('|')
        : 'output'

    return `${index}-${entry.prompt}-${entry.input}-${outputKey}`
  }

  const handleInputChange = (event) => {
    const nextValue = event.target.value
    setInput(nextValue)

    if (historyIndex !== -1) {
      setHistoryIndex(-1)
    }
  }

  const recallHistoryCommand = (command, index) => {
    setHistoryIndex(index)
    setInput(command)

    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return

      el.focus()
      const end = command.length
      el.setSelectionRange(end, end)
    })
  }

  const appendInputHistory = (command) => {
    setInputHistory((current) => {
      if (current[current.length - 1] === command) {
        return current
      }

      return [...current, command]
    })
    setHistoryIndex(-1)
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
    setContactForm(createInitialContactFormState())

    if (portfolioPath.length > 0) {
      resetPortfolioRoot()
    }

    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = 0
    }

    focusTerminalInput()
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

  const runContactFormStep = async (rawInput) => {
    const trimmed = rawInput.trimEnd()
    const shellPrompt = getPrompt(mode, portfolioPath)
    const formPrompt = CONTACT_FORM_INPUT_PROMPT
    const lower = trimmed.toLowerCase()

    if (lower === 'cancel') {
      setContactForm(createInitialContactFormState())
      appendEntry(trimmed, ['Form cancelled.'], shellPrompt)
      return
    }

    if (lower === 'clear') {
      appendEntry(trimmed, ['Type cancel to exit the form first.'], formPrompt, {
        formMode: true,
      })
      return
    }

    if (contactForm.step === 'confirm') {
      const decision = parseContactFormConfirmInput(trimmed)

      if (decision === 'yes') {
        appendEntry(trimmed, ['Sending message...'], formPrompt, { formMode: true })
        const result = await submitTerminalContactMessage(contactForm.data)
        setContactForm(createInitialContactFormState())
        appendEntry('', result.lines, shellPrompt)
        return
      }

      if (decision === 'no') {
        setContactForm(createInitialContactFormState())
        appendEntry(trimmed, ['Message not sent.'], shellPrompt)
        return
      }

      appendEntry(trimmed, buildContactFormConfirmErrorOutput(), formPrompt, {
        formMode: true,
      })
      return
    }

    const validation = validateContactFormField(contactForm.step, trimmed)

    if (!validation.valid) {
      appendEntry(
        trimmed,
        buildContactFormErrorOutput(contactForm.step, validation.error),
        formPrompt,
        { formMode: true },
      )
      return
    }

    const nextData = {
      ...contactForm.data,
      [contactForm.step]: validation.value,
    }
    const nextStep = getNextContactFormStep(contactForm.step)

    if (nextStep === 'confirm') {
      setContactForm({
        active: true,
        step: 'confirm',
        data: nextData,
      })
      appendEntry(trimmed, buildContactFormReviewOutput(nextData), formPrompt, {
        formMode: true,
      })
      return
    }

    setContactForm({
      active: true,
      step: nextStep,
      data: nextData,
    })
    appendEntry(trimmed, buildContactFormFieldOutput(nextStep), formPrompt, {
      formMode: true,
    })
  }

  const runCommand = (rawInput, { recordHistory = false } = {}) => {
    const trimmed = rawInput.trimEnd()
    const currentPrompt = getPrompt(mode, portfolioPath)

    if (contactForm.active) {
      void runContactFormStep(trimmed)
      return
    }

    const result = parseCommand(trimmed, { mode, portfolioPath })

    if (recordHistory && trimmed !== '') {
      appendInputHistory(trimmed)
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
      const nextPath = portfolioPath.slice(0, -1)
      onTerminalNavigate({ portfolioPath: nextPath }, { recordHistory: false })
      appendEntry(trimmed, [], getPrompt(mode, nextPath))
      return
    }

    if (result.type === 'enterFolder') {
      const nextPath = [...result.path]
      onTerminalNavigate({ portfolioPath: nextPath }, { recordHistory: false })
      appendEntry(trimmed, result.lines ?? [], getPrompt(mode, nextPath))
      return
    }

    if (result.type === 'openResumePdf') {
      window.open(RESUME_PDF_PATH, '_blank', 'noopener,noreferrer')
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      return
    }

    if (result.type === 'openVscoLink') {
      window.open(VSCO_GALLERY_URL, '_blank', 'noopener,noreferrer')
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      return
    }

    if (result.type === 'openUrl') {
      window.open(result.url, '_blank', 'noopener,noreferrer')
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      return
    }

    if (result.type === 'openPortfolioWebpage') {
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      onEnterWebpagePortfolio(result.portfolioCategory)
      return
    }

    if (result.type === 'openTestimonialsWebpage') {
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      onEnterWebpageScreen('testimonials')
      return
    }

    if (result.type === 'openTravelWebpage') {
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      onEnterWebpageScreen('travel')
      return
    }

    if (result.type === 'downloadResumePdf') {
      const link = document.createElement('a')
      link.href = RESUME_PDF_PATH
      link.download = RESUME_PDF_FILENAME
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      appendEntry(trimmed, result.lines ?? [], currentPrompt)
      return
    }

    if (result.type === 'startContactForm') {
      setContactForm(startContactFormState())
      appendEntry(trimmed, buildContactFormStartOutput(), currentPrompt)
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

    appendEntry(
      trimmed,
      result.output ?? result.lines ?? [],
      currentPrompt,
      { scrollMode: result.scrollMode ?? TERMINAL_SCROLL_MODE.END },
    )
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    mobileInputActivatedRef.current = true
    runCommand(input, { recordHistory: true })
    setInput('')
  }

  const handleChipClick = (command) => {
    mobileInputActivatedRef.current = true
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
    isTerminalPortfolio ? terminalHelpOpen || contactForm.active : true

  const handleKeyDown = (event) => {
    if (contactForm.active) {
      return
    }

    if (event.key === 'Tab') {
      if (showModePicker || showMarkGpt) {
        return
      }

      event.preventDefault()

      const result = resolveTerminalAutocomplete(input, {
        mode,
        portfolioPath,
        isTerminalPortfolio,
        contactFormActive: contactForm.active,
      })

      if (result.type === 'complete') {
        setInput(result.value)
        requestAnimationFrame(() => {
          const el = inputRef.current
          el?.focus()
          el?.setSelectionRange(result.value.length, result.value.length)
        })
        return
      }

      if (result.type === 'suggest') {
        appendEntry('', result.lines, prompt)
        return
      }

      if (result.type === 'none' && result.message) {
        appendEntry('', [result.message], prompt)
      }

      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (inputHistory.length === 0) return

      const nextIndex =
        historyIndex === -1
          ? inputHistory.length - 1
          : Math.max(0, historyIndex - 1)

      recallHistoryCommand(inputHistory[nextIndex], nextIndex)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (inputHistory.length === 0 || historyIndex === -1) return

      const nextIndex = historyIndex + 1
      if (nextIndex >= inputHistory.length) {
        setHistoryIndex(-1)
        setInput('')
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.setSelectionRange(0, 0)
        })
        return
      }

      recallHistoryCommand(inputHistory[nextIndex], nextIndex)
    }
  }

  const titleLabel =
    mode === MODES.TERMINAL_PORTFOLIO
      ? 'Mark Yoingco Terminal Portfolio'
      : "Mark Yoingco's Portfolio Terminal"

  const compactTitleLabel = 'Terminal Portfolio'

  const showRootMobileHint =
    isMobileViewport &&
    isTerminalPortfolio &&
    portfolioPath.length === 0 &&
    !terminalHelpOpen &&
    !contactForm.active

  const handleTerminalInputFocus = () => {
    mobileInputActivatedRef.current = true
  }

  return (
    <div
      className="terminal-shell"
      onClick={() => {
        if (!showModePicker && !showMarkGpt) {
          focusTerminalInput()
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
      <div className="terminal-stage">
      <div
        className={
          showModePicker
            ? 'terminal-card terminal-card--portfolio terminal-card--behind'
            : isTerminalPortfolio
              ? 'terminal-card terminal-card--portfolio'
              : 'terminal-card'
        }
      >
        <header className="terminal-card__titlebar">
          <div className="terminal-card__titlebar-start">
            <div className="terminal-card__dots" aria-hidden="true">
              <span className="terminal-card__dot" />
              <span className="terminal-card__dot" />
              <span className="terminal-card__dot" />
            </div>
          </div>
          <span className="terminal-card__label terminal-card__label--full">
            {titleLabel}
          </span>
          {isTerminalPortfolio ? (
            <span className="terminal-card__label terminal-card__label--compact">
              {compactTitleLabel}
            </span>
          ) : null}
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
        </header>

        <div className="terminal-output">
          <div className="terminal-history" ref={terminalOutputRef}>
            {history.map((entry, index) => (
              <div key={getEntryKey(entry, index)} className="terminal-entry">
                <div
                  className={
                    entry.formMode
                      ? 'terminal-history-line terminal-history-line--form'
                      : 'terminal-history-line'
                  }
                >
                  <span
                    className={
                      entry.formMode ? 'terminal-form-prompt' : 'terminal-prompt'
                    }
                  >
                    {entry.prompt}
                  </span>
                  <span className="terminal-command-text">{entry.input}</span>
                </div>
                {renderEntryOutput(entry.output, index)}
              </div>
            ))}
          </div>

          <div className="terminal-composer">
            <form className="terminal-input-row" onSubmit={handleSubmit}>
              <span
                className={
                  contactForm.active ? 'terminal-form-prompt' : 'terminal-prompt'
                }
              >
                {activeInputPrompt}
              </span>
              <input
                id="terminal-input"
                ref={inputRef}
                className="terminal-input"
                type="text"
                value={input}
                onChange={handleInputChange}
                onFocus={handleTerminalInputFocus}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Terminal command input"
                readOnly={showModePicker}
                tabIndex={showModePicker ? -1 : 0}
              />
            </form>

            <p
              className={
                contactForm.active
                  ? 'terminal-comment terminal-comment--form-hint'
                  : 'terminal-comment'
              }
            >
              {contextHint}
            </p>
            {showRootMobileHint ? (
              <p className="terminal-mobile-hint">{TERMINAL_ROOT_MOBILE_HINT}</p>
            ) : null}
            {isTerminalPortfolio && !contactForm.active && portfolioPath.length === 0 && !terminalHelpOpen ? (
              <>
                <p className="terminal-beginner-hint">{TERMINAL_ROOT_BEGINNER_HINT}</p>
                <p className="terminal-tip">{TERMINAL_TIP}</p>
              </>
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

            {isTerminalPortfolio && contactForm.active ? (
              <div
                className="terminal-chip-list terminal-chip-list--shortcuts"
                role="list"
                aria-label="Form actions"
              >
                <button
                  type="button"
                  className="terminal-chip terminal-chip--shortcut"
                  role="listitem"
                  onClick={() => handleChipClick('cancel')}
                >
                  cancel
                </button>
              </div>
            ) : null}

            {isTerminalPortfolio && terminalHelpOpen && !contactForm.active ? (
              <div className="terminal-help-panel" role="region" aria-label="Terminal help">
                <p className="terminal-help-panel__heading">{helpPanel.listingHeading}</p>
                <ul className="terminal-help-panel__list terminal-help-panel__list--categories">
                  {helpPanel.listingItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {helpPanel.secondaryListingHeading ? (
                  <>
                    <p className="terminal-help-panel__heading">
                      {helpPanel.secondaryListingHeading}
                    </p>
                    <ul className="terminal-help-panel__list terminal-help-panel__list--categories">
                      {helpPanel.secondaryListingItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p className="terminal-help-panel__heading">Available commands</p>
                <TerminalHelpCommandList
                  commands={helpPanel.commands}
                  onCommandClick={handleChipClick}
                />
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

      {showModePicker && !showMarkGpt ? (
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
      ) : null}
      </div>
      )}

    </div>
  )
}

export default TerminalLanding

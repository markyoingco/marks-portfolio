import { resolveRootFolderEnter } from './terminalPortfolioData'

export const MODE_PICKER_DISMISSED_KEY = 'terminal-mode-picker-dismissed'

export const DEFAULT_WEBPAGE = {
  screen: 'home',
  aboutPanel: 0,
  portfolioCategory: 'Portfolio Platform',
  testimonialSlug: null,
}

export const DEFAULT_TERMINAL = {
  showModePicker: true,
  showMarkAi: false,
  mode: 'terminal-portfolio',
  portfolioPath: [],
  bootHistory: null,
}

function cloneBootHistory(bootHistory) {
  if (!Array.isArray(bootHistory)) {
    return null
  }

  return bootHistory.map((entry) => ({
    ...entry,
    output: Array.isArray(entry.output) ? [...entry.output] : entry.output,
  }))
}

function buildRootFolderBootHistory(folderSlug) {
  const enter = resolveRootFolderEnter(folderSlug)
  if (!enter) {
    return null
  }

  const destinationPrompt = `PS C:\\Users\\visitor\\terminal\\${enter.path.join('\\')}> `

  return {
    portfolioPath: [...enter.path],
    bootHistory: [
      {
        input: `cd ${folderSlug}`,
        output: [...enter.lines],
        prompt: destinationPrompt,
        formMode: false,
      },
    ],
  }
}

export function cloneSnapshot(snapshot) {
  return {
    route: snapshot.route,
    entryKey: snapshot.entryKey ?? 0,
    terminal: {
      ...snapshot.terminal,
      portfolioPath: [...snapshot.terminal.portfolioPath],
      bootHistory: cloneBootHistory(snapshot.terminal.bootHistory),
    },
    webpage: { ...snapshot.webpage },
  }
}

export function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function createInitialSnapshot() {
  const showModePicker =
    sessionStorage.getItem(MODE_PICKER_DISMISSED_KEY) !== 'true'

  return {
    route: getRouteFromHash(),
    entryKey: 0,
    terminal: {
      ...DEFAULT_TERMINAL,
      showModePicker,
    },
    webpage: { ...DEFAULT_WEBPAGE },
  }
}

export function createModePickerSnapshot(snapshot) {
  return {
    ...cloneSnapshot(snapshot),
    route: 'terminal',
    terminal: {
      showModePicker: true,
      showMarkAi: false,
      mode: 'terminal-portfolio',
      portfolioPath: [],
      bootHistory: null,
    },
  }
}

export function createFreshWebpageEntry(snapshot) {
  return {
    ...cloneSnapshot(snapshot),
    route: 'webpage',
    entryKey: (snapshot.entryKey ?? 0) + 1,
    webpage: { ...DEFAULT_WEBPAGE },
    terminal: {
      ...snapshot.terminal,
      showModePicker: false,
      showMarkAi: false,
      bootHistory: null,
    },
  }
}

export function createFreshTerminalEntry(snapshot, options = {}) {
  const boot =
    typeof options.enterRootFolder === 'string'
      ? buildRootFolderBootHistory(options.enterRootFolder)
      : null

  return {
    ...cloneSnapshot(snapshot),
    route: 'terminal',
    entryKey: (snapshot.entryKey ?? 0) + 1,
    terminal: {
      showModePicker: false,
      showMarkAi: false,
      mode: DEFAULT_TERMINAL.mode,
      portfolioPath: boot ? boot.portfolioPath : [],
      bootHistory: boot ? boot.bootHistory : null,
    },
  }
}

export function createMarkAiEntry(snapshot) {
  return {
    ...cloneSnapshot(snapshot),
    route: 'terminal',
    entryKey: (snapshot.entryKey ?? 0) + 1,
    terminal: {
      showModePicker: false,
      showMarkAi: true,
      mode: DEFAULT_TERMINAL.mode,
      portfolioPath: [],
      bootHistory: null,
    },
  }
}

export function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
  return hash === 'webpage' ? 'webpage' : 'terminal'
}

export function buildPathFromSnapshot(snapshot) {
  if (snapshot.route === 'webpage') {
    return `${window.location.pathname}${window.location.search}#webpage`
  }

  return `${window.location.pathname}${window.location.search}`
}

export function syncSessionFromSnapshot(snapshot) {
  if (snapshot.terminal.showModePicker) {
    sessionStorage.removeItem(MODE_PICKER_DISMISSED_KEY)
    return
  }

  if (snapshot.route === 'terminal') {
    sessionStorage.setItem(MODE_PICKER_DISMISSED_KEY, 'true')
  }
}

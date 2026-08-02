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

/** Webpage screen keys that may appear in public deep-link hashes. */
export const WEBPAGE_SCREENS = [
  'home',
  'about',
  'portfolio',
  'testimonials',
  'travel',
  'contact',
]

/**
 * Parse location hash into route + webpage screen.
 * Supported public deep links:
 * - (empty) → Terminal
 * - #webpage or #webpage/home → Webpage home
 * - #webpage/<screen> → Webpage screen
 * - #<screen> shorthand for portfolio|testimonials|travel|contact|about|home
 * Dead/unsupported hashes such as #markai fall back to Terminal (MarkAI opens in-app).
 *
 * @param {string} [hashRaw]
 * @returns {{ route: 'webpage' | 'terminal', screen: string }}
 */
export function parseNavFromHash(hashRaw) {
  const raw =
    typeof hashRaw === 'string'
      ? hashRaw
      : typeof window !== 'undefined'
        ? window.location.hash
        : ''
  const hash = String(raw).replace(/^#/, '').trim().toLowerCase()

  if (!hash) {
    return { route: 'terminal', screen: 'home' }
  }

  if (hash === 'webpage' || hash === 'webpage/home') {
    return { route: 'webpage', screen: 'home' }
  }

  if (hash.startsWith('webpage/')) {
    const screen = hash.slice('webpage/'.length).split(/[/?#]/)[0] || 'home'
    if (WEBPAGE_SCREENS.includes(screen)) {
      return { route: 'webpage', screen }
    }
    return { route: 'webpage', screen: 'home' }
  }

  if (WEBPAGE_SCREENS.includes(hash)) {
    return { route: 'webpage', screen: hash }
  }

  return { route: 'terminal', screen: 'home' }
}

export function createInitialSnapshot() {
  const showModePicker =
    sessionStorage.getItem(MODE_PICKER_DISMISSED_KEY) !== 'true'
  const nav = parseNavFromHash()

  return {
    route: nav.route,
    entryKey: 0,
    terminal: {
      ...DEFAULT_TERMINAL,
      showModePicker,
    },
    webpage: {
      ...DEFAULT_WEBPAGE,
      screen: nav.screen,
    },
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
  return parseNavFromHash().route
}

/**
 * Build the public URL path+hash for a snapshot.
 * Home uses #webpage; other screens use #<screen> (e.g. #travel).
 */
export function buildPathFromSnapshot(snapshot) {
  if (snapshot.route === 'webpage') {
    const screen = snapshot.webpage?.screen || 'home'
    const fragment = screen === 'home' ? 'webpage' : screen
    return `${window.location.pathname}${window.location.search}#${fragment}`
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

export const MODE_PICKER_DISMISSED_KEY = 'terminal-mode-picker-dismissed'

export const DEFAULT_WEBPAGE = {
  screen: 'home',
  aboutPanel: 0,
  portfolioCategory: 'Personal Build',
}

export const DEFAULT_TERMINAL = {
  showModePicker: true,
  showMarkGpt: false,
  mode: 'landing',
  portfolioPath: [],
}

export function cloneSnapshot(snapshot) {
  return {
    route: snapshot.route,
    terminal: {
      ...snapshot.terminal,
      portfolioPath: [...snapshot.terminal.portfolioPath],
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
      showMarkGpt: false,
      mode: 'landing',
      portfolioPath: [],
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

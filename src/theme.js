export const THEME_STORAGE_KEY = 'portfolio-theme'

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
}

/** First-time default — cinematic dark portfolio; not system preference. */
export const DEFAULT_THEME = THEMES.DARK

function isValidTheme(value) {
  return value === THEMES.LIGHT || value === THEMES.DARK
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isValidTheme(stored)) {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }

  return DEFAULT_THEME
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function persistTheme(theme) {
  if (!isValidTheme(theme)) {
    return
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage may be unavailable
  }
}

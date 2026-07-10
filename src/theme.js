export const THEME_STORAGE_KEY = 'portfolio-theme'

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === THEMES.LIGHT || stored === THEMES.DARK) {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }

  return THEMES.DARK
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage may be unavailable
  }
}

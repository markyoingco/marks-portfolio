import { useCallback, useEffect, useRef, useState } from 'react'
import PortfolioApp from './PortfolioApp'
import TerminalLanding from './TerminalLanding'
import ThemeToggle from './ThemeToggle'
import {
  buildPathFromSnapshot,
  cloneSnapshot,
  createFreshTerminalEntry,
  createFreshWebpageEntry,
  createInitialSnapshot,
  createMarkAiEntry,
  createModePickerSnapshot,
  DEFAULT_WEBPAGE,
  getRouteFromHash,
  snapshotsEqual,
  syncSessionFromSnapshot,
} from './appNavigation'
import { applyTheme, getStoredTheme, persistTheme, THEMES } from './theme'
import './TerminalLanding.css'

function GlobalBackButton({ onClick }) {
  return (
    <button
      type="button"
      className="app-back-btn"
      aria-label="Go back"
      title="Go back"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function GlobalMenuButton({ onClick }) {
  return (
    <button
      type="button"
      className="app-menu-btn"
      aria-label="Main menu"
      title="Main menu"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
      </svg>
    </button>
  )
}

export default function App() {
  const [snapshot, setSnapshot] = useState(createInitialSnapshot)
  const [theme, setTheme] = useState(getStoredTheme)
  const historyStackRef = useRef([])
  const skipPopRef = useRef(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK
      persistTheme(next)
      return next
    })
  }, [])

  const pushHistoryState = useCallback((nextSnapshot, { replace = false } = {}) => {
    const url = buildPathFromSnapshot(nextSnapshot)
    const state = { appNav: cloneSnapshot(nextSnapshot) }

    if (replace) {
      window.history.replaceState(state, '', url)
      return
    }

    skipPopRef.current = true
    window.history.pushState(state, '', url)
  }, [])

  const navigateTo = useCallback(
    (getNextSnapshot, { recordHistory = true, replace = false } = {}) => {
      setSnapshot((current) => {
        const next =
          typeof getNextSnapshot === 'function'
            ? getNextSnapshot(cloneSnapshot(current))
            : cloneSnapshot(getNextSnapshot)

        if (!snapshotsEqual(current, next)) {
          if (recordHistory) {
            historyStackRef.current.push(cloneSnapshot(current))
          }

          syncSessionFromSnapshot(next)
          pushHistoryState(next, { replace })
        } else if (replace) {
          pushHistoryState(next, { replace: true })
        }

        return next
      })
    },
    [pushHistoryState],
  )

  const returnToMainMenu = useCallback(() => {
    navigateTo((current) => createModePickerSnapshot(current))
  }, [navigateTo])

  const goBack = useCallback(() => {
    const previous = historyStackRef.current.pop()

    if (!previous) {
      navigateTo((current) => {
        if (current.terminal.showModePicker) {
          return current
        }

        return createModePickerSnapshot(current)
      }, { recordHistory: false })
      return
    }

    navigateTo(previous, { recordHistory: false })
  }, [navigateTo])

  useEffect(() => {
    const initial = createInitialSnapshot()
    historyStackRef.current = []
    setSnapshot(initial)
    pushHistoryState(initial, { replace: true })

    const onPopState = (event) => {
      if (skipPopRef.current) {
        skipPopRef.current = false
        return
      }

      if (event.state?.appNav) {
        if (historyStackRef.current.length > 0) {
          historyStackRef.current.pop()
        }

        const restored = cloneSnapshot(event.state.appNav)
        syncSessionFromSnapshot(restored)
        setSnapshot(restored)
        return
      }

      const route = getRouteFromHash()
      setSnapshot((current) => {
        const next = cloneSnapshot(current)
        next.route = route
        syncSessionFromSnapshot(next)
        return next
      })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [pushHistoryState])

  const navigateWebpage = useCallback(
    (webpagePartial, options) => {
      navigateTo(
        (current) => ({
          ...current,
          route: 'webpage',
          webpage: { ...current.webpage, ...webpagePartial },
        }),
        options,
      )
    },
    [navigateTo],
  )

  const navigateTerminal = useCallback(
    (terminalPartial, options) => {
      navigateTo(
        (current) => ({
          ...current,
          route: 'terminal',
          terminal: {
            ...current.terminal,
            ...terminalPartial,
            ...(Array.isArray(terminalPartial.portfolioPath)
              ? { portfolioPath: [...terminalPartial.portfolioPath] }
              : {}),
          },
        }),
        options,
      )
    },
    [navigateTo],
  )

  const enterWebpageMode = useCallback(() => {
    navigateTo((current) => createFreshWebpageEntry(current))
  }, [navigateTo])

  const enterWebpagePortfolio = useCallback(
    (portfolioCategory) => {
      navigateTo((current) => ({
        ...cloneSnapshot(current),
        route: 'webpage',
        entryKey: (current.entryKey ?? 0) + 1,
        webpage: {
          ...DEFAULT_WEBPAGE,
          screen: 'portfolio',
          portfolioCategory,
        },
        terminal: {
          ...current.terminal,
          showModePicker: false,
          showMarkAi: false,
        },
      }))
    },
    [navigateTo],
  )

  const enterWebpageScreen = useCallback(
    (screen, webpageExtras = {}) => {
      navigateTo((current) => ({
        ...cloneSnapshot(current),
        route: 'webpage',
        entryKey: (current.entryKey ?? 0) + 1,
        webpage: {
          ...DEFAULT_WEBPAGE,
          screen,
          ...webpageExtras,
        },
        terminal: {
          ...current.terminal,
          showModePicker: false,
          showMarkAi: false,
        },
      }))
    },
    [navigateTo],
  )

  const enterTerminalFresh = useCallback(() => {
    navigateTo((current) => createFreshTerminalEntry(current))
  }, [navigateTo])

  const enterMarkAi = useCallback(() => {
    navigateTo((current) => createMarkAiEntry(current))
  }, [navigateTo])

  return (
    <>
      <div className="app-background" aria-hidden="true">
        <div className="background background--dark" />
        <div className="background background--light" />
      </div>
      <header className="app-global-chrome" aria-label="Site controls">
        <div className="app-global-chrome__left">
          <GlobalBackButton onClick={goBack} />
          <GlobalMenuButton onClick={returnToMainMenu} />
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {snapshot.route === 'webpage' ? (
        <div className="portfolio-route">
          <PortfolioApp
            key={`webpage-${snapshot.entryKey}`}
            webpage={snapshot.webpage}
            onWebpageNavigate={navigateWebpage}
            onReturnToMainMenu={returnToMainMenu}
            onEnterTerminal={enterTerminalFresh}
            onEnterMarkAi={enterMarkAi}
          />
        </div>
      ) : (
        <TerminalLanding
          key={`terminal-${snapshot.entryKey}`}
          terminal={snapshot.terminal}
          onTerminalNavigate={navigateTerminal}
          onEnterWebpage={enterWebpageMode}
          onEnterWebpagePortfolio={enterWebpagePortfolio}
          onEnterWebpageScreen={enterWebpageScreen}
          onEnterTerminalFresh={enterTerminalFresh}
          onAppGoBack={goBack}
          onReturnToMainMenu={returnToMainMenu}
        />
      )}
    </>
  )
}

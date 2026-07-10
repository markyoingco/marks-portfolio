import { useCallback, useEffect, useState } from 'react'
import PortfolioApp from './PortfolioApp'
import TerminalLanding from './TerminalLanding'
import './TerminalLanding.css'

function getRouteFromLocation() {
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()

  if (hash === 'webpage') {
    return 'webpage'
  }

  return 'terminal'
}

function buildPath(route) {
  if (route === 'terminal') {
    return `${window.location.pathname}${window.location.search}`
  }

  return `${window.location.pathname}${window.location.search}#${route}`
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromLocation)

  const navigate = useCallback((nextRoute) => {
    window.history.pushState({ route: nextRoute }, '', buildPath(nextRoute))
    setRoute(nextRoute)
  }, [])

  useEffect(() => {
    const syncRoute = () => {
      setRoute(getRouteFromLocation())
    }

    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)

    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
    }
  }, [])

  if (route === 'webpage') {
    return (
      <div className="portfolio-route">
        <button
          type="button"
          className="terminal-return-btn"
          onClick={() => navigate('terminal')}
        >
          Back to Terminal
        </button>
        <PortfolioApp key="portfolio" />
      </div>
    )
  }

  return <TerminalLanding onEnterWebpage={() => navigate('webpage')} />
}

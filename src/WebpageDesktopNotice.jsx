import { useEffect, useState } from 'react'

export const WEBPAGE_DESKTOP_NOTICE_KEY = 'marks-portfolio-webpage-desktop-notice'
const NOTICE_MS = 8000
const MOBILE_QUERY = '(max-width: 900px)'

const NOTICE_TEXT =
  'Best experienced on desktop or a larger screen. Mobile viewing is supported, but some visual layouts are simplified for smaller screens.'

function hasSeenNotice() {
  try {
    return sessionStorage.getItem(WEBPAGE_DESKTOP_NOTICE_KEY) === '1'
  } catch {
    return true
  }
}

function markNoticeSeen() {
  try {
    sessionStorage.setItem(WEBPAGE_DESKTOP_NOTICE_KEY, '1')
  } catch {
    // Ignore private-mode / unavailable storage.
  }
}

export default function WebpageDesktopNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (hasSeenNotice()) return undefined
    if (!window.matchMedia(MOBILE_QUERY).matches) return undefined

    markNoticeSeen()
    setVisible(true)

    const timerId = window.setTimeout(() => {
      setVisible(false)
    }, NOTICE_MS)

    return () => window.clearTimeout(timerId)
  }, [])

  if (!visible) return null

  return (
    <div className="webpage-desktop-notice" role="status" aria-live="polite">
      <p className="webpage-desktop-notice__text">{NOTICE_TEXT}</p>
      <button
        type="button"
        className="webpage-desktop-notice__close"
        aria-label="Dismiss desktop viewing recommendation"
        onClick={() => setVisible(false)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  )
}

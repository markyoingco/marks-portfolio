import './ThemeToggle.css'

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'is-dark' : 'is-light'}`}
      role="switch"
      aria-checked={!isDark}
      aria-pressed={!isDark}
      aria-label={
        isDark
          ? 'Dark mode active. Switch to light mode'
          : 'Light mode active. Switch to dark mode'
      }
      onClick={onToggle}
    >
      <span className="theme-toggle__label-wrap" aria-hidden="true">
        <span className={`theme-toggle__label ${isDark ? 'is-visible' : ''}`}>
          DARK MODE
        </span>
        <span className={`theme-toggle__label ${!isDark ? 'is-visible' : ''}`}>
          LIGHT MODE
        </span>
      </span>

      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  )
}

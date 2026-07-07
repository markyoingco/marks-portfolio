import { useState } from 'react'
import './App.css'

// Minimal inline SVG icons (no external package needed).
const ICONS = {
  github: (
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2 0 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.3 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.3.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
  ),
  linkedin: (
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4V9Z" />
  ),
  email: (
    <path d="M2 5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5Zm2.4 1L12 11.6 19.6 6H4.4ZM20 7.5l-8 5.9-8-5.9V18h16V7.5Z" />
  ),
  instagram: (
    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.7 3.7 0 0 1-1.4-.9 3.7 3.7 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-.9 0-1.4.2-1.7.3-.4.2-.7.4-1 .7-.3.3-.5.6-.7 1-.1.3-.3.8-.3 1.7-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c0 .9.2 1.4.3 1.7.2.4.4.7.7 1 .3.3.6.5 1 .7.3.1.8.3 1.7.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c.9 0 1.4-.2 1.7-.3.4-.2.7-.4 1-.7.3-.3.5-.6.7-1 .1-.3.3-.8.3-1.7.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-.9-.2-1.4-.3-1.7a2.7 2.7 0 0 0-.7-1 2.7 2.7 0 0 0-1-.7c-.3-.1-.8-.3-1.7-.3-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5.1-3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
  ),
}

// Edit your social links here.
const SOCIALS = [
  {
    label: 'GitHub',
    href: 'https://github.com/markyoingco',
    icon: ICONS.github,
    external: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/mark-yoingco',
    icon: ICONS.linkedin,
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:markyoingco23@gmail.com',
    icon: ICONS.email,
    external: false,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/markyoingco/',
    icon: ICONS.instagram,
    external: true,
  },
]

// Screen keys drive the top nav and the active screen state.
const SCREENS = ['home', 'about', 'portfolio', 'blog', 'contact']

const ABOUT_PANEL_COUNT = 6

function AboutPhoto() {
  const [hasPhoto, setHasPhoto] = useState(true)

  if (hasPhoto) {
    return (
      <img
        className="about__photo"
        src="/about-photo.jpg"
        alt="Mark Yoingco"
        onError={() => setHasPhoto(false)}
      />
    )
  }

  return <div className="about__photo-placeholder" aria-hidden="true" />
}

function AboutPlaceholderCard({ title, hint }) {
  return (
    <div className="about__card about__card--center">
      <h2 className="about__heading">{title}</h2>
      <p className="about__hint">{hint}</p>
    </div>
  )
}

function AboutSection({ panel, onNext, onPrev, onGoTo }) {
  return (
    <div className="about">
      <div className="about__center">
        <div className="about__viewport">
          <div
            className="about__track"
            style={{ transform: `translateY(-${panel * 100}%)` }}
          >
            {/* 1 — Welcome */}
            <section className="about__panel">
              <div className="about__card about__card--welcome">
                <AboutPhoto />
                <div className="about__welcome-text">
                  <h2 className="about__heading">Welcome</h2>
                  <p className="about__hint">Add intro text here.</p>
                </div>
              </div>
            </section>

            {/* 2 — Education */}
            <section className="about__panel">
              <AboutPlaceholderCard
                title="Education"
                hint="Add education details here."
              />
            </section>

            {/* 3 — Experience */}
            <section className="about__panel">
              <AboutPlaceholderCard
                title="Experience"
                hint="Add experience details here."
              />
            </section>

            {/* 4 — Skills */}
            <section className="about__panel">
              <AboutPlaceholderCard title="Skills" hint="Add skills here." />
            </section>

            {/* 5 — Beyond Work */}
            <section className="about__panel">
              <AboutPlaceholderCard
                title="Beyond Work"
                hint="Add personal interests here."
              />
            </section>

            {/* 6 — Certificates */}
            <section className="about__panel">
              <AboutPlaceholderCard
                title="Certificates"
                hint="In Progress..."
              />
            </section>
          </div>
        </div>

        <div className="about__ui">
          <button
            type="button"
            className="about__arrow"
            onClick={onPrev}
            aria-label="Previous panel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <polyline points="6 15 12 9 18 15" />
            </svg>
          </button>

          <div className="about__dots">
            {Array.from({ length: ABOUT_PANEL_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                className={panel === i ? 'about__dot is-active' : 'about__dot'}
                onClick={() => onGoTo(i)}
                aria-label={`Go to panel ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="about__arrow"
            onClick={onNext}
            aria-label="Next panel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [activeScreen, setActiveScreen] = useState('home')
  const [aboutPanel, setAboutPanel] = useState(0)

  const nextAboutPanel = () => {
    setAboutPanel((p) => (p + 1) % ABOUT_PANEL_COUNT)
  }

  const prevAboutPanel = () => {
    setAboutPanel((p) => (p - 1 + ABOUT_PANEL_COUNT) % ABOUT_PANEL_COUNT)
  }

  return (
    <>
      {/* Fixed full-screen background image + dark overlay (on every screen) */}
      <div className="background" aria-hidden="true" />

      {/* Fixed top-center navigation (state-based, no scrolling) */}
      <nav className="nav">
        {SCREENS.map((name) => (
          <button
            key={name}
            type="button"
            className={activeScreen === name ? 'nav__link is-active' : 'nav__link'}
            onClick={() => setActiveScreen(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {/* Single full-screen viewport; only the active screen shows */}
      <main className="screen" data-screen={activeScreen}>
        {activeScreen === 'home' && (
          <div className="home">
            <h1 className="home__name">MARK YOINGCO</h1>
            <p className="home__subtitle">
              Entry-Level Software Developer · Full-Stack Applications ·
              Developer Tools · Data-Oriented Systems
            </p>

            <a
              className="resume-box"
              href="/Mark_Yoingco_Resume.pdf"
              download="Mark_Yoingco_Resume.pdf"
            >
              <span className="resume-box__label">Resume</span>
            </a>
          </div>
        )}

        {activeScreen === 'about' && (
          <AboutSection
            panel={aboutPanel}
            onNext={nextAboutPanel}
            onPrev={prevAboutPanel}
            onGoTo={setAboutPanel}
          />
        )}
      </main>

      {/* Fixed bottom-center social icons (on every screen) */}
      <div className="socials">
        {SOCIALS.map((social) => (
          <a
            key={social.label}
            href={social.href}
            aria-label={social.label}
            {...(social.external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {social.icon}
            </svg>
          </a>
        ))}
      </div>
    </>
  )
}

export default App

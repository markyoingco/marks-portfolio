import {
  useState,
  useRef,
  useMemo,
  useCallback,
  memo,
  useEffect,
} from 'react'
import {
  getPublishedTestimonials,
  TESTIMONIALS_COMING_SOON_DETAIL,
  TESTIMONIALS_COMING_SOON_LEAD,
  TESTIMONIALS_TITLE,
} from './testimonialsData'
import { BLOG_PHOTOS, BLOG_PHOTOS_BATCH } from './blogPhotosData'
import {
  buildPortfolioPlatformWebpageItems,
  PORTFOLIO_PLATFORM_SECTION,
} from './portfolioPlatformData'
import { RESUME_PDF_FILENAME, RESUME_PDF_PATH } from './resumeDocument'
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
const SCREENS = ['home', 'about', 'portfolio', 'testimonials', 'travel', 'contact']

const ABOUT_PANEL_COUNT = 6
const ABOUT_BEYOND_WORK_INDEX = 5
const ABOUT_EXPERIENCE_PANEL = 2
const ABOUT_SLIDE_MS = 550

function ThemeImageFrame({
  src,
  srcDark,
  srcLight,
  alt = '',
  frameClassName,
  placeholderClassName,
  placeholderLabel = 'Image Coming Soon',
}) {
  const [sharedFailed, setSharedFailed] = useState(false)
  const [darkFailed, setDarkFailed] = useState(false)
  const [lightFailed, setLightFailed] = useState(false)

  if (src) {
    if (sharedFailed) {
      return (
        <div className={placeholderClassName ?? `${frameClassName} ${frameClassName}--placeholder`}>
          <span className="about-image-frame__label">{placeholderLabel}</span>
        </div>
      )
    }

    return (
      <div className={frameClassName}>
        <img
          className="theme-image theme-image--shared"
          src={src}
          alt={alt}
          width={320}
          height={400}
          decoding="async"
          onError={() => setSharedFailed(true)}
        />
      </div>
    )
  }

  if (darkFailed && lightFailed) {
    return (
      <div className={placeholderClassName ?? `${frameClassName} ${frameClassName}--placeholder`}>
        <span className="about-image-frame__label">{placeholderLabel}</span>
      </div>
    )
  }

  return (
    <div className={frameClassName}>
      {!darkFailed ? (
        <img
          className="theme-image theme-image--dark"
          src={srcDark}
          alt={alt}
          width={400}
          height={250}
          decoding="async"
          onError={() => setDarkFailed(true)}
        />
      ) : null}
      {!lightFailed ? (
        <img
          className="theme-image theme-image--light"
          src={srcLight}
          alt={alt}
          width={400}
          height={250}
          decoding="async"
          onError={() => setLightFailed(true)}
        />
      ) : null}
    </div>
  )
}

function AboutImageFrame({ src, srcDark, srcLight, alt = '', variant }) {
  const frameClassName = variant
    ? `about-image-frame about-image-frame--${variant}`
    : 'about-image-frame'

  return (
    <ThemeImageFrame
      src={src}
      srcDark={srcDark}
      srcLight={srcLight}
      alt={alt}
      frameClassName={frameClassName}
      placeholderClassName="about-image-frame about-image-frame--placeholder"
    />
  )
}

function EducationImageFrame({ srcDark, srcLight, alt = '' }) {
  return (
    <ThemeImageFrame
      srcDark={srcDark}
      srcLight={srcLight}
      alt={alt}
      frameClassName="education-image-frame"
      placeholderClassName="education-image-frame education-image-frame--placeholder"
    />
  )
}

const EDUCATION_COURSEWORK = [
  'Data Structures',
  'Algorithms',
  'Operating Systems',
  'Hardware Systems',
  'Programming Languages',
  'Data Science',
  'Data Mining',
  'Calculus I & II',
  'Linear Algebra & Matrix Theory',
  'Discrete Mathematics',
  'Statistical Methods',
]

const EXPERIENCE_JOBS = [
  {
    id: 'audio-visual-technician',
    title: 'Audio-Visual Technician',
    org: 'Marquette University',
    date: 'Feb 2025 - May 2026',
    description:
      'Supported live campus events by setting up, operating, and troubleshooting laptops, projectors, microphones, speakers, lighting, wiring, remotes, presentation equipment, and sound systems for conferences, concerts, and productions.',
  },
  {
    id: 'information-desk-specialist-manager',
    title: 'Information Desk Specialist Manager',
    org: 'Marquette University',
    date: 'Jan 2024 - May 2026',
    description:
      'Managed front-desk and building operations by creating staff schedules, reviewing shifts and timesheets, running staff meetings, monitoring security cameras, coordinating room schedules, handling access requests, incidents, visitors, students, and staff communication.',
  },
  {
    id: 'risk-manager-merchandise-chair',
    title: 'Risk Manager & Merchandise Chair',
    org: 'Sigma Chi - Marquette University',
    date: 'Leadership & Involvement',
    description:
      'Helped keep chapter operations organized and safe while also leading creative merchandise ideas that represented the fraternity\'s identity, legacy, and campus presence.',
  },
  {
    id: 'hollister',
    title: 'Hollister',
    org: 'Hollister Co.',
    date: 'Summer 2025',
    description:
      'Supported retail operations by opening and closing the store, operating the register, assisting customers, restocking merchandise, unpacking inventory shipments, and organizing sales floor items.',
  },
  {
    id: 'assistant-building-manager',
    title: 'Assistant Building Manager',
    org: 'Marquette University',
    date: 'Jun 2024 - Dec 2024',
    description:
      'Coordinated room setups for events, managed building access, supported department communication through radio, and helped maintain smooth building operations during campus events and daily activities.',
  },
  {
    id: 'chef-person-in-charge',
    title: 'Chef / Person in Charge',
    org: 'Panda Express - Gurnee, IL',
    date: 'May 2021 - Aug 2023',
    description:
      'Supported kitchen operations, food preparation, service quality, cleaning, restocking, and shift leadership. Trained new employees and helped guide team members during high-volume shifts.',
  },
  {
    id: 'assembly-line',
    title: 'Assembly Line',
    org: "Portillo's - Gurnee, IL",
    date: 'Oct 2020 - Apr 2021',
    description:
      'Supported kitchen operations, food preparation, drive-thru workflow, opening and closing tasks, and customer service in a fast-paced restaurant environment.',
  },
]

function ExperienceAccordion({ jobs, openExperienceId, onToggle }) {
  const itemRefs = useRef({})

  useEffect(() => {
    if (!openExperienceId) return undefined

    const item = itemRefs.current[openExperienceId]
    if (!item) return undefined

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    item.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })

    return undefined
  }, [openExperienceId])

  return (
    <div className="about__experience-scroll" aria-label="Experience roles">
      <div className="experience-accordion">
        {jobs.map((job) => {
          const isOpen = openExperienceId === job.id
          const triggerId = `experience-trigger-${job.id}`
          const contentId = `experience-content-${job.id}`

          return (
            <div
              key={job.id}
              ref={(node) => {
                itemRefs.current[job.id] = node
              }}
              className={`experience-accordion__item${isOpen ? ' is-open' : ''}`}
            >
            <h3 className="experience-accordion__heading">
              <button
                type="button"
                id={triggerId}
                className="experience-accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => onToggle(job.id)}
              >
                <span className="experience-accordion__trigger-main">
                  <span className="experience-accordion__title">{job.title}</span>
                  <span className="experience-accordion__org">{job.org}</span>
                </span>
                <span className="experience-accordion__icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={contentId}
              role="region"
              aria-labelledby={triggerId}
              aria-hidden={!isOpen}
              inert={!isOpen}
              className="experience-accordion__panel"
            >
              <div className="experience-accordion__panel-inner">
                <p className="experience-accordion__date">{job.date}</p>
                <p className="experience-accordion__desc">{job.description}</p>
              </div>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

const SKILLS_GROUPS = [
  {
    title: 'Languages',
    items: [
      'Python',
      'Java',
      'TypeScript / JavaScript',
      'SQL',
      'C',
      'C#',
      'HTML / CSS',
      'R',
    ],
  },
  {
    title: 'Technologies',
    items: [
      'React',
      'Vite',
      'Flask',
      'Socket.IO',
      'REST APIs',
      'Unity',
      'Judge0',
      'BirdBrain Finch 2.0',
    ],
  },
  {
    title: 'Tools & Testing',
    items: [
      'MySQL',
      'DBeaver',
      'Docker',
      'Docker Compose',
      'Git / GitHub',
      'Linux / WSL',
      'Figma',
      'Vite Testing',
      'Manual Testing',
      'Debugging',
    ],
  },
]

function AboutPlaceholderCard({ title, hint }) {
  return (
    <div className="about__card about__card--center">
      <div className="about__card-scroll">
        <h2 className="about__heading">{title}</h2>
        <p className="about__hint">{hint}</p>
      </div>
    </div>
  )
}

function AboutSection({ panel, onNext, onPrev, onGoTo, onGoToTravel }) {
  const viewportRef = useRef(null)
  const slideTimerRef = useRef(null)
  const scrollResetTimerRef = useRef(null)
  const skipSlideLockRef = useRef(true)
  const [openExperienceId, setOpenExperienceId] = useState(null)
  const [navLocked, setNavLocked] = useState(false)

  const panelClassName = (index) =>
    index === panel ? 'about__panel is-active' : 'about__panel'

  const handleExperienceToggle = useCallback((id) => {
    setOpenExperienceId((current) => (current === id ? null : id))
  }, [])

  const runAfterExperienceCollapse = useCallback(
    (action) => {
      if (panel === ABOUT_EXPERIENCE_PANEL && openExperienceId !== null) {
        setOpenExperienceId(null)
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(action)
        })
        return
      }
      action()
    },
    [panel, openExperienceId],
  )

  const resetActivePanelScroll = useCallback(() => {
    const activePanel = viewportRef.current?.querySelector('.about__panel.is-active')
    if (!activePanel) return

    activePanel.scrollTop = 0

    activePanel
      .querySelectorAll('.about__card-scroll, .about__experience-scroll')
      .forEach((el) => {
        el.scrollTop = 0
      })

    const isMobile = window.matchMedia('(max-width: 900px)').matches
    if (isMobile) {
      document.querySelector('.screen[data-screen="about"]')?.scrollTo(0, 0)
    }
  }, [])

  useEffect(() => {
    if (panel !== ABOUT_EXPERIENCE_PANEL) {
      setOpenExperienceId(null)
    }
  }, [panel])

  useEffect(() => {
    if (skipSlideLockRef.current) {
      skipSlideLockRef.current = false
      resetActivePanelScroll()
      return undefined
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) {
      setNavLocked(false)
      resetActivePanelScroll()
      return undefined
    }

    setNavLocked(true)
    slideTimerRef.current = window.setTimeout(() => {
      setNavLocked(false)
    }, ABOUT_SLIDE_MS)

    if (scrollResetTimerRef.current !== null) {
      clearTimeout(scrollResetTimerRef.current)
    }

    scrollResetTimerRef.current = window.setTimeout(() => {
      resetActivePanelScroll()
      scrollResetTimerRef.current = null
    }, ABOUT_SLIDE_MS)

    return () => {
      if (slideTimerRef.current !== null) {
        clearTimeout(slideTimerRef.current)
        slideTimerRef.current = null
      }
      if (scrollResetTimerRef.current !== null) {
        clearTimeout(scrollResetTimerRef.current)
        scrollResetTimerRef.current = null
      }
    }
  }, [panel, resetActivePanelScroll])

  return (
    <div className="about">
      <div className="about__center">
        <div className="about__viewport" ref={viewportRef}>
          <div
            className="about__track"
            style={{ '--about-panel-index': panel }}
          >
            <section className={panelClassName(0)} aria-hidden={panel !== 0}>
              <div className="about__panel-stack">
                <div className="about__card about__card--welcome">
                  <div className="about__card-scroll">
                    <AboutImageFrame
                      variant="welcome"
                      src="/images/about/welcome-photo-color.jpg"
                      alt="Mark Yoingco graduation"
                    />
                    <div className="about__welcome-text">
                      <h2 className="about__heading">Welcome to My Personal Site</h2>
                      <div className="about__copy">
                        <p className="about__body">
                          Hello, my name is Mark Yoingco. I&apos;m a recent Computer
                          Science graduate from Marquette University and an
                          entry-level software developer focused on full-stack
                          applications, developer tools, data-oriented systems,
                          and practical software projects.
                        </p>
                        <p className="about__body">
                          My background includes hands-on experience with
                          React/Vite, Flask, MySQL, Socket.IO, Docker, Unity/C#,
                          C/UNIX programming, testing, and debugging through
                          academic projects, solo work, and two senior design
                          capstones.
                        </p>
                        <p className="about__body">
                          I enjoy building systems that are useful, organized, and
                          grounded in real problems - whether that means supporting
                          live competition platforms, improving grading tools,
                          connecting web apps to robotics, or creating interactive
                          software experiences.
                        </p>
                        <p className="about__closing">
                          To get to know me beyond the resume, click below.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="about__action-btn"
                  onClick={() => runAfterExperienceCollapse(() => onGoTo(ABOUT_BEYOND_WORK_INDEX))}
                >
                  Learn More
                </button>
              </div>
            </section>

            <section className={panelClassName(1)} aria-hidden={panel !== 1}>
              <div className="about__card about__card--education">
                <div className="about__card-scroll">
                  <EducationImageFrame
                    srcDark="/images/about/education-photo.jpg"
                    srcLight="/images/about/education-photo-color.jpg"
                    alt="Marquette University diploma"
                  />
                  <div className="about__welcome-text">
                    <h2 className="about__heading">Education</h2>
                    <div className="about__copy">
                      <h3 className="about__subheading">B.S. Computer Science</h3>
                      <p className="about__meta-line">Marquette University</p>
                      <p className="about__meta-line">Milwaukee, WI</p>
                      <p className="about__meta-line">May 2026</p>
                      <p className="about__body">
                        Completed a Bachelor of Science in Computer Science with
                        coursework across software development, systems,
                        mathematics, data, and computer science fundamentals.
                      </p>
                      <div className="about__coursework">
                        <p className="about__coursework-label">Relevant Coursework</p>
                        <ul className="coursework-list">
                          {EDUCATION_COURSEWORK.map((course) => (
                            <li key={course} className="coursework-pill">
                              {course}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={panelClassName(2)} aria-hidden={panel !== 2}>
              <div className="about__card about__card--center about__card--experience">
                <div className="about__experience-header">
                  <h2 className="about__heading">Experience</h2>
                  <p className="about__experience-intro">
                    My experience spans campus technology, operations, leadership,
                    and customer-facing roles - each strengthening my
                    communication, troubleshooting, organization, and leadership
                    skills.
                  </p>
                </div>
                <ExperienceAccordion
                  jobs={EXPERIENCE_JOBS}
                  openExperienceId={openExperienceId}
                  onToggle={handleExperienceToggle}
                />
              </div>
            </section>

            <section className={panelClassName(3)} aria-hidden={panel !== 3}>
              <div className="about__card about__card--center about__card--skills">
                <div className="about__card-scroll">
                  <h2 className="about__heading">Skills</h2>
                  <div className="skills-grid">
                    {SKILLS_GROUPS.map((group) => (
                      <div key={group.title} className="skills-group">
                        <h3 className="skills-group__title">{group.title}</h3>
                        <ul className="skills-group__list">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={panelClassName(4)} aria-hidden={panel !== 4}>
              <AboutPlaceholderCard
                title="Certificates"
                hint="In Progress..."
              />
            </section>

            <section className={panelClassName(5)} aria-hidden={panel !== 5}>
              <div className="about__panel-stack">
                <div className="about__card about__card--welcome">
                  <div className="about__card-scroll">
                    <AboutImageFrame
                      srcDark="/images/about/beyond-work-photo.jpg"
                      srcLight="/images/about/beyond-work-photo-color.jpg"
                      alt="Beyond Work"
                    />
                    <div className="about__welcome-text">
                      <h2 className="about__heading">Beyond Work</h2>
                      <div className="about__copy">
                        <p className="about__body">
                          Outside of technology, fitness has always been one of my
                          biggest passions. I started with powerlifting and now spend
                          much of my free time pursuing bodybuilding, building a
                          healthier lifestyle, and staying disciplined through
                          training.
                        </p>
                        <p className="about__body">
                          I&apos;m drawn to growth, ambition, purpose, and becoming
                          the best version of myself. Outside the gym, I stay inspired
                          through hiking, reading, music, travel, and places that give
                          me a new way to see life.
                        </p>
                        <p className="about__body">
                          Photography is how I keep the story with me. Cities, views,
                          trips, and small moments all give me something worth
                          capturing. Every picture holds a memory, a feeling, or a
                          place that still means something.
                        </p>
                        <p className="about__closing">
                          You can see more of my travel and lifestyle photos in
                          Travel.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="about__action-btn"
                  onClick={onGoToTravel}
                >
                  Travel Pics
                </button>
              </div>
            </section>
          </div>
        </div>

        <div className="about__ui">
          <button
            type="button"
            className="about__arrow"
            onClick={() => runAfterExperienceCollapse(onPrev)}
            disabled={navLocked}
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
                onClick={() => runAfterExperienceCollapse(() => onGoTo(i))}
                disabled={navLocked}
                aria-label={`Go to panel ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="about__arrow"
            onClick={() => runAfterExperienceCollapse(onNext)}
            disabled={navLocked}
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

const BlogPhoto = memo(function BlogPhoto({ src, location }) {
  const [hasImage, setHasImage] = useState(true)

  const handleImageError = useCallback(() => {
    console.warn(`Blog image failed to load: ${src}`)
    setHasImage(false)
  }, [src])

  return (
    <article className="blog-photo">
      <div className="blog-photo__media">
        {hasImage ? (
          <img
            src={src}
            alt={location}
            width={800}
            height={1000}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={handleImageError}
          />
        ) : (
          <div className="blog-photo__fallback">
            <span>Photo Coming Soon</span>
          </div>
        )}
      </div>
      <p className="blog-photo__location">{location}</p>
    </article>
  )
})

const PORTFOLIO_TABS = [
  { label: 'Personal', title: 'Portfolio Platform' },
  { label: 'Capstones', title: 'Senior Design Capstones' },
  { label: 'Systems', title: 'Systems Programming' },
  { label: 'Software Design', title: 'Software Design and Analysis' },
  { label: 'Games', title: 'Programming Computer Games' },
  { label: 'Data', title: 'Data Science and Machine Learning' },
  { label: 'Merch', title: 'Creative Leadership' },
  { label: 'Service', title: 'Service' },
]

const PORTFOLIO_SECTIONS = [
  {
    title: PORTFOLIO_PLATFORM_SECTION.title,
    description: PORTFOLIO_PLATFORM_SECTION.description,
    layout: 'platform',
    items: buildPortfolioPlatformWebpageItems(),
  },
  {
    title: 'Senior Design Capstones',
    description:
      'Team-based capstone projects focused on real users, full-stack systems, testing, and project delivery.',
    layout: 'standard',
    items: [
      {
        title: 'Abacus Senior Design Capstone',
        subtitle: 'Senior Design Capstone',
        description:
          'Senior design web platform contribution focused on Eagle Division features, including chat box interfaces, textbox submission workflows, and frontend updates for student interaction.',
        role: '',
        impact: '',
        tech: ['React', 'TypeScript', 'Flask', 'MySQL', 'Docker', 'Git'],
        image: '/images/portfolio/abacus.png',
        imageFit: 'contain',
        imagePosition: 'center center',
        website: 'https://github.com/musyslab/Abacus',
        github: '',
        demo: '',
        proof: '',
      },
      {
        title: 'TA-Bot / MAAT Senior Design Capstone',
        subtitle: 'Senior Design Capstone',
        description:
          'Senior design chatbot platform contribution supporting course help workflows, student assistance, and TA/admin tooling through a full-stack web application.',
        role: '',
        impact: '',
        tech: ['React', 'TypeScript', 'Flask', 'MySQL', 'Docker', 'Git'],
        image: '/images/portfolio/tabot.png',
        imageFit: 'contain',
        imagePosition: 'center center',
        website: 'https://github.com/musyslab/MAAT',
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
  {
    title: 'Software Design and Analysis',
    description:
      'Projects focused on software architecture, interface design, real-time interaction, and system behavior.',
    layout: 'standard',
    items: [
      {
        title: 'Finch Robot Web Controller',
        subtitle: 'Software Design and Analysis',
        description:
          'Team robotics project for controlling BirdBrain Finch 2.0 robots through browser pages, room codes, multiplayer lobbies, and real-time controller screens. Contributed heavily to frontend controller screens, UI planning, setup documentation, and Flask-based interaction flow.',
        role: '',
        impact: '',
        tech: [
          'Python',
          'Flask',
          'JavaScript',
          'HTML',
          'CSS',
          'Socket.IO',
          'BirdBrain Finch',
          'BlueBird Connector',
        ],
        image: '/images/portfolio/finch-controller.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        website: 'https://github.com/markyoingco/BirdVroomVroom',
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
  {
    title: 'Systems Programming',
    description:
      'Lower-level programming work focused on C, UNIX, Linux, memory, files, and operating system concepts.',
    layout: 'standard',
    items: [
      {
        title: 'Operating Systems C Projects',
        subtitle: 'Systems Programming',
        description:
          'Public portfolio documentation for Operating Systems coursework in C, covering UNIX/Linux development, process control, memory, file systems, and systems-level debugging. Original course repositories may require access.',
        role: '',
        impact: '',
        tech: ['C', 'UNIX', 'Linux', 'WSL', 'Git'],
        image: '/images/portfolio/operating-systems-c.svg',
        imageFit: 'contain',
        website: 'https://github.com/markyoingco/operating-systems-c-projects',
        secondaryLinks: [
          {
            label: 'Shared course repo',
            url: 'https://github.com/Marquette-Operating-Systems-Course/XINU26-ayazdani1-myoingco',
          },
          {
            label: 'Solo course repo',
            url: 'https://github.com/Marquette-Operating-Systems-Course/XINU26-myoingco-SOLO',
          },
        ],
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
  {
    title: 'Programming Computer Games',
    description:
      'Game development projects focused on Unity, C#, physics, collisions, scoring, enemies, and gameplay systems.',
    layout: 'standard',
    items: [
      {
        title: 'Space SHMUP',
        subtitle: 'Programming Computer Games',
        description:
          'Unity 2D arcade shooter inspired by classic space shooters, built with player movement, projectile firing, enemy behavior, collision handling, scoring, and game-state logic.',
        tech: [
          'Unity',
          'C#',
          '2D Physics',
          'Game Objects',
          'Prefabs',
          'Collision Detection',
        ],
        image: '/images/portfolio/space-shmup.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        website: 'https://github.com/markyoingco/space-shmup-unity',
        github: '',
        demo: '',
        proof: '',
      },
      {
        title: 'Mission Demolition',
        subtitle: 'Programming Computer Games',
        description:
          'Unity physics-based projectile game focused on aiming, launching, collisions, structural targets, and scene-based gameplay logic.',
        tech: [
          'Unity',
          'C#',
          'Physics',
          'Colliders',
          'Rigidbody',
          'Scene Management',
        ],
        image: '/images/portfolio/mission-demolition.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        website: 'https://github.com/markyoingco/mission-demolition-unity',
        github: '',
        demo: '',
        proof: '',
      },
      {
        title: 'Apple Picker',
        subtitle: 'Programming Computer Games',
        description:
          'Unity arcade-style game built with falling objects, basket controls, score tracking, high score persistence, lives, collision detection, and scene restart behavior.',
        tech: [
          'Unity',
          'C#',
          'Prefabs',
          'Collision Detection',
          'UI',
          'PlayerPrefs',
        ],
        image: '/images/portfolio/apple-picker.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        website: 'https://github.com/markyoingco/apple-picker-unity',
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
  {
    title: 'Data Science and Machine Learning',
    description:
      'Data-focused projects involving cleaning, analysis, visualization, prediction, and interpretation.',
    layout: 'standard',
    items: [
      {
        title: 'Marquette Basketball Predictor 2023-24',
        subtitle: 'Machine Learning / Data Mining',
        description:
          'Machine learning project using Marquette basketball game data, Random Forest feature importance, and Logistic Regression to predict wins and losses.',
        role: '',
        impact: '',
        tech: [
          'Python',
          'Pandas',
          'Scikit-learn',
          'Matplotlib',
          'Machine Learning',
          'Logistic Regression',
          'Random Forest',
        ],
        image: '/images/portfolio/featureimportancechart.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        website:
          'https://github.com/markyoingco/marquette-basketball-predictor-2024',
        github: '',
        demo: '',
        proof: '',
      },
      {
        title: 'Sleep Efficiency Analysis',
        subtitle: 'Data Analysis / Machine Learning',
        description:
          'Analyzed Kaggle sleep efficiency data with cleaning, visualization, VIF checks, and linear regression to explore factors related to sleep quality.',
        role: '',
        impact: '',
        tech: [
          'Python',
          'Pandas',
          'Seaborn',
          'Matplotlib',
          'Scikit-learn',
          'Statsmodels',
          'Linear Regression',
          'Data Visualization',
        ],
        image: '/images/portfolio/linear-regression-predictions.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        website: 'https://github.com/markyoingco/sleep-efficiency-analysis',
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
  {
    title: 'Creative Leadership',
    description:
      'Design and leadership work connected to merchandise, branding, organizations, and campus involvement.',
    layout: 'compact',
    items: [
      {
        title: 'Sigma Chi Merchandise',
        subtitle: 'Creative Leadership',
        description:
          'Merchandise design proof, including hoodies, t-shirts, and polos created as Merchandise Chair.',
        role: '',
        impact: '',
        tech: [],
        images: [
          '/images/portfolio/merch/sigma-chi-merch-01.png',
          '/images/portfolio/merch/sigma-chi-merch-02.jpg',
          '/images/portfolio/merch/sigma-chi-merch-03.png',
          '/images/portfolio/merch/sigma-chi-merch-04.png',
          '/images/portfolio/merch/sigma-chi-merch-05.png',
        ],
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
  {
    title: 'Service',
    description:
      'Volunteer and service experiences that show teamwork, community involvement, and contribution beyond classwork.',
    layout: 'compact',
    items: [
      {
        title: 'Feed My Starving Children',
        subtitle: 'Service',
        description:
          'Volunteer experience supporting food packing and service work focused on helping communities through organized group effort.',
        role: '',
        impact: '',
        tech: [],
        image: '/images/portfolio/service/FMSC.png',
        imageFit: 'contain',
        website: 'https://www.fmsc.org/locations/libertyville-il',
        github: '',
        demo: '',
        proof: '',
      },
    ],
  },
]

function PortfolioImage({
  src,
  alt,
  imageFit = 'cover',
  imagePosition = 'center center',
  imageAspectRatio = '',
  placeholderLines = null,
}) {
  const [hasImage, setHasImage] = useState(true)

  if (!src || !hasImage) {
    const lines =
      Array.isArray(placeholderLines) && placeholderLines.length > 0
        ? placeholderLines
        : ['Image Coming Soon']

    return (
      <div
        className="portfolio-card__media portfolio-card__media--placeholder"
        style={
          imageAspectRatio
            ? { '--portfolio-media-ratio': imageAspectRatio }
            : undefined
        }
      >
        {lines.map((line) => (
          <span key={line} className="portfolio-card__placeholder-line">
            {line}
          </span>
        ))}
      </div>
    )
  }

  const hasMatchedAspectRatio = Boolean(imageAspectRatio)
  const mediaClass =
    imageFit === 'contain' && !hasMatchedAspectRatio
      ? 'portfolio-card__media portfolio-card__media--contain'
      : imageFit === 'contain'
        ? 'portfolio-card__media portfolio-card__media--object-contain'
        : 'portfolio-card__media'

  const mediaStyle = {
    ...(imageAspectRatio ? { '--portfolio-media-ratio': imageAspectRatio } : {}),
  }

  return (
    <div className={mediaClass} style={mediaStyle}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: imagePosition }}
        onError={() => setHasImage(false)}
      />
    </div>
  )
}

function PortfolioImageGrid({ images, alt }) {
  const [failedIndexes, setFailedIndexes] = useState(() => new Set())

  const handleError = (index) => {
    setFailedIndexes((prev) => {
      if (prev.has(index)) {
        return prev
      }
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }

  const visibleCount = images.length - failedIndexes.size

  if (visibleCount === 0) {
    return (
      <div className="portfolio-card__media portfolio-card__media--placeholder">
        <span>Image Coming Soon</span>
      </div>
    )
  }

  const gridClass =
    images.length === 5
      ? 'portfolio-card__media-grid portfolio-card__media-grid--5'
      : 'portfolio-card__media-grid'

  return (
    <div className="portfolio-card__media portfolio-card__media--grid">
      <div className={gridClass}>
        {images.map((src, index) => (
          <div key={src} className="portfolio-card__media-cell">
            {!failedIndexes.has(index) ? (
              <img
                src={src}
                alt={`${alt} ${index + 1}`}
                loading="lazy"
                decoding="async"
                onError={() => handleError(index)}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function PortfolioCardMedia({ item }) {
  const images = Array.isArray(item.images)
    ? item.images.filter((src) => Boolean(src))
    : []

  if (images.length > 1) {
    return <PortfolioImageGrid images={images} alt={item.title} />
  }

  const imageAlt = item.imageAlt || item.title

  if (images.length === 1) {
    return (
      <PortfolioImage
        src={images[0]}
        alt={imageAlt}
        imageFit={item.imageFit}
        imagePosition={item.imagePosition}
        imageAspectRatio={item.imageAspectRatio}
      />
    )
  }

  return (
    <PortfolioImage
      src={item.image}
      alt={imageAlt}
      imageFit={item.imageFit}
      imagePosition={item.imagePosition}
      imageAspectRatio={item.imageAspectRatio}
      placeholderLines={item.placeholderLines}
    />
  )
}

function PortfolioCard({ item, onModeAction }) {
  const hasLinks = item.github || item.demo || item.proof
  const hasMeta = item.role || item.impact
  const hasTech = item.tech && item.tech.length > 0
  const hasModeAction = Boolean(item.modeAction?.mode && onModeAction)

  return (
    <article className="portfolio-card">
      <PortfolioCardMedia item={item} />
      <div className="portfolio-card__body">
        <h3 className="portfolio-card__title">
          {item.website ? (
            <a
              className="portfolio-card__title-link"
              href={item.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {item.subtitle && (
          <p className="portfolio-card__subtitle">{item.subtitle}</p>
        )}
        {item.status && (
          <p className="portfolio-card__status">{item.status}</p>
        )}
        {item.description && (
          <p className="portfolio-card__description">{item.description}</p>
        )}
        {item.secondaryLinks && item.secondaryLinks.length > 0 && (
          <p className="portfolio-card__secondary-links">
            Also:{' '}
            {item.secondaryLinks.map((link, index) => (
              <span key={link.url}>
                {index > 0 && ', '}
                <a
                  className="portfolio-card__secondary-link"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </p>
        )}
        {hasMeta && (
          <div className="portfolio-card__meta">
            {item.role && <p className="portfolio-card__role">{item.role}</p>}
            {item.impact && (
              <p className="portfolio-card__impact">{item.impact}</p>
            )}
          </div>
        )}
        {hasTech && (
          <ul className="portfolio-card__tech">
            {item.tech.map((tag) => (
              <li key={tag} className="portfolio-tech-pill">
                {tag}
              </li>
            ))}
          </ul>
        )}
        {(hasLinks || hasModeAction) && (
          <div className="portfolio-card__actions">
            {hasModeAction && (
              <button
                type="button"
                className="about__action-btn portfolio-card__btn"
                onClick={() => onModeAction(item.modeAction.mode)}
              >
                {item.modeAction.label}
              </button>
            )}
            {item.github && (
              <a
                className="about__action-btn portfolio-card__btn"
                href={item.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            )}
            {item.demo && (
              <a
                className="about__action-btn portfolio-card__btn"
                href={item.demo}
                target="_blank"
                rel="noopener noreferrer"
              >
                Demo
              </a>
            )}
            {item.proof && (
              <a
                className="about__action-btn portfolio-card__btn"
                href={item.proof}
                target="_blank"
                rel="noopener noreferrer"
              >
                Proof
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function PortfolioSection({ activeCategory, onCategoryChange, onModeAction }) {
  const resolvedCategory =
    activeCategory === 'Personal Build' ? PORTFOLIO_PLATFORM_SECTION.title : activeCategory
  const selectedSection = PORTFOLIO_SECTIONS.find(
    (section) => section.title === resolvedCategory,
  )

  if (!selectedSection) {
    return null
  }

  const itemCount = selectedSection.items.length
  const panelClass =
    selectedSection.layout === 'compact'
      ? 'portfolio-panel portfolio-panel--compact'
      : selectedSection.layout === 'platform'
        ? 'portfolio-panel portfolio-panel--platform'
        : 'portfolio-panel'

  return (
    <div className="portfolio">
      <div className="portfolio__inner">
        <header className="portfolio__header">
          <h1 className="portfolio__title">Portfolio</h1>
          <p className="portfolio__intro">
            A collection of software projects, capstone work, class projects,
            creative leadership, and service experiences that show what I have
            built, contributed to, and learned through computer science, design,
            teamwork, and real problem solving.
          </p>
        </header>

        <nav className="portfolio-tabs" aria-label="Portfolio categories">
          {PORTFOLIO_TABS.map((tab) => (
            <button
              key={tab.title}
              type="button"
              className={
                resolvedCategory === tab.title
                  ? 'portfolio-tab is-active'
                  : 'portfolio-tab'
              }
              onClick={() => onCategoryChange(tab.title)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className={panelClass} aria-label={selectedSection.title}>
          <div className="portfolio-panel__header">
            <h2 className="portfolio-panel__title">{selectedSection.title}</h2>
            <p className="portfolio-panel__description">
              {selectedSection.description}
            </p>
          </div>
          <div className="portfolio-panel__rule" aria-hidden="true" />
          <div
            className={`portfolio-card-grid portfolio-card-grid--count-${Math.min(itemCount, 3)}${
              selectedSection.layout === 'platform' ? ' portfolio-card-grid--platform' : ''
            }`}
          >
            {selectedSection.items.map((item) => (
              <PortfolioCard
                key={item.title}
                item={item}
                onModeAction={onModeAction}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function TestimonialHeadshot({ srcDark, srcLight, alt = '' }) {
  return (
    <ThemeImageFrame
      srcDark={srcDark}
      srcLight={srcLight}
      alt={alt}
      frameClassName="testimonial-headshot"
      placeholderClassName="testimonial-headshot testimonial-headshot--placeholder"
      placeholderLabel="Photo Coming Soon"
    />
  )
}

function TestimonialsSection() {
  const publishedTestimonials = getPublishedTestimonials()
  const isComingSoon = publishedTestimonials.length === 0

  return (
    <div className={`testimonials${isComingSoon ? ' testimonials--coming-soon' : ''}`}>
      <div className="testimonials__inner">
        <header
          className={`testimonials__header${
            isComingSoon ? ' testimonials__header--coming-soon' : ''
          }`}
        >
          <h1 className="testimonials__title">{TESTIMONIALS_TITLE}</h1>
          {isComingSoon ? (
            <>
              <p className="testimonials__coming-soon-lead">{TESTIMONIALS_COMING_SOON_LEAD}</p>
              <p className="testimonials__coming-soon-detail">{TESTIMONIALS_COMING_SOON_DETAIL}</p>
            </>
          ) : null}
        </header>

        {publishedTestimonials.map((item) => (
          <div key={item.name} className="testimonials__block">
            <div className="testimonials__rule" aria-hidden="true" />
            <article className="testimonial-feature">
              <div className="testimonial-feature__media">
                <TestimonialHeadshot
                  srcDark={item.imageDark}
                  srcLight={item.imageLight}
                  alt={item.name}
                />
              </div>
              <div className="testimonial-feature__content">
                <blockquote className="testimonial-feature__quote">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                {item.linkedin ? (
                  <a
                    href={item.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.name} LinkedIn`}
                    className="testimonial-feature__name testimonial-name-link"
                  >
                    {item.name}
                  </a>
                ) : (
                  <p className="testimonial-feature__name">{item.name}</p>
                )}
                <p className="testimonial-feature__role">{item.role}</p>
              </div>
            </article>
            <div className="testimonials__rule" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BlogSection() {
  const blogRef = useRef(null)
  const photoCount = BLOG_PHOTOS.length
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(BLOG_PHOTOS_BATCH, photoCount),
  )
  const safeVisibleCount = Math.min(visibleCount, photoCount)
  const visiblePhotos = useMemo(
    () => BLOG_PHOTOS.slice(0, safeVisibleCount),
    [safeVisibleCount],
  )
  const hasMorePhotos = safeVisibleCount < photoCount
  const canShowLess = safeVisibleCount > BLOG_PHOTOS_BATCH

  const handleLoadMore = useCallback(() => {
    setVisibleCount((count) =>
      Math.min(count + BLOG_PHOTOS_BATCH, photoCount),
    )
  }, [photoCount])

  const handleShowLess = useCallback(() => {
    setVisibleCount(BLOG_PHOTOS_BATCH)
    blogRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="blog" ref={blogRef}>
      <div className="blog__inner">
        <header className="blog__intro">
          <h1 className="blog__title">Caught in Motion</h1>
          <p className="blog__body">
            Every picture has a story behind it. Some come from places I have
            visited, some come from moments I wanted to remember, and some are
            scenes that felt too real not to keep.
          </p>
          <p className="blog__body">
            Outside of work, photography is how I capture travel, lifestyle,
            growth, and the parts of life that feel cinematic and personal.
          </p>
          <p className="blog__body">
            For more pictures, check out my VSCO.
          </p>
          <a
            className="blog-vsco-link"
            href="https://vsco.co/markyoingco/gallery"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="VSCO"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6Zm0 2.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Z" />
            </svg>
            <span>VSCO</span>
          </a>
        </header>

        <div className="blog__grid">
          {visiblePhotos.map((photo) => (
            <BlogPhoto
              key={photo.src}
              src={photo.src}
              location={photo.location}
            />
          ))}
        </div>

        {(hasMorePhotos || canShowLess) && (
          <div className="blog__actions">
            {hasMorePhotos && (
              <button
                type="button"
                className="about__action-btn blog__load-more"
                onClick={handleLoadMore}
              >
                Load More
              </button>
            )}
            {canShowLess && (
              <button
                type="button"
                className="about__action-btn blog__show-less"
                onClick={handleShowLess}
              >
                Show Less
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ContactSection() {
  const [formStatus, setFormStatus] = useState('idle')
  const [formMessage, setFormMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const firstName = formData.get('firstName')?.toString().trim() ?? ''
    const lastName = formData.get('lastName')?.toString().trim() ?? ''
    const email = formData.get('email')?.toString().trim() ?? ''
    const phone = formData.get('phone')?.toString().trim() ?? ''
    const message = formData.get('message')?.toString().trim() ?? ''

    if (!firstName || !lastName || !email || !message) {
      setFormStatus('error')
      setFormMessage('Please fill in all required fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormStatus('error')
      setFormMessage('Please enter a valid email address.')
      return
    }

    setFormStatus('submitting')
    setFormMessage('')

    try {
      const response = await fetch('/api/contact.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          message,
        }),
      })

      const data = await response.json().catch(() => null)

      if (response.ok && data?.success) {
        setFormStatus('success')
        setFormMessage(
          data.message || 'Thank you! Your message has been sent successfully.',
        )
        form.reset()
        return
      }

      setFormStatus('error')
      setFormMessage(
        data?.message ||
          'Something went wrong. Please try again or email me directly.',
      )
    } catch {
      setFormStatus('error')
      setFormMessage(
        'Unable to send your message right now. Please try again or email me directly.',
      )
    }
  }

  const noticeClassName =
    formStatus === 'success'
      ? 'contact__notice contact__notice--success'
      : formStatus === 'error'
        ? 'contact__notice contact__notice--error'
        : 'contact__notice'

  return (
    <div className="contact">
      <div className="contact__card">
        <h1 className="contact__title">Ready for the Next Move.</h1>

        <form className="contact__form" onSubmit={handleSubmit} noValidate>
          <div className="contact__row">
            <label className="contact__field">
              <span className="contact__label">
                First Name <span className="contact__req">*</span>
              </span>
              <input type="text" name="firstName" autoComplete="given-name" required />
            </label>
            <label className="contact__field">
              <span className="contact__label">
                Last Name <span className="contact__req">*</span>
              </span>
              <input type="text" name="lastName" autoComplete="family-name" required />
            </label>
          </div>

          <label className="contact__field">
            <span className="contact__label">
              Email <span className="contact__req">*</span>
            </span>
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <label className="contact__field">
            <span className="contact__label">Phone</span>
            <input type="tel" name="phone" autoComplete="tel" />
          </label>

          <label className="contact__field contact__field--message">
            <span className="contact__label">
              Message <span className="contact__req">*</span>
            </span>
            <textarea name="message" rows={5} required />
          </label>

          <button
            type="submit"
            className="about__action-btn contact__submit"
            disabled={formStatus === 'submitting'}
          >
            {formStatus === 'submitting' ? 'Submitting...' : 'Submit'}
          </button>

          {formMessage && <p className={noticeClassName}>{formMessage}</p>}
        </form>

        <div className="contact__links">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              {...(social.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function PortfolioApp({
  webpage,
  onWebpageNavigate,
  onReturnToMainMenu,
  onEnterTerminal,
  onEnterMarkGpt,
}) {
  const { screen: activeScreen, aboutPanel, portfolioCategory } = webpage
  const [menuOpen, setMenuOpen] = useState(false)

  const nextAboutPanel = () => {
    onWebpageNavigate({
      aboutPanel: (aboutPanel + 1) % ABOUT_PANEL_COUNT,
    })
  }

  const prevAboutPanel = () => {
    onWebpageNavigate({
      aboutPanel: (aboutPanel - 1 + ABOUT_PANEL_COUNT) % ABOUT_PANEL_COUNT,
    })
  }

  const goToScreen = (screen) => {
    onWebpageNavigate({ screen })
    setMenuOpen(false)
  }

  const goToAboutPanel = (panel) => {
    onWebpageNavigate({ aboutPanel: panel })
  }

  const handleReturnToMainMenu = () => {
    setMenuOpen(false)
    onReturnToMainMenu?.()
  }

  const handleModeAction = useCallback(
    (mode) => {
      if (mode === 'terminal') {
        onEnterTerminal?.()
        return
      }

      if (mode === 'markgpt') {
        onEnterMarkGpt?.()
      }
    },
    [onEnterTerminal, onEnterMarkGpt],
  )

  useEffect(() => {
    setMenuOpen(false)
  }, [activeScreen])

  useEffect(() => {
    if (!menuOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  useEffect(() => {
    window.scrollTo(0, 0)
    requestAnimationFrame(() => {
      document.querySelector('.screen')?.scrollTo(0, 0)
      document
        .querySelectorAll('.portfolio-panel, .contact__card')
        .forEach((el) => {
          el.scrollTop = 0
        })
    })
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelector('.screen')?.scrollTo(0, 0)
      document
        .querySelectorAll('.portfolio-panel, .contact__card')
        .forEach((el) => {
          el.scrollTop = 0
        })
    })
  }, [activeScreen])

  return (
    <div className={menuOpen ? 'app-shell app-shell--menu-open' : 'app-shell'}>
      {/* Mobile hamburger header (tablet/phone only via CSS) */}
      <header className="nav-mobile">
        <button
          type="button"
          className="nav-mobile__toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </header>

      {menuOpen && (
        <div className="nav-overlay" role="dialog" aria-modal="true" aria-label="Site menu">
          <button
            type="button"
            className="nav-overlay__close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
          <nav className="nav-overlay__nav">
            {SCREENS.map((name) => (
              <button
                key={name}
                type="button"
                className={
                  activeScreen === name
                    ? 'nav-overlay__link is-active'
                    : 'nav-overlay__link'
                }
                onClick={() => goToScreen(name)}
              >
                {name}
              </button>
            ))}
            <div className="nav-overlay__divider" aria-hidden="true" />
            <button
              type="button"
              className="nav-overlay__link nav-overlay__link--menu"
              onClick={handleReturnToMainMenu}
            >
              Main Menu
            </button>
          </nav>
        </div>
      )}

      {/* Fixed top-center navigation - desktop only via CSS */}
      <nav className="nav nav--desktop">
        {SCREENS.map((name) => (
          <button
            key={name}
            type="button"
            className={activeScreen === name ? 'nav__link is-active' : 'nav__link'}
            onClick={() => goToScreen(name)}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          className="nav__link nav__link--menu"
          onClick={handleReturnToMainMenu}
        >
          Main Menu
        </button>
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
              href={RESUME_PDF_PATH}
              download={RESUME_PDF_FILENAME}
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
            onGoTo={goToAboutPanel}
            onGoToTravel={() => goToScreen('travel')}
          />
        )}

        {activeScreen === 'portfolio' && (
          <PortfolioSection
            activeCategory={portfolioCategory}
            onCategoryChange={(category) =>
              onWebpageNavigate({ portfolioCategory: category })
            }
            onModeAction={handleModeAction}
          />
        )}

        {activeScreen === 'contact' && <ContactSection />}

        {activeScreen === 'testimonials' && <TestimonialsSection />}

        {activeScreen === 'travel' && <BlogSection />}

        {/* Social icons: in scroll flow on mobile, fixed on desktop via CSS */}
        <div
          className={
            activeScreen === 'travel' ||
            activeScreen === 'portfolio' ||
            activeScreen === 'contact'
              ? 'socials socials--hidden'
              : 'socials'
          }
        >
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
      </main>
    </div>
  )
}

export default PortfolioApp

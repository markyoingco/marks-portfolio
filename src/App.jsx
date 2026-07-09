import { useState, useRef, useMemo, useCallback, memo, useEffect } from 'react'
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
const SCREENS = ['home', 'about', 'portfolio', 'testimonials', 'blog', 'contact']

const ABOUT_PANEL_COUNT = 6
const ABOUT_BEYOND_WORK_INDEX = 5

function AboutImageFrame({ src, alt = '' }) {
  const [hasImage, setHasImage] = useState(true)

  if (!hasImage) {
    return (
      <div className="about-image-frame about-image-frame--placeholder">
        <span className="about-image-frame__label">Image Coming Soon</span>
      </div>
    )
  }

  return (
    <div className="about-image-frame">
      <img src={src} alt={alt} onError={() => setHasImage(false)} />
    </div>
  )
}

function EducationDiplomaFrame({ src, alt = '' }) {
  const [hasImage, setHasImage] = useState(true)

  if (!hasImage) {
    return (
      <div className="education-image-frame education-image-frame--placeholder">
        <span className="about-image-frame__label">Image Coming Soon</span>
      </div>
    )
  }

  return (
    <div className="education-image-frame">
      <img src={src} alt={alt} onError={() => setHasImage(false)} />
    </div>
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
    title: 'Audio-Visual Technician',
    org: 'Marquette University',
    date: 'Feb 2025 - May 2026',
    description:
      'Supported live campus events by setting up, operating, and troubleshooting laptops, projectors, microphones, speakers, lighting, wiring, remotes, presentation equipment, and sound systems for conferences, concerts, and productions.',
  },
  {
    title: 'Information Desk Specialist Manager',
    org: 'Marquette University',
    date: 'Jan 2024 - May 2026',
    description:
      'Managed front-desk and building operations by creating staff schedules, reviewing shifts and timesheets, running staff meetings, monitoring security cameras, coordinating room schedules, handling access requests, incidents, visitors, students, and staff communication.',
  },
  {
    title: 'Risk Manager & Merchandise Chair',
    org: 'Sigma Chi - Marquette University',
    date: 'Leadership & Involvement',
    description:
      'Helped keep chapter operations organized and safe while also leading creative merchandise ideas that represented the fraternity\'s identity, legacy, and campus presence.',
  },
  {
    title: 'Teriyaki Madness',
    org: 'Gurnee, IL',
    date: 'Summer 2025',
    description:
      'Supported front-of-house and back-of-house operations by preparing food, taking customer orders, cleaning work areas, and assisting with opening and closing procedures.',
  },
  {
    title: 'Hollister',
    org: 'Gurnee, IL',
    date: 'Summer 2025',
    description:
      'Supported retail operations by opening and closing the store, operating the register, assisting customers, restocking merchandise, unpacking inventory shipments, and organizing sales floor items.',
  },
  {
    title: 'Assistant Building Manager',
    org: 'Marquette University',
    date: 'Jun 2024 - Dec 2024',
    description:
      'Coordinated room setups for events, managed building access, supported department communication through radio, and helped maintain smooth building operations during campus events and daily activities.',
  },
  {
    title: 'Chef / Person in Charge',
    org: 'Panda Express - Gurnee, IL',
    date: 'May 2021 - Aug 2023',
    description:
      'Supported kitchen operations, food preparation, service quality, cleaning, restocking, and shift leadership. Trained new employees and helped guide team members during high-volume shifts.',
  },
  {
    title: 'Assembly Line',
    org: "Portillo's - Gurnee, IL",
    date: 'Oct 2020 - Apr 2021',
    description:
      'Supported kitchen operations, food preparation, drive-thru workflow, opening and closing tasks, and customer service in a fast-paced restaurant environment.',
  },
]

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
      <h2 className="about__heading">{title}</h2>
      <p className="about__hint">{hint}</p>
    </div>
  )
}

function AboutSection({ panel, onNext, onPrev, onGoTo, onGoToBlog }) {
  const viewportRef = useRef(null)

  useEffect(() => {
    const panels = viewportRef.current?.querySelectorAll('.about__panel')
    if (!panels) return
    panels.forEach((el, index) => {
      if (index === panel) {
        el.scrollTop = 0
      }
    })
  }, [panel])

  return (
    <div className="about">
      <div className="about__center">
        <div className="about__viewport" ref={viewportRef}>
          <div
            className="about__track"
            style={{ transform: `translateY(-${panel * 100}%)` }}
          >
            {/* 1 - Welcome */}
            <section className="about__panel">
              <div className="about__panel-stack">
                <div className="about__card about__card--welcome">
                  <AboutImageFrame src="/images/about/welcome-photo.jpg" alt="Mark Yoingco graduation" />
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
                <button
                  type="button"
                  className="about__action-btn"
                  onClick={() => onGoTo(ABOUT_BEYOND_WORK_INDEX)}
                >
                  Learn More
                </button>
              </div>
            </section>

            {/* 2 - Education */}
            <section className="about__panel">
              <div className="about__card about__card--education">
                <EducationDiplomaFrame
                  src="/images/about/education-photo.jpg"
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
            </section>

            {/* 3 - Experience */}
            <section className="about__panel">
              <div className="about__card about__card--center about__card--experience">
                <h2 className="about__heading">Experience</h2>
                <p className="about__experience-intro">
                  My experience spans campus technology, operations, leadership,
                  and customer-facing roles - each strengthening my
                  communication, troubleshooting, organization, and leadership
                  skills.
                </p>
                <div className="about__experience-list">
                  {EXPERIENCE_JOBS.map((job) => (
                    <article key={job.title} className="experience-entry">
                      <h3 className="experience-entry__title">{job.title}</h3>
                      <p className="experience-entry__org">{job.org}</p>
                      <p className="experience-entry__date">{job.date}</p>
                      <p className="experience-entry__desc">{job.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* 4 - Skills */}
            <section className="about__panel">
              <div className="about__card about__card--center about__card--skills">
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
            </section>

            {/* 5 - Certificates */}
            <section className="about__panel">
              <AboutPlaceholderCard
                title="Certificates"
                hint="In Progress..."
              />
            </section>

            {/* 6 - Beyond Work */}
            <section className="about__panel">
              <div className="about__panel-stack">
                <div className="about__card about__card--welcome">
                  <AboutImageFrame src="/images/about/beyond-work-photo.jpg" alt="Beyond Work" />
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
                        the best version of myself. Outside the gym, I enjoy hiking,
                        reading, listening to music, trying new food, traveling,
                        visiting museums, and taking pictures.
                      </p>
                      <p className="about__body">
                        Photography is one of the ways I like to tell a story.
                        Museums, cities, views, trips, and small moments all give
                        me something to capture. I like taking pictures because
                        they can hold a memory, a feeling, or a place without
                        needing too much explanation.
                      </p>
                      <p className="about__closing">
                        You can see more of my travel and lifestyle photos on the
                        blog.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="about__action-btn"
                  onClick={onGoToBlog}
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

const BLOG_PHOTOS_BATCH = 6

const BLOG_PHOTOS = [
  { order: 54, location: "Don Toliver", src: "/images/blog-optimized/54 Don Toliver.jpg" },
  { order: 53, location: "Summerfest", src: "/images/blog-optimized/53 Summerfest.jpg" },
  { order: 52, location: "More Kobe", src: "/images/blog-optimized/52 More Kobe.jpg" },
  { order: 51, location: "Graduation", src: "/images/blog-optimized/51 Graduation.jpg" },
  { order: 50, location: "Graduation", src: "/images/blog-optimized/50 Graduation.jpg" },
  { order: 49, location: "Getty Center, CA", src: "/images/blog-optimized/49 Getty Center, CA.jpg" },
  { order: 48, location: "Getty Center, CA", src: "/images/blog-optimized/48 Getty Center, CA.jpg" },
  { order: 47, location: "Getty Center, CA", src: "/images/blog-optimized/47 Getty Center, CA.jpg" },
  { order: 46, location: "Getty Center, CA", src: "/images/blog-optimized/46 Getty Center, CA.jpg" },
  { order: 45, location: "Griffith Observatory, CA", src: "/images/blog-optimized/45 Griffith Observatory, CA.jpg" },
  { order: 44, location: "San Diego", src: "/images/blog-optimized/44 San Diego.jpg" },
  { order: 43, location: "Pine Cove, CA", src: "/images/blog-optimized/43 Pine Cove, CA.jpg" },
  { order: 42, location: "Alpine Valley, WI", src: "/images/blog-optimized/42 Alpine Valley, WI.jpg" },
  { order: 41, location: "Nashville", src: "/images/blog-optimized/41 Nashville.jpg" },
  { order: 40, location: "Kobe", src: "/images/blog-optimized/40 Kobe.jpg" },
  { order: 39, location: "Social Candy, Milwaukee", src: "/images/blog-optimized/39 Social Candy, Milwaukee.jpg" },
  { order: 38, location: "Colosseum, Italy", src: "/images/blog-optimized/38 Colosseum, Italy.jpg" },
  { order: 37, location: "Colosseum, Italy", src: "/images/blog-optimized/37 Colosseum, Italy.jpg" },
  { order: 36, location: "Rome, Italy", src: "/images/blog-optimized/36 Rome, Italy.jpg" },
  { order: 35, location: "Rome, Italy", src: "/images/blog-optimized/35 Rome, Italy.jpg" },
  { order: 34, location: "Rome, Italy", src: "/images/blog-optimized/34 Rome, Italy.jpg" },
  { order: 32, location: "Rome, Italy", src: "/images/blog-optimized/32 Rome, Italy.jpg" },
  { order: 31, location: "Trevi Fountain, Italy", src: "/images/blog-optimized/31 Trevi Fountain, Italy.jpg" },
  { order: 30, location: "Vittoriano, Italy", src: "/images/blog-optimized/30 Vittoriano, Italy.jpg" },
  { order: 29, location: "Atrani, Italy", src: "/images/blog-optimized/29 Atrani, Italy.jpg" },
  { order: 28, location: "Positano, Italy", src: "/images/blog-optimized/28 Positano, Italy.jpg" },
  { order: 27, location: "Porto Di Amalfi, Italy", src: "/images/blog-optimized/27 Porto Di Amalfi, Italy.jpg" },
  { order: 26, location: "Atrani, Italy", src: "/images/blog-optimized/26 Atrani, Italy.jpg" },
  { order: 25.5, location: "Atrani, Italy", src: "/images/blog-optimized/25.5 Atrani, Italy.jpg" },
  { order: 25, location: "Atrani, Italy", src: "/images/blog-optimized/25 Atrani, Italy.jpg" },
  { order: 24, location: "Atrani, Italy", src: "/images/blog-optimized/24 Atrani, Italy.jpg" },
  { order: 23, location: "Fam", src: "/images/blog-optimized/23 Fam.jpg" },
  { order: 22, location: "Kensington, London", src: "/images/blog-optimized/22 Kensington, London.jpg" },
  { order: 21, location: "City Of Westminster, London", src: "/images/blog-optimized/21 City Of Westminster, London.jpg" },
  { order: 20, location: "Tower Hamlets, London", src: "/images/blog-optimized/20 Tower Hamlets, London.jpg" },
  { order: 19, location: "Soho, London", src: "/images/blog-optimized/19 Soho, London.jpg" },
  { order: 18, location: "Gymshark, London", src: "/images/blog-optimized/18 Gymshark, London.jpg" },
  { order: 17, location: "Gymshark, London", src: "/images/blog-optimized/17 Gymshark, London.jpg" },
  { order: 16, location: "London", src: "/images/blog-optimized/16 London.jpg" },
  { order: 15, location: "London", src: "/images/blog-optimized/15 London.jpg" },
  { order: 14, location: "London", src: "/images/blog-optimized/14 London.jpg" },
  { order: 13, location: "Ryse", src: "/images/blog-optimized/13 Ryse.jpg" },
  { order: 12, location: "Lake Louise, Canada", src: "/images/blog-optimized/12 Lake Louise, Canada.jpg" },
  { order: 11, location: "Lake Louise, Canada", src: "/images/blog-optimized/11 Lake Louise, Canada.jpg" },
  { order: 10, location: "Lake Louise Canada", src: "/images/blog-optimized/10 Lake Louise Canada.jpg" },
  { order: 9, location: "Lake Louise, Canada", src: "/images/blog-optimized/9 Lake Louise, Canada.jpg" },
  { order: 8, location: "✞", src: "/images/blog-optimized/8 ✞.jpg" },
  { order: 7, location: "1st Meet, 1st Place", src: "/images/blog-optimized/7 1st Meet, 1st Place.jpg" },
  { order: 6, location: "La Jolla Shores", src: "/images/blog-optimized/6 La Jolla Shores.jpg" },
  { order: 5, location: "San Clemente", src: "/images/blog-optimized/5 San Clemente.jpg" },
  { order: 4, location: "Cactus Jack", src: "/images/blog-optimized/4 Cactus Jack.jpg" },
  { order: 3, location: "Chicago", src: "/images/blog-optimized/3 Chicago.jpg" },
  { order: 2, location: "Las Vegas", src: "/images/blog-optimized/2 Las Vegas.jpg" },
  { order: 1, location: "Hawaii", src: "/images/blog-optimized/1 Hawaii.jpg" },
]

const PORTFOLIO_TABS = [
  { label: 'Personal', title: 'Personal Build' },
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
    title: 'Personal Build',
    description:
      'Independent projects built to represent my work, background, and personal brand.',
    layout: 'standard',
    items: [
      {
        title: 'Personal Portfolio Website',
        subtitle: 'Personal Build',
        description:
          'Personal portfolio website built to showcase software projects, technical experience, service work, merchandise design, and professional background.',
        role: '',
        impact: '',
        tech: ['React', 'Vite', 'JavaScript', 'CSS'],
        image: '/images/portfolio/personal-website.png',
        imageFit: 'cover',
        imagePosition: 'center center',
        github: '',
        demo: '',
        proof: '',
      },
    ],
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
}) {
  const [hasImage, setHasImage] = useState(true)

  if (!src || !hasImage) {
    return (
      <div className="portfolio-card__media portfolio-card__media--placeholder">
        <span>Image Coming Soon</span>
      </div>
    )
  }

  const mediaClass =
    imageFit === 'contain'
      ? 'portfolio-card__media portfolio-card__media--contain'
      : 'portfolio-card__media'

  return (
    <div className={mediaClass}>
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

  if (images.length === 1) {
    return (
      <PortfolioImage
        src={images[0]}
        alt={item.title}
        imageFit={item.imageFit}
        imagePosition={item.imagePosition}
      />
    )
  }

  return (
    <PortfolioImage
      src={item.image}
      alt={item.title}
      imageFit={item.imageFit}
      imagePosition={item.imagePosition}
    />
  )
}

function PortfolioCard({ item }) {
  const hasLinks = item.github || item.demo || item.proof
  const hasMeta = item.role || item.impact
  const hasTech = item.tech && item.tech.length > 0

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
        {hasLinks && (
          <div className="portfolio-card__actions">
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

function PortfolioSection() {
  const [activePortfolioCategory, setActivePortfolioCategory] =
    useState('Personal Build')

  const selectedSection = PORTFOLIO_SECTIONS.find(
    (section) => section.title === activePortfolioCategory,
  )

  if (!selectedSection) {
    return null
  }

  const itemCount = selectedSection.items.length
  const panelClass =
    selectedSection.layout === 'compact'
      ? 'portfolio-panel portfolio-panel--compact'
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
                activePortfolioCategory === tab.title
                  ? 'portfolio-tab is-active'
                  : 'portfolio-tab'
              }
              onClick={() => setActivePortfolioCategory(tab.title)}
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
            className={`portfolio-card-grid portfolio-card-grid--count-${Math.min(itemCount, 3)}`}
          >
            {selectedSection.items.map((item) => (
              <PortfolioCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

const TESTIMONIALS = [
  {
    image: '/images/testimonials/testimonial-1.jpg',
    quote:
      'Mark is one of my best friends who I\'ve known since our days of middle school basketball. He boasts a plethora of outstanding qualities that have stood out since our first practice together. He is one of the most dedicated and reliable individuals I know, applying no less than his absolute best to any team he is apart of. His perseverance and professionalism through school, life challenges, and the workplace proceeds his reputation as a respectful, hard working, and disciplined person with extensive work and projects to show for it. He\'s truly a valuable asset to have as a part of any team, and an even better friend.',
    name: 'Maxwell Zeisler',
    role: 'Accounting Student and Audit Intern @ Advisent',
    linkedin: 'https://www.linkedin.com/in/maxwell-zeisler123',
  },
]

function TestimonialHeadshot({ src, alt = '' }) {
  const [hasImage, setHasImage] = useState(true)

  if (!hasImage) {
    return (
      <div className="testimonial-headshot testimonial-headshot--placeholder">
        <span className="testimonial-headshot__label">Photo Coming Soon</span>
      </div>
    )
  }

  return (
    <div className="testimonial-headshot">
      <img src={src} alt={alt} onError={() => setHasImage(false)} />
    </div>
  )
}

function TestimonialsSection() {
  return (
    <div className="testimonials">
      <div className="testimonials__inner">
        <header className="testimonials__header">
          <h1 className="testimonials__title">Testimonials</h1>
          <p className="testimonials__subtitle">
            Words from people I have worked with, learned from, or built alongside.
          </p>
        </header>

        {TESTIMONIALS.map((item) => (
          <div key={item.name} className="testimonials__block">
            <div className="testimonials__rule" aria-hidden="true" />
            <article className="testimonial-feature">
              <div className="testimonial-feature__media">
                <TestimonialHeadshot src={item.image} alt={item.name} />
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
            just scenes I had to keep. I like photos that feel real, cinematic,
            and personal - the kind that say enough without needing too much
            explanation.
          </p>
          <p className="blog__body">
            Outside of work, photography is how I capture travel, lifestyle,
            growth, museums, and the moments that keep me moving. This is a small
            look into that side of me.
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
          <p className="blog__credit">
            All photography featured across this site was personally captured by
            me from my own camera roll.
          </p>
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
  const [formMessage, setFormMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setFormMessage(
      'Contact form connection coming soon. Please use email or socials for now.',
    )
  }

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

          {/* Captcha placeholder - connect real reCAPTCHA or form service later */}
          <div className="contact__captcha" aria-label="Captcha placeholder">
            <div className="contact__captcha-box" aria-hidden="true" />
            <span className="contact__captcha-text">I&apos;m not a robot</span>
          </div>

          <button type="submit" className="about__action-btn contact__submit">
            Submit
          </button>

          {formMessage && <p className="contact__notice">{formMessage}</p>}
        </form>

        <div className="contact__links">
          <a href="mailto:markyoingco23@gmail.com">Email</a>
          <a
            href="https://www.linkedin.com/in/mark-yoingco"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/markyoingco"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.instagram.com/markyoingco/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
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

  useEffect(() => {
    requestAnimationFrame(() => {
      document
        .querySelectorAll('.testimonials, .blog, .portfolio-panel, .contact__card')
        .forEach((el) => {
          el.scrollTop = 0
        })
    })
  }, [activeScreen])

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
              href="/documents/MarkYoingco_Resume_2026.pdf"
              download="MarkYoingco_Resume_2026.pdf"
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
            onGoToBlog={() => setActiveScreen('blog')}
          />
        )}

        {activeScreen === 'portfolio' && <PortfolioSection />}

        {activeScreen === 'contact' && <ContactSection />}

        {activeScreen === 'testimonials' && <TestimonialsSection />}

        {activeScreen === 'blog' && <BlogSection />}
      </main>

      {/* Fixed bottom-center social icons (hidden on Blog and Portfolio) */}
      <div
        className={
          activeScreen === 'blog' || activeScreen === 'portfolio'
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
    </>
  )
}

export default App

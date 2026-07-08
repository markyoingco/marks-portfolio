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
const SCREENS = ['home', 'about', 'portfolio', 'testimonials', 'blog', 'contact']

const ABOUT_PANEL_COUNT = 6
const ABOUT_BEYOND_WORK_INDEX = 5

function AboutImageFrame({ src, alt = '', fit = 'cover' }) {
  const [hasImage, setHasImage] = useState(true)

  if (!hasImage) {
    return (
      <div className="about-image-frame about-image-frame--placeholder">
        <span className="about-image-frame__label">Image Coming Soon</span>
      </div>
    )
  }

  const frameClass =
    fit === 'contain'
      ? 'about-image-frame about-image-frame--contain'
      : 'about-image-frame'

  return (
    <div className={frameClass}>
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
  return (
    <div className="about">
      <div className="about__center">
        <div className="about__viewport">
          <div
            className="about__track"
            style={{ transform: `translateY(-${panel * 100}%)` }}
          >
            {/* 1 - Welcome */}
            <section className="about__panel">
              <div className="about__panel-stack">
                <div className="about__card about__card--welcome">
                  <AboutImageFrame src="/welcome-photo.jpg" alt="Mark Yoingco graduation" />
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
                  src="/education-photo.jpg"
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
                  <AboutImageFrame src="/beyond-work-photo.jpg" alt="Beyond Work" />
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
                        reading, listening to music, taking pictures, trying new
                        food, and traveling whenever I can.
                      </p>
                      <p className="about__body">
                        Photography is one of the ways I like to tell a story.
                        Whether it is a city, a view, a trip, or a small moment, I
                        like capturing places and memories in a way that feels
                        personal.
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

function BlogPhoto({ src, index }) {
  const [hasImage, setHasImage] = useState(true)

  if (!hasImage) {
    return (
      <div className="blog-photo blog-photo--placeholder">
        <span>Photo Coming Soon</span>
      </div>
    )
  }

  return (
    <div className="blog-photo">
      <img
        src={src}
        alt={`Travel photo ${index}`}
        onError={() => setHasImage(false)}
      />
    </div>
  )
}

const BLOG_PHOTOS = [
  '/blog-photo-1.jpg',
  '/blog-photo-2.jpg',
  '/blog-photo-3.jpg',
  '/blog-photo-4.jpg',
  '/blog-photo-5.jpg',
  '/blog-photo-6.jpg',
]

const TESTIMONIALS = [
  {
    image: '/testimonials/testimonial-1.jpg',
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
  return (
    <div className="blog">
      <div className="blog__inner">
        <header className="blog__intro">
          <h1 className="blog__title">Caught in Motion</h1>
          <p className="blog__body">
            Every picture has a story behind it. Some are from places I have
            been, some are from moments I wanted to remember, and some are just
            scenes that caught my eye. I like photos that feel real, cinematic,
            and personal - the kind that say something without having to explain
            too much.
          </p>
          <p className="blog__body">
            Outside of work, I use photography as a way to capture travel,
            lifestyle, growth, and the moments that keep me moving. This section
            is a small look into that side of me.
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
          {BLOG_PHOTOS.map((src, index) => (
            <BlogPhoto key={src} src={src} index={index + 1} />
          ))}
        </div>
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
            onGoToBlog={() => setActiveScreen('blog')}
          />
        )}

        {activeScreen === 'contact' && <ContactSection />}

        {activeScreen === 'testimonials' && <TestimonialsSection />}

        {activeScreen === 'blog' && <BlogSection />}
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

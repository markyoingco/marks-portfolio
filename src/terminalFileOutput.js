export const FILE_CAT_SEPARATOR = '────────────────────────────────────────'

export const TERMINAL_SCROLL_MODE = {
  COMMAND: 'command',
  END: 'end',
}

export function buildFileCatOutput(filename, content) {
  return {
    kind: 'fileCat',
    filename,
    separator: FILE_CAT_SEPARATOR,
    content,
  }
}

export function titleLine(value) {
  return { type: 'title', value }
}

export function leadLine(value) {
  return { type: 'lead', value }
}

export function sectionLine(value) {
  return { type: 'section', value }
}

export function textLine(value) {
  return { type: 'text', value }
}

export function projectLine(index, value) {
  return { type: 'project', index, value }
}

export function bulletLine(value) {
  return { type: 'bullet', value }
}

export function roleLine(value) {
  return { type: 'role', value }
}

export function metaLine(value) {
  return { type: 'meta', value }
}

export function stackLabelLine(value) {
  return { type: 'stackLabel', value }
}

export function stackValueLine(value) {
  return { type: 'stackValue', value }
}

export function blankLine() {
  return { type: 'blank' }
}

export function linkLine(prefix, label, href, { external = true } = {}) {
  return {
    type: 'link',
    prefix,
    label,
    href,
    external,
  }
}

export function contactLinkLine(label, display, href, { external = true } = {}) {
  return linkLine(`${label}: `, display, href, { external })
}

export function linesToFileContent(lines) {
  return lines.map((line) => (line === '' ? blankLine() : textLine(line)))
}

export function isFileCatOutput(output) {
  return (
    output &&
    typeof output === 'object' &&
    !Array.isArray(output) &&
    output.kind === 'fileCat'
  )
}

export function buildResumeSummaryCatOutput() {
  return buildFileCatOutput('summary.txt', [
    titleLine('MARK YOINGCO'),
    leadLine('Recent Computer Science graduate from Marquette University'),
    blankLine(),
    sectionLine('TARGET ROLES'),
    textLine(
      'Entry-Level Software Developer · Full-Stack Developer · Developer Tools · Data-Oriented Systems · Technical Support',
    ),
    blankLine(),
    sectionLine('EDUCATION'),
    textLine('B.S. Computer Science'),
    textLine('Marquette University · Milwaukee, WI · May 2026'),
    blankLine(),
    sectionLine('CORE STACK'),
    stackLabelLine('Languages:'),
    stackValueLine(
      'Python · Java · TypeScript / JavaScript · SQL · C · C# · HTML / CSS · R',
    ),
    blankLine(),
    stackLabelLine('Technologies:'),
    stackValueLine('React · Vite · Flask · Socket.IO · REST APIs · Unity'),
    blankLine(),
    stackLabelLine('Tools & Testing:'),
    stackValueLine(
      'MySQL · DBeaver · Docker · Docker Compose · Git / GitHub · Linux / WSL · Figma · Vite Testing · Manual Testing · Debugging',
    ),
    blankLine(),
    sectionLine('FEATURED PROJECTS'),
    blankLine(),
    projectLine('01', 'Personal Portfolio Platform'),
    bulletLine(
      'Multi-mode portfolio with cinematic Webpage mode, interactive Terminal mode, responsive desktop and mobile layouts, dark/light themes, shared project content, and a PHP/MySQL contact backend on DreamHost.',
    ),
    bulletLine(
      'MarkGPT portfolio assistant is currently in development.',
    ),
    blankLine(),
    projectLine('02', 'Abacus Senior Design Capstone'),
    bulletLine(
      'Full-stack programming competition platform supporting submissions, teacher workflows, admin tools, leaderboards, help requests, and automated grading.',
    ),
    bulletLine(
      'Built Eagle Division workflows and helped support a successful live competition run for 200-300+ users.',
    ),
    blankLine(),
    projectLine('03', 'TA-Bot / MAAT Senior Design Capstone'),
    bulletLine('Academic grading platform for professors and teaching assistants.'),
    bulletLine(
      'Built rubric grading features, score recalculation, observed error tables, plagiarism-detection functionality, backend API integration, and Docker Compose testing workflows.',
    ),
    blankLine(),
    projectLine('04', 'Finch Web Controller'),
    bulletLine(
      'Web robotics platform for controlling BirdBrain Finch 2.0 robots through browser pages, room codes, multiplayer lobbies, and real-time controller screens.',
    ),
    bulletLine(
      'Led frontend development, Figma mockups, UI layouts, setup documentation, and Socket.IO communication structure.',
    ),
    blankLine(),
    projectLine('05', 'Space SHMUP'),
    bulletLine(
      'Unity arcade shooter built with C# gameplay systems including player movement, projectiles, enemy spawning, collisions, shields, power-ups, restart logic, and boss behavior.',
    ),
    blankLine(),
    projectLine('06', 'Operating Systems C Projects'),
    bulletLine(
      'C / UNIX / Linux coursework covering process control, memory, file systems, system-level debugging, and command-line development.',
    ),
    blankLine(),
    projectLine('07', 'Data Science Projects'),
    bulletLine(
      'Data-focused projects involving cleaning, analysis, visualization, prediction, feature importance, regression, and machine learning workflows.',
    ),
    blankLine(),
    sectionLine('WORK EXPERIENCE'),
    roleLine('Audio-Visual Technician'),
    metaLine('Marquette University · Feb 2025 - May 2026'),
    blankLine(),
    roleLine('Information Desk Specialist Manager'),
    metaLine('Marquette University · Jan 2024 - May 2026'),
    blankLine(),
    sectionLine('LEADERSHIP & INVOLVEMENT'),
    textLine('Sigma Chi - Risk Manager & Merchandise Chair'),
    textLine('Association for Computing Machinery'),
    textLine('Bayanihan Student Organization'),
    textLine('Marquette Powerlifting Club'),
    textLine('Kapwa Bible Study'),
    blankLine(),
    sectionLine('CONTACT'),
    ...buildContactLinkContent(),
  ])
}

export function buildContactLinkContent() {
  return [
    contactLinkLine('Portfolio', 'markyoingco.com', 'https://markyoingco.com'),
    contactLinkLine('GitHub', 'github.com/markyoingco', 'https://github.com/markyoingco'),
    contactLinkLine(
      'LinkedIn',
      'linkedin.com/in/mark-yoingco',
      'https://www.linkedin.com/in/mark-yoingco',
    ),
    contactLinkLine('Email', 'markyoingco23@gmail.com', 'mailto:markyoingco23@gmail.com', {
      external: false,
    }),
    contactLinkLine(
      'Instagram',
      'instagram.com/markyoingco',
      'https://www.instagram.com/markyoingco/',
    ),
  ]
}

export function buildContactTxtCatOutput() {
  return buildFileCatOutput('contact.txt', [
    sectionLine('CONTACT'),
    ...buildContactLinkContent(),
  ])
}

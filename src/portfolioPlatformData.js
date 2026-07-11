import {
  blankLine,
  buildFileCatOutput,
  bulletLine,
  metaLine,
  sectionLine,
  textLine,
  titleLine,
} from './terminalFileOutput'

export const PORTFOLIO_PLATFORM_SECTION = {
  title: 'Portfolio Platform',
  description:
    'A multi-mode personal portfolio built across webpage, terminal, and AI-assisted experiences.',
}

export const PORTFOLIO_PLATFORM_CARDS = [
  {
    id: 'platform',
    title: 'Personal Portfolio Platform',
    category: 'Web, Terminal & AI Experience',
    description:
      'Responsive portfolio platform featuring a cinematic webpage, interactive command-line terminal, shared project content, dark/light themes, and a contact backend, with a MarkGPT portfolio assistant currently in development.',
    tech: ['React', 'Vite', 'JavaScript', 'CSS', 'PHP', 'MySQL', 'DreamHost'],
    image: '/images/portfolio/personal-website.png',
    imageFit: 'cover',
    imagePosition: 'center center',
    website: 'https://github.com/markyoingco/marks-portfolio',
  },
  {
    id: 'terminal',
    title: 'Interactive Terminal Portfolio',
    category: 'Developer Tool Experience',
    description:
      'Command-line portfolio experience with navigable folders, readable project files, context-aware Help panels, Tab autocomplete, command history, editable input, responsive mobile behavior, and contact submissions connected to the shared backend.',
    tech: ['React', 'JavaScript', 'CSS', 'REST API', 'PHP'],
    image: '/images/portfolio/terminal-image.png',
    imageAlt: 'Interactive terminal portfolio showing command-line navigation',
    imageAspectRatio: '11 / 8',
    imageFit: 'contain',
    imagePosition: 'center center',
    modeAction: { label: 'Open Terminal', mode: 'terminal' },
  },
  {
    id: 'markgpt',
    title: 'MarkGPT Portfolio Assistant',
    category: 'AI Experience — Coming Soon',
    description:
      'Portfolio assistant currently in development, designed to answer questions about Mark’s resume, software projects, goals, experience, and technical background using the platform’s shared content.',
    status: 'Coming Soon',
    tech: ['React', 'Shared Data', 'Coming Soon'],
    placeholderLines: ['MarkGPT', 'Coming Soon'],
    modeAction: { label: 'View Coming Soon', mode: 'markgpt' },
  },
]

export function mapPlatformCardToPortfolioItem(card) {
  return {
    title: card.title,
    subtitle: card.category,
    description: card.description,
    status: card.status ?? '',
    role: '',
    impact: '',
    tech: card.tech,
    image: card.image ?? '',
    imageAlt: card.imageAlt ?? '',
    imageFit: card.imageFit ?? 'cover',
    imagePosition: card.imagePosition ?? 'center center',
    imageAspectRatio: card.imageAspectRatio ?? '',
    placeholderLines: card.placeholderLines ?? null,
    website: card.website ?? '',
    github: '',
    demo: '',
    proof: '',
    modeAction: card.modeAction ?? null,
  }
}

export function buildPortfolioPlatformWebpageItems() {
  return PORTFOLIO_PLATFORM_CARDS.map(mapPlatformCardToPortfolioItem)
}

export function buildPortfolioSiteTxtCatOutput() {
  return buildFileCatOutput('portfolio-site.txt', [
    titleLine('PERSONAL PORTFOLIO PLATFORM'),
    metaLine('Web, Terminal & AI Experience'),
    blankLine(),
    sectionLine('SUMMARY'),
    textLine(
      'Responsive portfolio platform featuring a cinematic webpage, interactive command-line terminal, shared project content, dark/light themes, and a PHP/MySQL contact backend hosted on DreamHost.',
    ),
    blankLine(),
    sectionLine('MODES'),
    bulletLine('Webpage — complete'),
    bulletLine('Terminal — complete'),
    bulletLine('MarkGPT — currently in development'),
    blankLine(),
    sectionLine('PLATFORM FEATURES'),
    bulletLine('Responsive desktop and mobile layouts'),
    bulletLine('Shared portfolio, testimonial, and travel data'),
    bulletLine('Resume PDF access'),
    bulletLine('Dark/light theming'),
    bulletLine('PHP/MySQL contact submission backend'),
    bulletLine('DreamHost deployment'),
    blankLine(),
    sectionLine('STACK'),
    textLine('React · Vite · JavaScript · CSS · PHP · MySQL · DreamHost'),
    blankLine(),
    sectionLine('LINKS'),
    textLine('GitHub: open portfolio-site.github'),
    textLine('Live site: open portfolio-site.webpage'),
  ])
}

export function buildTerminalTxtCatOutput() {
  return buildFileCatOutput('terminal.txt', [
    titleLine('INTERACTIVE TERMINAL PORTFOLIO'),
    metaLine('Developer Tool Experience'),
    blankLine(),
    sectionLine('SUMMARY'),
    textLine(
      'Command-line portfolio experience designed to let visitors explore Mark’s background, resume, projects, testimonials, travel, and contact information through familiar terminal commands.',
    ),
    blankLine(),
    sectionLine('FEATURES'),
    bulletLine('cd folder navigation'),
    bulletLine('ls file and folder listings'),
    bulletLine('cat readable text files'),
    bulletLine('open links, webpage sections, GitHub repositories, and documents'),
    bulletLine('Tab autocomplete'),
    bulletLine('command history'),
    bulletLine('editable command input'),
    bulletLine('context-aware Help panels'),
    bulletLine('nested project and testimonial folders'),
    bulletLine('responsive desktop and mobile layouts'),
    blankLine(),
    sectionLine('BACKEND'),
    textLine(
      'The terminal message.form submits to the same /api/contact.php endpoint used by the Webpage contact form.',
    ),
    blankLine(),
    sectionLine('STACK'),
    textLine('React · JavaScript · CSS · PHP · REST-style JSON submission'),
    blankLine(),
    sectionLine('STATUS'),
    textLine('Complete and deployed'),
    blankLine(),
    textLine('You are currently viewing this experience.'),
  ])
}

export function buildMarkaiTxtCatOutput() {
  return buildFileCatOutput('markai.txt', [
    titleLine('MARKGPT PORTFOLIO ASSISTANT'),
    blankLine(),
    sectionLine('STATUS'),
    textLine('Coming Soon'),
    blankLine(),
    sectionLine('SUMMARY'),
    textLine(
      'MarkGPT is a portfolio assistant currently in development. It is planned to answer questions about Mark’s resume, projects, experience, goals, and technical background using the platform’s shared content.',
    ),
    blankLine(),
    sectionLine('PLANNED PURPOSE'),
    bulletLine('Help recruiters quickly understand Mark’s experience'),
    bulletLine('Answer questions about projects and technologies'),
    bulletLine('Explain resume and portfolio content'),
    bulletLine('Provide a more conversational way to explore the platform'),
    blankLine(),
    sectionLine('CURRENT STATE'),
    textLine(
      'The interface and coming-soon mode exist, but the AI assistant is not functional yet.',
    ),
    blankLine(),
    sectionLine('TO VIEW'),
    textLine('Type cd markai to open the current coming-soon mode.'),
  ])
}

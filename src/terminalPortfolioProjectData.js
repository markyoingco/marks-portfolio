import { buildFileCatOutput, textLine } from './terminalFileOutput'
import { buildPortfolioTxtCatOutput } from './terminalPortfolioFileOutput'

export const PORTFOLIO_CATEGORY_SLUGS = [
  'site-build',
  'capstones',
  'systems',
  'software-design',
  'games',
  'data',
  'merch',
  'service',
]

export const PORTFOLIO_CATEGORY_CD_ALIASES = {
  'software-systems': 'capstones',
  softwaresystems: 'capstones',
}

export function getPortfolioCategoryAliasEnterLines(alias, resolved) {
  if (alias === 'software-systems') {
    return [
      'This folder is now capstones.',
      'Opening capstones...',
      'Type ls to view capstone projects.',
    ]
  }

  if (alias === 'softwaresystems') {
    return ['Opening capstones...', 'Type ls to view capstone projects.']
  }

  return [`Opening ${resolved}...`, 'Type ls to view files.']
}

export const PORTFOLIO_CATEGORY_FILES = {
  'site-build': [
    'portfolio-site.txt',
    'portfolio-site.github',
    'portfolio-site.webpage',
  ],
  capstones: ['abacus', 'maat', 'capstones.webpage'],
  systems: [
    'operating-systems-c.txt',
    'operating-systems-c.github',
    'systems.webpage',
  ],
  'software-design': [
    'finch-controller.txt',
    'finch-controller.github',
    'finch-controller.webpage',
  ],
  games: ['space-shmup', 'mission-demolition', 'apple-picker', 'games.webpage'],
  data: ['basketball-predictor', 'sleep-analysis', 'data.webpage'],
  merch: ['sigma-chi-merch.txt', 'merch.webpage'],
  service: ['feed-my-starving-children.txt', 'service.webpage', 'fmsc.link'],
}

export const PORTFOLIO_CATEGORY_WEBPAGE_FILES = {
  'site-build': 'portfolio-site.webpage',
  capstones: 'capstones.webpage',
  systems: 'systems.webpage',
  'software-design': 'finch-controller.webpage',
  games: 'games.webpage',
  data: 'data.webpage',
  merch: 'merch.webpage',
  service: 'service.webpage',
}

export const NESTED_CATEGORY_PROJECTS_HINT =
  '# Type ls to view projects. Use cd [project] to open one or open [file.webpage] to view the webpage section.'

export const PORTFOLIO_CATEGORY_FILE_SET_CD_HINTS = {
  systems: {
    'operating-systems-c':
      'operating-systems-c is a file set in this folder. Use cat operating-systems-c.txt or open operating-systems-c.github.',
  },
}

export function getPortfolioFileSetCdHint(category, target) {
  return PORTFOLIO_CATEGORY_FILE_SET_CD_HINTS[category]?.[target] ?? null
}

export const GAMES_PROJECT_SLUGS = ['space-shmup', 'mission-demolition', 'apple-picker']

export const GAMES_CATEGORY_LISTING = [...GAMES_PROJECT_SLUGS, 'games.webpage']

export const GAMES_PROJECT_FILES = {
  'space-shmup': ['space-shmup.txt', 'space-shmup.github'],
  'mission-demolition': ['mission-demolition.txt', 'mission-demolition.github'],
  'apple-picker': ['apple-picker.txt', 'apple-picker.github'],
}

export const GAMES_CATEGORY_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cd space-shmup' },
  { command: 'cd mission-demolition' },
  { command: 'cd apple-picker' },
  { command: 'open games.webpage', description: 'open Games portfolio tab' },
  { command: 'cd ..' },
  { command: 'clear' },
]

export function getGamesProjectHelpCommands(projectSlug) {
  const files = GAMES_PROJECT_FILES[projectSlug] ?? []
  const commands = [{ command: 'ls' }]

  for (const file of files) {
    if (file.endsWith('.txt')) {
      commands.push({ command: `cat ${file}`, description: `read ${file}` })
    } else if (file.endsWith('.github')) {
      commands.push({ command: `open ${file}`, description: `open ${file}` })
    }
  }

  commands.push({ command: 'cd ..' }, { command: 'clear' })
  return commands
}

export function getGamesProjectEnterLines(projectSlug) {
  const label = projectSlug.replace(/-/g, ' ')
  return [`Opening ${label}...`, 'Type ls to view files.']
}

export const GAMES_CATEGORY_UNKNOWN_HINT =
  'Command not found in portfolio\\games. Try: ls, cd space-shmup, cd mission-demolition, cd apple-picker, open games.webpage, cd .., or clear.'

export function getGamesProjectUnknownHint(projectSlug) {
  const files = GAMES_PROJECT_FILES[projectSlug] ?? []
  const txtFile = files.find((file) => file.endsWith('.txt')) ?? 'project.txt'
  const githubFile = files.find((file) => file.endsWith('.github')) ?? 'project.github'

  return `Command not found in portfolio\\games\\${projectSlug}. Try: ls, cat ${txtFile}, open ${githubFile}, cd .., or clear.`
}

export const DATA_PROJECT_SLUGS = ['basketball-predictor', 'sleep-analysis']

export const DATA_CATEGORY_LISTING = [...DATA_PROJECT_SLUGS, 'data.webpage']

export const DATA_PROJECT_FILES = {
  'basketball-predictor': ['basketball-predictor.txt', 'basketball-predictor.github'],
  'sleep-analysis': ['sleep-analysis.txt', 'sleep-analysis.github'],
}

export const DATA_CATEGORY_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cd basketball-predictor' },
  { command: 'cd sleep-analysis' },
  { command: 'open data.webpage', description: 'open Data portfolio tab' },
  { command: 'cd ..' },
  { command: 'clear' },
]

export function getDataProjectHelpCommands(projectSlug) {
  const files = DATA_PROJECT_FILES[projectSlug] ?? []
  const commands = [{ command: 'ls' }]

  for (const file of files) {
    if (file.endsWith('.txt')) {
      commands.push({ command: `cat ${file}`, description: `read ${file}` })
    } else if (file.endsWith('.github')) {
      commands.push({ command: `open ${file}`, description: `open ${file}` })
    }
  }

  commands.push({ command: 'cd ..' }, { command: 'clear' })
  return commands
}

export function getDataProjectEnterLines(projectSlug) {
  const label = projectSlug.replace(/-/g, ' ')
  return [`Opening ${label}...`, 'Type ls to view files.']
}

export const DATA_CATEGORY_UNKNOWN_HINT =
  'Command not found in portfolio\\data. Try: ls, cd basketball-predictor, cd sleep-analysis, open data.webpage, cd .., or clear.'

export function getDataProjectUnknownHint(projectSlug) {
  const files = DATA_PROJECT_FILES[projectSlug] ?? []
  const txtFile = files.find((file) => file.endsWith('.txt')) ?? 'project.txt'
  const githubFile = files.find((file) => file.endsWith('.github')) ?? 'project.github'

  return `Command not found in portfolio\\data\\${projectSlug}. Try: ls, cat ${txtFile}, open ${githubFile}, cd .., or clear.`
}

export const CAPSTONES_PROJECT_SLUGS = ['abacus', 'maat']

export const CAPSTONES_CATEGORY_LISTING = [...CAPSTONES_PROJECT_SLUGS, 'capstones.webpage']

export const CAPSTONES_PROJECT_FILES = {
  abacus: ['abacus.txt', 'abacus.github'],
  maat: ['maat.txt', 'maat.github'],
}

export const CAPSTONES_CATEGORY_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cd abacus' },
  { command: 'cd maat' },
  { command: 'open capstones.webpage', description: 'open Capstones portfolio tab' },
  { command: 'cd ..' },
  { command: 'clear' },
]

export function getCapstonesProjectHelpCommands(projectSlug) {
  const files = CAPSTONES_PROJECT_FILES[projectSlug] ?? []
  const commands = [{ command: 'ls' }]

  for (const file of files) {
    if (file.endsWith('.txt')) {
      commands.push({ command: `cat ${file}`, description: `read ${file}` })
    } else if (file.endsWith('.github')) {
      commands.push({ command: `open ${file}`, description: `open ${file}` })
    }
  }

  commands.push({ command: 'cd ..' }, { command: 'clear' })
  return commands
}

export function getCapstonesProjectEnterLines(projectSlug) {
  const label = projectSlug.replace(/-/g, ' ')
  return [`Opening ${label}...`, 'Type ls to view files.']
}

export const CAPSTONES_CATEGORY_UNKNOWN_HINT =
  'Command not found in portfolio\\capstones. Try: ls, cd abacus, cd maat, open capstones.webpage, cd .., or clear.'

export function getCapstonesProjectUnknownHint(projectSlug) {
  const files = CAPSTONES_PROJECT_FILES[projectSlug] ?? []
  const txtFile = files.find((file) => file.endsWith('.txt')) ?? 'project.txt'
  const githubFile = files.find((file) => file.endsWith('.github')) ?? 'project.github'

  return `Command not found in portfolio\\capstones\\${projectSlug}. Try: ls, cat ${txtFile}, open ${githubFile}, cd .., or clear.`
}

export const NESTED_PORTFOLIO_CATEGORY_CONFIG = {
  games: {
    projectSlugs: GAMES_PROJECT_SLUGS,
    categoryListing: GAMES_CATEGORY_LISTING,
    projectFiles: GAMES_PROJECT_FILES,
    categoryHelpCommands: GAMES_CATEGORY_HELP_COMMANDS,
    categoryUnknownHint: GAMES_CATEGORY_UNKNOWN_HINT,
    getProjectHelpCommands: getGamesProjectHelpCommands,
    getProjectUnknownHint: getGamesProjectUnknownHint,
    getProjectEnterLines: getGamesProjectEnterLines,
    webpageFile: PORTFOLIO_CATEGORY_WEBPAGE_FILES.games,
    enterLinesSuffix: 'game projects',
    categoryProjectsHint: NESTED_CATEGORY_PROJECTS_HINT,
  },
  data: {
    projectSlugs: DATA_PROJECT_SLUGS,
    categoryListing: DATA_CATEGORY_LISTING,
    projectFiles: DATA_PROJECT_FILES,
    categoryHelpCommands: DATA_CATEGORY_HELP_COMMANDS,
    categoryUnknownHint: DATA_CATEGORY_UNKNOWN_HINT,
    getProjectHelpCommands: getDataProjectHelpCommands,
    getProjectUnknownHint: getDataProjectUnknownHint,
    getProjectEnterLines: getDataProjectEnterLines,
    webpageFile: PORTFOLIO_CATEGORY_WEBPAGE_FILES.data,
    enterLinesSuffix: 'data projects',
    categoryProjectsHint: NESTED_CATEGORY_PROJECTS_HINT,
  },
  capstones: {
    projectSlugs: CAPSTONES_PROJECT_SLUGS,
    categoryListing: CAPSTONES_CATEGORY_LISTING,
    projectFiles: CAPSTONES_PROJECT_FILES,
    categoryHelpCommands: CAPSTONES_CATEGORY_HELP_COMMANDS,
    categoryUnknownHint: CAPSTONES_CATEGORY_UNKNOWN_HINT,
    getProjectHelpCommands: getCapstonesProjectHelpCommands,
    getProjectUnknownHint: getCapstonesProjectUnknownHint,
    getProjectEnterLines: getCapstonesProjectEnterLines,
    webpageFile: PORTFOLIO_CATEGORY_WEBPAGE_FILES.capstones,
    enterLinesSuffix: 'capstone projects',
    categoryProjectsHint: NESTED_CATEGORY_PROJECTS_HINT,
  },
}

export function getNestedPortfolioCategoryConfig(category) {
  return NESTED_PORTFOLIO_CATEGORY_CONFIG[category] ?? null
}

export function getNestedPortfolioCategoryFromPath(portfolioPath) {
  if (portfolioPath.length < 2 || portfolioPath[0] !== 'portfolio') {
    return null
  }

  return getNestedPortfolioCategoryConfig(portfolioPath[1])
}

export const PORTFOLIO_GITHUB_LINKS = {
  'portfolio-site.github': 'https://github.com/markyoingco/marks-portfolio',
  'abacus.github': 'https://github.com/musyslab/Abacus',
  'maat.github': 'https://github.com/musyslab/MAAT',
  'operating-systems-c.github': 'https://github.com/markyoingco/operating-systems-c-projects',
  'finch-controller.github': 'https://github.com/markyoingco/BirdVroomVroom',
  'space-shmup.github': 'https://github.com/markyoingco/space-shmup-unity',
  'mission-demolition.github': 'https://github.com/markyoingco/mission-demolition-unity',
  'apple-picker.github': 'https://github.com/markyoingco/apple-picker-unity',
  'basketball-predictor.github':
    'https://github.com/markyoingco/marquette-basketball-predictor-2024',
  'sleep-analysis.github': 'https://github.com/markyoingco/sleep-efficiency-analysis',
}

export const PORTFOLIO_EXTERNAL_WEBPAGE_LINKS = {
  'portfolio-site.webpage': 'https://markyoingco.com',
}

export const PORTFOLIO_EXTERNAL_LINKS = {
  'fmsc.link': 'https://www.fmsc.org/locations/libertyville-il',
}

export const PORTFOLIO_WEBPAGE_LINKS = {
  'finch-controller.webpage': 'Software Design and Analysis',
  'capstones.webpage': 'Senior Design Capstones',
  'systems.webpage': 'Systems Programming',
  'games.webpage': 'Programming Computer Games',
  'data.webpage': 'Data Science and Machine Learning',
  'merch.webpage': 'Creative Leadership',
  'service.webpage': 'Service',
  'portfolio-site.webpage': 'Personal Build',
}

export const PORTFOLIO_ROOT_UNKNOWN_COMMAND_HINT =
  'Command not found in portfolio. Try: ls, cd site-build, cd capstones, cd systems, cd software-design, cd games, cd data, cd merch, cd service, cd .., or clear.'

export function getPortfolioCategoryUnknownHint(category) {
  const nestedConfig = getNestedPortfolioCategoryConfig(category)
  if (nestedConfig) {
    return nestedConfig.categoryUnknownHint
  }

  const files = PORTFOLIO_CATEGORY_FILES[category] ?? []
  const examples = files.slice(0, 3).join(', ')
  return `Command not found in portfolio\\${category}. Try: ls, cat ${examples}, cd .., or clear.`
}

export function buildPortfolioPlaceholderCatOutput(filename) {
  const output = buildPortfolioTxtCatOutput(filename)
  if (output) {
    return output
  }

  return buildFileCatOutput(filename, [
    textLine(`${filename} exists.`),
    textLine('Project content will be added next.'),
  ])
}

export function getPortfolioCategoryEnterLines(category) {
  const label = category.replace(/-/g, ' ')
  const nestedConfig = getNestedPortfolioCategoryConfig(category)
  if (nestedConfig) {
    return [`Opening ${label}...`, `Type ls to view ${nestedConfig.enterLinesSuffix}.`]
  }

  return [`Opening ${label}...`, 'Type ls to view files.']
}

export function getPortfolioCategoryHelpCommands(category) {
  const nestedConfig = getNestedPortfolioCategoryConfig(category)
  if (nestedConfig) {
    return nestedConfig.categoryHelpCommands
  }

  const files = PORTFOLIO_CATEGORY_FILES[category] ?? []
  const commands = [{ command: 'ls' }]

  for (const file of files) {
    if (file.endsWith('.txt')) {
      commands.push({ command: `cat ${file}`, description: `read ${file}` })
    } else if (file.endsWith('.github') || file.endsWith('.webpage') || file.endsWith('.link')) {
      commands.push({ command: `open ${file}`, description: `open ${file}` })
    }
  }

  commands.push({ command: 'cd ..' }, { command: 'clear' })
  return commands
}

export const TERMINAL_PORTFOLIO_ROOT_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cd site-build' },
  { command: 'cd capstones' },
  { command: 'cd systems' },
  { command: 'cd software-design' },
  { command: 'cd games' },
  { command: 'cd data' },
  { command: 'cd merch' },
  { command: 'cd service' },
  { command: 'cd ..' },
  { command: 'clear' },
]

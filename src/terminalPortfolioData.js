import {
  buildContactTxtCatOutput,
  buildResumeSummaryCatOutput,
  TERMINAL_SCROLL_MODE,
} from './terminalFileOutput'
import {
  buildAboutTxtCatOutput,
  buildBeyondWorkTxtCatOutput,
  buildGoalsTxtCatOutput,
  buildMindsetTxtCatOutput,
  VSCO_GALLERY_URL,
} from './terminalPersonalFileOutput'
import { buildTestimonialTxtCatOutput } from './terminalTestimonialsFileOutput'
import { buildCaughtInMotionTxtCatOutput, buildPlacesTxtCatOutput, TRAVEL_PLACES_FILE, TRAVEL_WEBPAGE_FILE } from './terminalTravelFileOutput'
import {
  getTestimonialByPersonSlug,
  getTestimonialPersonEnterLines,
  getTestimonialPersonFolderFiles,
  getTestimonialPersonHelpCommands,
  getTestimonialPersonSlugs,
  getTestimonialPersonUnknownCommandHint,
  getTestimonialsRootHelpCommands,
  getTestimonialsRootLsLines,
  getTestimonialsRootUnknownCommandHint,
  TESTIMONIAL_LINKEDIN_FILE,
  TESTIMONIAL_TXT_FILE,
  TESTIMONIALS_WEBPAGE_FILE,
} from './testimonialsData'

import {
  buildPortfolioPlaceholderCatOutput,
  getNestedPortfolioCategoryConfig,
  getNestedPortfolioCategoryFromPath,
  getPortfolioCategoryHelpCommands,
  getPortfolioCategoryUnknownHint,
  PORTFOLIO_CATEGORY_FILES,
  PORTFOLIO_CATEGORY_SLUGS,
  PORTFOLIO_GITHUB_LINKS,
  PORTFOLIO_EXTERNAL_WEBPAGE_LINKS,
  PORTFOLIO_EXTERNAL_LINKS,
  PORTFOLIO_ROOT_UNKNOWN_COMMAND_HINT,
  PORTFOLIO_WEBPAGE_LINKS,
  TERMINAL_PORTFOLIO_ROOT_HELP_COMMANDS,
} from './terminalPortfolioProjectData'

export {
  getPortfolioCategoryEnterLines,
  getPortfolioCategoryAliasEnterLines,
  getPortfolioFileSetCdHint,
  getGamesProjectEnterLines,
  getDataProjectEnterLines,
  GAMES_PROJECT_SLUGS,
  DATA_PROJECT_SLUGS,
  PORTFOLIO_CATEGORY_SLUGS,
  PORTFOLIO_CATEGORY_CD_ALIASES,
  PORTFOLIO_ROOT_UNKNOWN_COMMAND_HINT,
} from './terminalPortfolioProjectData'

export {
  getTestimonialPersonEnterLines,
  getTestimonialPersonSlugs,
  getTestimonialPersonUnknownCommandHint,
} from './testimonialsData'

export const TERMINAL_CATEGORY_SLUGS = [
  'resume',
  'personal',
  'portfolio',
  'testimonials',
  'travel',
  'contact',
]

export const TERMINAL_FOLDER_SLUGS = new Set([
  'resume',
  'contact',
  'personal',
  'portfolio',
  'testimonials',
  'travel',
])

import { RESUME_PDF_FILENAME, RESUME_PDF_PATH } from './resumeDocument'

export { RESUME_PDF_FILENAME, RESUME_PDF_PATH }
export { VSCO_GALLERY_URL }

export const RESUME_FOLDER_FILES = ['summary.txt', 'resume.pdf']
export const CONTACT_FOLDER_FILES = ['contact.txt', 'message.form']
export const PERSONAL_FOLDER_FILES = [
  'about.txt',
  'mindset.txt',
  'goals.txt',
  'beyond-work.txt',
  'vsco.link',
]
export const TRAVEL_FOLDER_FILES = ['caught-in-motion.txt', TRAVEL_PLACES_FILE, TRAVEL_WEBPAGE_FILE, 'vsco.link']

export const RESUME_UNKNOWN_COMMAND_HINT =
  'Command not found in resume. Try: ls, cat summary.txt, open resume.pdf, download resume.pdf, cd .., or clear.'

export const CONTACT_UNKNOWN_COMMAND_HINT =
  'Command not found in contact. Try: ls, cat contact.txt, open message.form, cd .., or clear.'

export const PERSONAL_UNKNOWN_COMMAND_HINT =
  'Command not found in personal. Try: ls, cat about.txt, cat mindset.txt, cat goals.txt, cat beyond-work.txt, open vsco.link, cd .., or clear.'

export const TESTIMONIALS_ROOT_UNKNOWN_COMMAND_HINT = getTestimonialsRootUnknownCommandHint()

export const TRAVEL_UNKNOWN_COMMAND_HINT =
  'Command not found in travel. Try: ls, cat caught-in-motion.txt, cat places.txt, open travel.webpage, open vsco.link, cd .., or clear.'

export const TERMINAL_ROOT_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cd resume' },
  { command: 'cd personal' },
  { command: 'cd portfolio' },
  { command: 'cd testimonials' },
  { command: 'cd travel' },
  { command: 'cd contact' },
  { command: 'clear' },
  { command: 'back' },
]

export const TERMINAL_RESUME_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cat summary.txt', description: 'read resume summary' },
  { command: 'open resume.pdf', description: 'open resume in new tab' },
  { command: 'download resume.pdf', description: 'download resume file' },
  { command: 'cd ..' },
  { command: 'clear' },
]

export const TERMINAL_CONTACT_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cat contact.txt', description: 'view contact links' },
  { command: 'open message.form', description: 'send a message through terminal' },
  { command: 'cd ..' },
  { command: 'clear' },
]

export const TERMINAL_PERSONAL_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cat about.txt', description: 'read personal intro' },
  { command: 'cat mindset.txt', description: 'read mindset' },
  { command: 'cat goals.txt', description: 'read current goals' },
  { command: 'cat beyond-work.txt', description: 'read beyond-work interests' },
  { command: 'open vsco.link', description: 'open VSCO' },
  { command: 'cd ..' },
  { command: 'clear' },
]

export const TERMINAL_TESTIMONIALS_ROOT_HELP_COMMANDS = getTestimonialsRootHelpCommands()

export const TERMINAL_TRAVEL_HELP_COMMANDS = [
  { command: 'ls' },
  { command: 'cat caught-in-motion.txt', description: 'read travel intro' },
  { command: 'cat places.txt', description: 'read places' },
  { command: 'open travel.webpage', description: 'open travel page' },
  { command: 'open vsco.link', description: 'open VSCO' },
  { command: 'cd ..' },
  { command: 'clear' },
]

/** @deprecated Use TERMINAL_ROOT_HELP_COMMANDS */
export const TERMINAL_HELP_COMMANDS = TERMINAL_ROOT_HELP_COMMANDS.map((item) => item.command)

export function getTerminalHelpPanel(portfolioPath) {
  if (isResumeFolder(portfolioPath)) {
    return {
      listingHeading: 'Files',
      listingItems: RESUME_FOLDER_FILES,
      commands: TERMINAL_RESUME_HELP_COMMANDS,
    }
  }

  if (isContactFolder(portfolioPath)) {
    return {
      listingHeading: 'Files',
      listingItems: CONTACT_FOLDER_FILES,
      commands: TERMINAL_CONTACT_HELP_COMMANDS,
    }
  }

  if (isPersonalFolder(portfolioPath)) {
    return {
      listingHeading: 'Files',
      listingItems: PERSONAL_FOLDER_FILES,
      commands: TERMINAL_PERSONAL_HELP_COMMANDS,
    }
  }

  if (isTestimonialsFolder(portfolioPath)) {
    return {
      listingHeading: 'Folders',
      listingItems: getTestimonialPersonSlugs(),
      secondaryListingHeading: 'Files',
      secondaryListingItems: [TESTIMONIALS_WEBPAGE_FILE],
      commands: TERMINAL_TESTIMONIALS_ROOT_HELP_COMMANDS,
    }
  }

  if (isTestimonialPersonFolder(portfolioPath)) {
    const personSlug = portfolioPath[1] ?? ''
    const item = getTestimonialByPersonSlug(personSlug)

    return {
      listingHeading: 'Files',
      listingItems: getTestimonialPersonFolderFiles(item),
      commands: getTestimonialPersonHelpCommands(personSlug),
    }
  }

  if (isTravelFolder(portfolioPath)) {
    return {
      listingHeading: 'Files',
      listingItems: TRAVEL_FOLDER_FILES,
      commands: TERMINAL_TRAVEL_HELP_COMMANDS,
    }
  }

  if (isPortfolioRoot(portfolioPath)) {
    return {
      listingHeading: 'Categories',
      listingItems: PORTFOLIO_CATEGORY_SLUGS,
      commands: TERMINAL_PORTFOLIO_ROOT_HELP_COMMANDS,
    }
  }

  if (isPortfolioCategoryFolder(portfolioPath)) {
    const category = portfolioPath[1]
    const nestedConfig = getNestedPortfolioCategoryConfig(category)

    if (nestedConfig) {
      const panel = {
        listingHeading: 'Folders',
        listingItems: nestedConfig.projectSlugs,
        commands: getPortfolioCategoryHelpCommands(category),
      }

      if (nestedConfig.webpageFile) {
        panel.secondaryListingHeading = 'Files'
        panel.secondaryListingItems = [nestedConfig.webpageFile]
      }

      return panel
    }

    return {
      listingHeading: 'Files',
      listingItems: PORTFOLIO_CATEGORY_FILES[category] ?? [],
      commands: getPortfolioCategoryHelpCommands(category),
    }
  }

  if (isNestedPortfolioProjectFolder(portfolioPath)) {
    const category = portfolioPath[1]
    const projectSlug = portfolioPath[2]
    const nestedConfig = getNestedPortfolioCategoryConfig(category)
    const files = nestedConfig?.projectFiles[projectSlug] ?? []

    return {
      listingHeading: 'Files',
      listingItems: files,
      commands: nestedConfig.getProjectHelpCommands(projectSlug),
    }
  }

  return {
    listingHeading: 'Categories',
    listingItems: TERMINAL_CATEGORY_SLUGS,
    commands: TERMINAL_ROOT_HELP_COMMANDS,
  }
}

export function getTerminalCategoryPlaceholderLines(slug) {
  const label = slug.replace(/-/g, ' ')

  return [`Opening ${label}...`, `${label} terminal content coming soon.`]
}

export function getTerminalEnterFolderLines(slug) {
  if (slug === 'resume') {
    return ['Opening resume...', 'Type ls to view resume files.']
  }

  if (slug === 'contact') {
    return ['Opening contact...', 'Type ls to view contact files.']
  }

  if (slug === 'personal') {
    return ['Opening personal...', 'Type ls to view personal files.']
  }

  if (slug === 'portfolio') {
    return ['Opening portfolio...', 'Type ls to view portfolio categories.']
  }

  if (slug === 'testimonials') {
    return ['Opening testimonials...', 'Type ls to view testimonial people.']
  }

  if (slug === 'travel') {
    return ['Opening travel...', 'Type ls to view travel files.']
  }

  return getTerminalCategoryPlaceholderLines(slug)
}

export function getAlreadyInFolderLines(folderSlug) {
  if (folderSlug === 'resume') {
    return ['Already in resume.', 'Type ls to view resume files.']
  }

  if (folderSlug === 'contact') {
    return ['Already in contact.', 'Type ls to view contact files.']
  }

  if (folderSlug === 'personal') {
    return ['Already in personal.', 'Type ls to view personal files.']
  }

  if (folderSlug === 'portfolio') {
    return ['Already in portfolio.', 'Type ls to view portfolio categories.']
  }

  if (folderSlug === 'testimonials') {
    return ['Already in testimonials.', 'Type ls to view testimonial people.']
  }

  if (getTestimonialPersonSlugs().includes(folderSlug)) {
    return [`Already in ${folderSlug}.`, 'Type ls to view testimonial files.']
  }

  if (folderSlug === 'travel') {
    return ['Already in travel.', 'Type ls to view travel files.']
  }

  if (PORTFOLIO_CATEGORY_SLUGS.includes(folderSlug)) {
    return [`Already in ${folderSlug}.`, 'Type ls to view files.']
  }

  return [`Already in ${folderSlug}.`, 'Type ls to view files.']
}

export function getTerminalPortfolioLsLines(portfolioPath) {
  if (portfolioPath.length === 0) {
    return TERMINAL_CATEGORY_SLUGS
  }

  if (isResumeFolder(portfolioPath)) {
    return RESUME_FOLDER_FILES
  }

  if (isContactFolder(portfolioPath)) {
    return CONTACT_FOLDER_FILES
  }

  if (isPersonalFolder(portfolioPath)) {
    return PERSONAL_FOLDER_FILES
  }

  if (isTestimonialsFolder(portfolioPath)) {
    return getTestimonialsRootLsLines()
  }

  if (isTestimonialPersonFolder(portfolioPath)) {
    const personSlug = portfolioPath[1] ?? ''
    const item = getTestimonialByPersonSlug(personSlug)
    return getTestimonialPersonFolderFiles(item)
  }

  if (isTravelFolder(portfolioPath)) {
    return TRAVEL_FOLDER_FILES
  }

  if (isPortfolioRoot(portfolioPath)) {
    return PORTFOLIO_CATEGORY_SLUGS
  }

  if (isPortfolioCategoryFolder(portfolioPath)) {
    const category = portfolioPath[1]
    const nestedConfig = getNestedPortfolioCategoryConfig(category)

    if (nestedConfig) {
      return nestedConfig.categoryListing
    }

    return PORTFOLIO_CATEGORY_FILES[category] ?? []
  }

  if (isNestedPortfolioProjectFolder(portfolioPath)) {
    const nestedConfig = getNestedPortfolioCategoryConfig(portfolioPath[1])
    return nestedConfig?.projectFiles[portfolioPath[2]] ?? []
  }

  return ['No folders here.']
}

function getTerminalFolderFileTypes(files) {
  const types = {
    txt: false,
    pdf: false,
    link: false,
    form: false,
    github: false,
    webpage: false,
    linkedin: false,
  }

  for (const file of files) {
    if (file.endsWith('.txt')) {
      types.txt = true
    } else if (file.endsWith('.pdf')) {
      types.pdf = true
    } else if (file.endsWith('.link')) {
      types.link = true
    } else if (file.endsWith('.form')) {
      types.form = true
    } else if (file.endsWith('.github')) {
      types.github = true
    } else if (file.endsWith('.webpage')) {
      types.webpage = true
    } else if (file.endsWith('.linkedin')) {
      types.linkedin = true
    }
  }

  return types
}

export function getTerminalFolderHint(portfolioPath) {
  if (portfolioPath.length === 0) {
    return null
  }

  if (isPortfolioRoot(portfolioPath)) {
    return '# Type ls to view categories. Use cd [category] to open one.'
  }

  const nestedCategoryConfig = getNestedPortfolioCategoryFromPath(portfolioPath)
  if (portfolioPath.length === 2 && nestedCategoryConfig) {
    return nestedCategoryConfig.categoryProjectsHint
  }

  if (isNestedPortfolioProjectFolder(portfolioPath)) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.github] to open links.'
  }

  if (isTestimonialsFolder(portfolioPath)) {
    return '# Type ls to view testimonial people. Use cd [person] to open one or open [file.webpage] to view the webpage section.'
  }

  if (isTestimonialPersonFolder(portfolioPath)) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.link/.webpage] to open links.'
  }

  const files = getTerminalPortfolioLsLines(portfolioPath)

  if (files.length === 0 || files[0] === 'No folders here.') {
    return '# Type cd .. to return to root. Type help for commands.'
  }

  const types = getTerminalFolderFileTypes(files)

  if (types.pdf) {
    return '# Type ls to view files. Use cat [file.txt], open [file.pdf], download [file.pdf], or cd .. to go back.'
  }

  if (types.form) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.form] to start a form.'
  }

  if (types.webpage && types.link) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.webpage/.link] to open links.'
  }

  if (types.webpage && !types.github) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.webpage] to open links.'
  }

  if (types.github || types.webpage) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.github/.webpage] to open links.'
  }

  if (types.link) {
    return '# Type ls to view files. Use cat [file.txt] to read text or open [file.link] to open links.'
  }

  if (types.txt) {
    return '# Type ls to view files. Use cat [file.txt] to read text or cd .. to go back.'
  }

  return '# Type ls to view files. Type cd .. to go back.'
}

export function isResumeFolder(portfolioPath) {
  return portfolioPath.length === 1 && portfolioPath[0] === 'resume'
}

export function isContactFolder(portfolioPath) {
  return portfolioPath.length === 1 && portfolioPath[0] === 'contact'
}

export function isPersonalFolder(portfolioPath) {
  return portfolioPath.length === 1 && portfolioPath[0] === 'personal'
}

export function isTestimonialsFolder(portfolioPath) {
  return portfolioPath.length === 1 && portfolioPath[0] === 'testimonials'
}

export function isTestimonialPersonFolder(portfolioPath) {
  return (
    portfolioPath.length === 2 &&
    portfolioPath[0] === 'testimonials' &&
    getTestimonialPersonSlugs().includes(portfolioPath[1])
  )
}

export function isTravelFolder(portfolioPath) {
  return portfolioPath.length === 1 && portfolioPath[0] === 'travel'
}

export function isPortfolioRoot(portfolioPath) {
  return portfolioPath.length === 1 && portfolioPath[0] === 'portfolio'
}

export function isPortfolioCategoryFolder(portfolioPath) {
  return (
    portfolioPath.length === 2 &&
    portfolioPath[0] === 'portfolio' &&
    PORTFOLIO_CATEGORY_SLUGS.includes(portfolioPath[1])
  )
}

export function isNestedPortfolioCategoryFolder(portfolioPath) {
  return (
    portfolioPath.length === 2 &&
    portfolioPath[0] === 'portfolio' &&
    Boolean(getNestedPortfolioCategoryConfig(portfolioPath[1]))
  )
}

export function isNestedPortfolioProjectFolder(portfolioPath) {
  if (portfolioPath.length !== 3 || portfolioPath[0] !== 'portfolio') {
    return false
  }

  const nestedConfig = getNestedPortfolioCategoryConfig(portfolioPath[1])
  if (!nestedConfig) {
    return false
  }

  return nestedConfig.projectSlugs.includes(portfolioPath[2])
}

export function isGamesCategoryFolder(portfolioPath) {
  return (
    portfolioPath.length === 2 &&
    portfolioPath[0] === 'portfolio' &&
    portfolioPath[1] === 'games'
  )
}

export function isDataCategoryFolder(portfolioPath) {
  return (
    portfolioPath.length === 2 &&
    portfolioPath[0] === 'portfolio' &&
    portfolioPath[1] === 'data'
  )
}

export function isGamesProjectFolder(portfolioPath) {
  return isNestedPortfolioProjectFolder(portfolioPath) && portfolioPath[1] === 'games'
}

export function isDataProjectFolder(portfolioPath) {
  return isNestedPortfolioProjectFolder(portfolioPath) && portfolioPath[1] === 'data'
}

export function getNestedPortfolioProjectSlugs(portfolioPath) {
  const nestedConfig = getNestedPortfolioCategoryFromPath(portfolioPath)
  return nestedConfig?.projectSlugs ?? []
}

export function getNestedPortfolioProjectEnterLines(portfolioPath, projectSlug) {
  const nestedConfig = getNestedPortfolioCategoryFromPath(portfolioPath)
  return nestedConfig?.getProjectEnterLines(projectSlug) ?? [`Opening ${projectSlug}...`]
}

export function getPortfolioCategorySlug(portfolioPath) {
  return isPortfolioCategoryFolder(portfolioPath) ? portfolioPath[1] : null
}

export function isTerminalFolderSlug(slug) {
  return TERMINAL_FOLDER_SLUGS.has(slug)
}

export function parseResumeFileCommand(lower) {
  if (lower === 'cat summary.txt') {
    return {
      type: 'output',
      output: buildResumeSummaryCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'open resume.pdf') {
    return {
      type: 'openResumePdf',
      lines: ['Opening resume.pdf...'],
    }
  }

  if (lower === 'download resume.pdf') {
    return {
      type: 'downloadResumePdf',
      lines: ['Downloading resume.pdf...'],
    }
  }

  if (
    lower.startsWith('cat ') ||
    lower.startsWith('open ') ||
    lower.startsWith('download ')
  ) {
    return {
      type: 'output',
      lines: [RESUME_UNKNOWN_COMMAND_HINT],
    }
  }

  return null
}

export function parseContactFileCommand(lower) {
  if (lower === 'cat contact.txt') {
    return {
      type: 'output',
      output: buildContactTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'open message.form') {
    return {
      type: 'startContactForm',
    }
  }

  if (lower.startsWith('cat ') || lower.startsWith('open ') || lower.startsWith('download ')) {
    return {
      type: 'output',
      lines: [CONTACT_UNKNOWN_COMMAND_HINT],
    }
  }

  return null
}

export function parsePersonalFileCommand(lower) {
  if (lower === 'cat about.txt') {
    return {
      type: 'output',
      output: buildAboutTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'cat mindset.txt') {
    return {
      type: 'output',
      output: buildMindsetTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'cat goals.txt') {
    return {
      type: 'output',
      output: buildGoalsTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'cat beyond-work.txt') {
    return {
      type: 'output',
      output: buildBeyondWorkTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'open vsco.link') {
    if (!VSCO_GALLERY_URL) {
      return {
        type: 'output',
        lines: ['VSCO link is not connected yet.'],
      }
    }

    return {
      type: 'openVscoLink',
      lines: ['Opening vsco.link...'],
    }
  }

  if (lower.startsWith('cat ') || lower.startsWith('open ') || lower.startsWith('download ')) {
    return {
      type: 'output',
      lines: [PERSONAL_UNKNOWN_COMMAND_HINT],
    }
  }

  return null
}

export function parseTestimonialsRootCommand(lower) {
  if (lower === `open ${TESTIMONIALS_WEBPAGE_FILE}`) {
    return {
      type: 'openTestimonialsWebpage',
      lines: ['Opening testimonials.webpage...'],
    }
  }

  if (lower.startsWith('cat ') || lower.startsWith('open ') || lower.startsWith('download ')) {
    return {
      type: 'output',
      lines: [TESTIMONIALS_ROOT_UNKNOWN_COMMAND_HINT],
    }
  }

  return null
}

export function parseTestimonialPersonCommand(lower, personSlug) {
  const item = getTestimonialByPersonSlug(personSlug)

  if (!item) {
    return {
      type: 'output',
      lines: [getTestimonialPersonUnknownCommandHint(personSlug)],
    }
  }

  if (lower === `cat ${TESTIMONIAL_TXT_FILE}`) {
    return {
      type: 'output',
      output: buildTestimonialTxtCatOutput(item),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === `open ${TESTIMONIALS_WEBPAGE_FILE}`) {
    return {
      type: 'openTestimonialsWebpage',
      lines: ['Opening testimonials.webpage...'],
    }
  }

  if (lower === `open ${TESTIMONIAL_LINKEDIN_FILE}`) {
    if (item.linkedin) {
      return {
        type: 'openUrl',
        url: item.linkedin,
        lines: ['Opening linkedin.link...'],
      }
    }

    return {
      type: 'output',
      lines: ['LinkedIn link not connected yet.'],
    }
  }

  if (lower.startsWith('cat ') || lower.startsWith('open ') || lower.startsWith('download ')) {
    return {
      type: 'output',
      lines: [getTestimonialPersonUnknownCommandHint(personSlug)],
    }
  }

  return null
}

export function parseTravelFileCommand(lower) {
  if (lower === 'cat caught-in-motion.txt') {
    return {
      type: 'output',
      output: buildCaughtInMotionTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === 'cat places.txt') {
    return {
      type: 'output',
      output: buildPlacesTxtCatOutput(),
      scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
    }
  }

  if (lower === `open ${TRAVEL_WEBPAGE_FILE}`) {
    return {
      type: 'openTravelWebpage',
      lines: ['Opening travel.webpage...'],
    }
  }

  if (lower === 'open vsco.link') {
    if (!VSCO_GALLERY_URL) {
      return {
        type: 'output',
        lines: ['VSCO link is not connected yet.'],
      }
    }

    return {
      type: 'openVscoLink',
      lines: ['Opening vsco.link...'],
    }
  }

  if (lower.startsWith('cat ') || lower.startsWith('open ') || lower.startsWith('download ')) {
    return {
      type: 'output',
      lines: [TRAVEL_UNKNOWN_COMMAND_HINT],
    }
  }

  return null
}

export function parsePortfolioCommand(lower, portfolioPath) {
  if (isPortfolioRoot(portfolioPath)) {
    return {
      type: 'output',
      lines: [PORTFOLIO_ROOT_UNKNOWN_COMMAND_HINT],
    }
  }

  if (isNestedPortfolioProjectFolder(portfolioPath)) {
    return parseNestedPortfolioProjectCommand(lower, portfolioPath)
  }

  if (isNestedPortfolioCategoryFolder(portfolioPath)) {
    return parseNestedPortfolioCategoryCommand(lower, portfolioPath[1])
  }

  if (!isPortfolioCategoryFolder(portfolioPath)) {
    return null
  }

  const category = portfolioPath[1]
  const categoryFiles = PORTFOLIO_CATEGORY_FILES[category] ?? []
  const unknownHint = getPortfolioCategoryUnknownHint(category)

  if (lower.startsWith('cat ')) {
    const filename = lower.slice(4).trim()
    if (filename.endsWith('.txt') && categoryFiles.includes(filename)) {
      return {
        type: 'output',
        output: buildPortfolioPlaceholderCatOutput(filename),
        scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
      }
    }

    return { type: 'output', lines: [unknownHint] }
  }

  if (lower.startsWith('open ')) {
    const filename = lower.slice(5).trim()

    if (filename.endsWith('.github') && categoryFiles.includes(filename)) {
      const url = PORTFOLIO_GITHUB_LINKS[filename]
      if (url) {
        return {
          type: 'openUrl',
          url,
          lines: [`Opening ${filename}...`],
        }
      }

      return {
        type: 'output',
        lines: ['GitHub link not connected yet.'],
      }
    }

    if (filename.endsWith('.webpage') && categoryFiles.includes(filename)) {
      const externalUrl = PORTFOLIO_EXTERNAL_WEBPAGE_LINKS[filename]
      if (externalUrl) {
        return {
          type: 'openUrl',
          url: externalUrl,
          lines: [`Opening ${filename}...`],
        }
      }

      const portfolioCategory = PORTFOLIO_WEBPAGE_LINKS[filename]
      if (portfolioCategory) {
        return {
          type: 'openPortfolioWebpage',
          portfolioCategory,
          lines: [`Opening ${filename}...`],
        }
      }

      return {
        type: 'output',
        lines: ['Webpage link will be connected next.'],
      }
    }

    if (filename.endsWith('.link') && categoryFiles.includes(filename)) {
      const url = PORTFOLIO_EXTERNAL_LINKS[filename]
      if (url) {
        return {
          type: 'openUrl',
          url,
          lines: [`Opening ${filename}...`],
        }
      }

      return {
        type: 'output',
        lines: ['Link not connected yet.'],
      }
    }

    return { type: 'output', lines: [unknownHint] }
  }

  if (lower.startsWith('download ')) {
    return { type: 'output', lines: [unknownHint] }
  }

  return { type: 'output', lines: [unknownHint] }
}

function parseNestedPortfolioCategoryCommand(lower, category) {
  const nestedConfig = getNestedPortfolioCategoryConfig(category)
  if (!nestedConfig) {
    return { type: 'output', lines: [getPortfolioCategoryUnknownHint(category)] }
  }

  if (lower.startsWith('open ')) {
    const filename = lower.slice(5).trim()

    if (nestedConfig.webpageFile && filename === nestedConfig.webpageFile) {
      const portfolioCategory = PORTFOLIO_WEBPAGE_LINKS[nestedConfig.webpageFile]
      return {
        type: 'openPortfolioWebpage',
        portfolioCategory,
        lines: [`Opening ${nestedConfig.webpageFile}...`],
      }
    }

    return { type: 'output', lines: [nestedConfig.categoryUnknownHint] }
  }

  if (lower.startsWith('cat ') || lower.startsWith('download ')) {
    return { type: 'output', lines: [nestedConfig.categoryUnknownHint] }
  }

  return { type: 'output', lines: [nestedConfig.categoryUnknownHint] }
}

function parseNestedPortfolioProjectCommand(lower, portfolioPath) {
  const category = portfolioPath[1]
  const projectSlug = portfolioPath[2]
  const nestedConfig = getNestedPortfolioCategoryConfig(category)
  if (!nestedConfig) {
    return null
  }

  const projectFiles = nestedConfig.projectFiles[projectSlug] ?? []
  const unknownHint = nestedConfig.getProjectUnknownHint(projectSlug)

  if (lower.startsWith('cat ')) {
    const filename = lower.slice(4).trim()
    if (filename.endsWith('.txt') && projectFiles.includes(filename)) {
      return {
        type: 'output',
        output: buildPortfolioPlaceholderCatOutput(filename),
        scrollMode: TERMINAL_SCROLL_MODE.COMMAND,
      }
    }

    return { type: 'output', lines: [unknownHint] }
  }

  if (lower.startsWith('open ')) {
    const filename = lower.slice(5).trim()

    if (filename.endsWith('.github') && projectFiles.includes(filename)) {
      const url = PORTFOLIO_GITHUB_LINKS[filename]
      if (url) {
        return {
          type: 'openUrl',
          url,
          lines: [`Opening ${filename}...`],
        }
      }

      return {
        type: 'output',
        lines: ['GitHub link not connected yet.'],
      }
    }

    return { type: 'output', lines: [unknownHint] }
  }

  if (lower.startsWith('download ')) {
    return { type: 'output', lines: [unknownHint] }
  }

  return { type: 'output', lines: [unknownHint] }
}

export const MARKAI_CD_TARGETS = new Set([
  'markai',
  'markgpt',
  'ai',
  'mark-ai',
  'my-ai',
  'my ai',
])

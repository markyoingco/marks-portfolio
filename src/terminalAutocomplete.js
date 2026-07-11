import {
  getNestedPortfolioCategoryConfig,
  getPortfolioCategoryHelpCommands,
  PORTFOLIO_CATEGORY_FILES,
  PORTFOLIO_CATEGORY_SLUGS,
} from './terminalPortfolioProjectData'
import {
  getTestimonialByPersonSlug,
  getTestimonialPersonFolderFiles,
  getTestimonialPersonSlugs,
  TESTIMONIALS_WEBPAGE_FILE,
} from './testimonialsData'
import {
  CONTACT_FOLDER_FILES,
  isNestedPortfolioProjectFolder,
  isContactFolder,
  isPersonalFolder,
  isPortfolioCategoryFolder,
  isPortfolioRoot,
  isResumeFolder,
  isTestimonialsFolder,
  isTestimonialPersonFolder,
  isTravelFolder,
  PERSONAL_FOLDER_FILES,
  RESUME_FOLDER_FILES,
  TRAVEL_FOLDER_FILES,
  TERMINAL_CATEGORY_SLUGS,
} from './terminalPortfolioData'

const LANDING_COMMANDS = ['ls', 'back', 'cd webpage', 'cd terminal', 'cd markgpt', 'cd main']

const ROOT_COMMANDS = ['ls', 'clear', 'back', 'help', '?']

const ROOT_CD_TARGETS = [
  ...TERMINAL_CATEGORY_SLUGS,
  'webpage',
  'markai',
  'markgpt',
  'main',
  'terminal',
]

const FOLDER_COMMANDS = ['ls', 'clear', 'cd ..']

function filesToActionTargets(files) {
  const catTargets = []
  const openTargets = []
  const downloadTargets = []

  for (const file of files) {
    if (file.endsWith('.txt')) {
      catTargets.push(file)
    } else if (
      file.endsWith('.pdf') ||
      file.endsWith('.link') ||
      file.endsWith('.form') ||
      file.endsWith('.github') ||
      file.endsWith('.webpage')
    ) {
      openTargets.push(file)
    }

    if (file.endsWith('.pdf')) {
      downloadTargets.push(file)
    }
  }

  return { catTargets, openTargets, downloadTargets }
}

export function getTerminalAutocompleteCandidates({
  portfolioPath,
  isTerminalPortfolio,
  contactFormActive,
}) {
  if (contactFormActive) {
    return null
  }

  if (!isTerminalPortfolio) {
    return {
      commands: LANDING_COMMANDS,
      cdTargets: [],
      catTargets: [],
      openTargets: [],
      downloadTargets: [],
    }
  }

  if (portfolioPath.length === 0) {
    return {
      commands: ROOT_COMMANDS,
      cdTargets: ROOT_CD_TARGETS,
      catTargets: [],
      openTargets: [],
      downloadTargets: [],
    }
  }

  if (isResumeFolder(portfolioPath)) {
    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      ...filesToActionTargets(RESUME_FOLDER_FILES),
    }
  }

  if (isContactFolder(portfolioPath)) {
    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      ...filesToActionTargets(CONTACT_FOLDER_FILES),
    }
  }

  if (isPersonalFolder(portfolioPath)) {
    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      ...filesToActionTargets(PERSONAL_FOLDER_FILES),
    }
  }

  if (isTestimonialPersonFolder(portfolioPath)) {
    const item = getTestimonialByPersonSlug(portfolioPath[1])
    const files = item ? getTestimonialPersonFolderFiles(item) : []
    const { catTargets, openTargets, downloadTargets } = filesToActionTargets(files)
    const openTargetsWithWebpage = [...new Set([...openTargets, TESTIMONIALS_WEBPAGE_FILE])]

    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      catTargets,
      openTargets: openTargetsWithWebpage,
      downloadTargets,
      singleCatTargetFallback: catTargets.length === 1,
    }
  }

  if (isTestimonialsFolder(portfolioPath)) {
    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..', ...getTestimonialPersonSlugs()],
      catTargets: [],
      openTargets: [TESTIMONIALS_WEBPAGE_FILE],
      downloadTargets: [],
    }
  }

  if (isTravelFolder(portfolioPath)) {
    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      ...filesToActionTargets(TRAVEL_FOLDER_FILES),
    }
  }

  if (isPortfolioRoot(portfolioPath)) {
    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..', ...PORTFOLIO_CATEGORY_SLUGS],
      catTargets: [],
      openTargets: [],
      downloadTargets: [],
    }
  }

  if (isPortfolioCategoryFolder(portfolioPath)) {
    const category = portfolioPath[1]
    const nestedConfig = getNestedPortfolioCategoryConfig(category)

    if (nestedConfig) {
      return {
        commands: FOLDER_COMMANDS,
        cdTargets: ['..', ...nestedConfig.projectSlugs],
        catTargets: [],
        openTargets: nestedConfig.webpageFile ? [nestedConfig.webpageFile] : [],
        downloadTargets: [],
        helpCommands: nestedConfig.categoryHelpCommands.map((item) => item.command),
      }
    }

    const files = PORTFOLIO_CATEGORY_FILES[category] ?? []
    const helpCommands = getPortfolioCategoryHelpCommands(category).map((item) => item.command)

    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      ...filesToActionTargets(files),
      helpCommands,
    }
  }

  if (isNestedPortfolioProjectFolder(portfolioPath)) {
    const nestedConfig = getNestedPortfolioCategoryConfig(portfolioPath[1])
    const projectSlug = portfolioPath[2]
    const files = nestedConfig?.projectFiles[projectSlug] ?? []
    const helpCommands =
      nestedConfig?.getProjectHelpCommands(projectSlug).map((item) => item.command) ?? []

    return {
      commands: FOLDER_COMMANDS,
      cdTargets: ['..'],
      ...filesToActionTargets(files),
      helpCommands,
    }
  }

  return {
    commands: FOLDER_COMMANDS,
    cdTargets: [],
    catTargets: [],
    openTargets: [],
    downloadTargets: [],
  }
}

function getMatches(partial, targets) {
  const lower = partial.toLowerCase()
  return targets.filter((target) => target.toLowerCase().startsWith(lower))
}

function getOpenMatches(partial, targets) {
  const prefixMatches = getMatches(partial, targets)
  if (prefixMatches.length > 0) {
    return prefixMatches
  }

  const lower = partial.toLowerCase()

  return targets.filter((target) => {
    if (!target.endsWith('.link')) {
      return false
    }

    const stem = target.slice(0, -'.link'.length).toLowerCase()
    return stem.endsWith(lower) || stem === lower
  })
}

function completeOpenArgument(prefix, partial, targets) {
  const matches = getOpenMatches(partial, targets)

  if (matches.length === 0) {
    return { type: 'none', message: 'No autocomplete match.' }
  }

  if (matches.length === 1) {
    return {
      type: 'complete',
      value: `${prefix}${matches[0]}`,
    }
  }

  const sharedLength = longestCommonPrefixLength(matches)
  if (sharedLength > partial.length) {
    const sharedPrefix = matches[0].slice(0, sharedLength)
    return {
      type: 'complete',
      value: `${prefix}${sharedPrefix}`,
    }
  }

  return {
    type: 'suggest',
    lines: [matches.join('  ')],
  }
}

function longestCommonPrefixLength(strings) {
  if (strings.length === 0) {
    return 0
  }

  const normalized = strings.map((value) => value.toLowerCase())
  let length = normalized[0].length

  for (let index = 1; index < normalized.length; index += 1) {
    let nextLength = 0
    while (
      nextLength < length &&
      nextLength < normalized[index].length &&
      normalized[0][nextLength] === normalized[index][nextLength]
    ) {
      nextLength += 1
    }
    length = nextLength
    if (length === 0) {
      break
    }
  }

  return length
}

function completeArgument(prefix, partial, targets) {
  const matches = getMatches(partial, targets)

  if (matches.length === 0) {
    return { type: 'none', message: 'No autocomplete match.' }
  }

  if (matches.length === 1) {
    return {
      type: 'complete',
      value: `${prefix}${matches[0]}`,
    }
  }

  const sharedLength = longestCommonPrefixLength(matches)
  if (sharedLength > partial.length) {
    const sharedPrefix = matches[0].slice(0, sharedLength)
    return {
      type: 'complete',
      value: `${prefix}${sharedPrefix}`,
    }
  }

  return {
    type: 'suggest',
    lines: [matches.join('  ')],
  }
}

function completeTopLevelCommand(partial, candidates) {
  const fullCommands = [
    ...candidates.commands,
    ...candidates.cdTargets.map((target) => `cd ${target}`),
    ...(candidates.helpCommands ?? []),
  ]

  const uniqueCommands = [...new Set(fullCommands)]
  const matches = getMatches(partial, uniqueCommands)

  if (matches.length === 0) {
    return { type: 'none', message: 'No autocomplete match.' }
  }

  if (matches.length === 1) {
    return { type: 'complete', value: matches[0] }
  }

  const sharedLength = longestCommonPrefixLength(matches)
  if (sharedLength > partial.length) {
    return {
      type: 'complete',
      value: matches[0].slice(0, sharedLength),
    }
  }

  return {
    type: 'suggest',
    lines: [matches.join('  ')],
  }
}

export function resolveTerminalAutocomplete(input, context) {
  const candidates = getTerminalAutocompleteCandidates(context)

  if (!candidates) {
    return { type: 'none' }
  }

  const trimmedEnd = input.trimEnd()
  const lower = trimmedEnd.toLowerCase()

  if (lower.startsWith('cd ')) {
    return completeArgument('cd ', trimmedEnd.slice(3), candidates.cdTargets)
  }

  if (lower === 'cd') {
    if (candidates.cdTargets.length === 0) {
      return { type: 'none', message: 'No autocomplete match.' }
    }

    return {
      type: 'suggest',
      lines: [candidates.cdTargets.join('  ')],
    }
  }

  if (lower.startsWith('cat ')) {
    const partial = trimmedEnd.slice(4)
    const result = completeArgument('cat ', partial, candidates.catTargets)

    if (
      result.type === 'none' &&
      candidates.singleCatTargetFallback &&
      candidates.catTargets.length === 1 &&
      partial.length > 0
    ) {
      return {
        type: 'complete',
        value: `cat ${candidates.catTargets[0]}`,
      }
    }

    return result
  }

  if (lower.startsWith('open ')) {
    return completeOpenArgument('open ', trimmedEnd.slice(5), candidates.openTargets)
  }

  if (lower.startsWith('download ')) {
    return completeArgument('download ', trimmedEnd.slice(9), candidates.downloadTargets)
  }

  return completeTopLevelCommand(trimmedEnd, candidates)
}

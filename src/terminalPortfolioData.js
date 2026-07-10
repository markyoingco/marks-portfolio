export const TERMINAL_CATEGORY_SLUGS = [
  'resume',
  'personal',
  'portfolio',
  'testimonials',
  'travel',
  'photos',
  'contact',
]

export const TERMINAL_HELP_COMMANDS = [
  'ls',
  'cd resume',
  'cd personal',
  'cd portfolio',
  'cd testimonials',
  'cd travel',
  'cd photos',
  'cd contact',
  'clear',
  'back',
]

export const TERMINAL_HELP_MODE_NOTE =
  'Mode: cd webpage · cd markai · cd main · cd terminal'

export function getTerminalCategoryPlaceholderLines(slug) {
  const label = slug.replace(/-/g, ' ')

  return [`Opening ${label}...`, `${label} terminal content coming soon.`]
}

export const MARKAI_CD_TARGETS = new Set([
  'markai',
  'markgpt',
  'ai',
  'mark-ai',
  'my-ai',
  'my ai',
])

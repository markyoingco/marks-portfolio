/**
 * Canonical short `open` aliases for Terminal.
 * Destinations must match markai-knowledge/links/trusted-links.json (and Webpage/Terminal maps).
 * Do not add private/XINU repositories or disabled email here.
 */

import { RESUME_PDF_PATH } from './resumeDocument'
import { VSCO_GALLERY_URL } from './terminalPersonalFileOutput'

/** @typedef {'openUrl' | 'openResumePdf' | 'openTravelWebpage' | 'openTestimonialsWebpage' | 'openWebpageScreen' | 'openMarkAi'} PublicOpenActionType */

/**
 * @typedef {{
 *   type: PublicOpenActionType,
 *   url?: string,
 *   screen?: string,
 *   lines: string[],
 *   trustedLinkId?: string,
 * }} PublicOpenAliasResult
 */

/**
 * Short aliases → approved public destinations.
 * Keys are lowercase command tails after `open `.
 */
export const PUBLIC_OPEN_ALIASES = {
  github: {
    type: 'openUrl',
    url: 'https://github.com/markyoingco',
    trustedLinkId: 'link-github-profile',
    lines: ['Opening GitHub profile...'],
  },
  linkedin: {
    type: 'openUrl',
    url: 'https://www.linkedin.com/in/mark-yoingco',
    trustedLinkId: 'link-linkedin',
    lines: ['Opening LinkedIn...'],
  },
  resume: {
    type: 'openResumePdf',
    url: RESUME_PDF_PATH,
    trustedLinkId: 'link-resume-pdf',
    lines: ['Opening resume.pdf...'],
  },
  contact: {
    type: 'openWebpageScreen',
    screen: 'contact',
    trustedLinkId: 'link-contact-section',
    lines: ['Opening contact...'],
  },
  travel: {
    type: 'openTravelWebpage',
    trustedLinkId: 'link-travel-section',
    lines: ['Opening travel...'],
  },
  vsco: {
    type: 'openUrl',
    url: VSCO_GALLERY_URL,
    trustedLinkId: 'link-vsco',
    lines: ['Opening vsco.link...'],
  },
  photography: {
    type: 'openUrl',
    url: VSCO_GALLERY_URL,
    trustedLinkId: 'link-vsco',
    lines: ['Opening photography (VSCO)...'],
  },
  testimonials: {
    type: 'openTestimonialsWebpage',
    trustedLinkId: 'link-testimonials-section',
    lines: ['Opening testimonials...'],
  },
  markai: {
    type: 'openMarkAi',
    trustedLinkId: 'link-markai-route',
    lines: ['Opening MarkAI...'],
  },
  portfolio: {
    type: 'openWebpageScreen',
    screen: 'portfolio',
    trustedLinkId: 'link-portfolio-section',
    lines: ['Opening portfolio...'],
  },
  'portfolio-site': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/marks-portfolio',
    trustedLinkId: 'link-github-portfolio',
    lines: ['Opening marks-portfolio repository...'],
  },
  abacus: {
    type: 'openUrl',
    url: 'https://github.com/musyslab/Abacus',
    trustedLinkId: 'link-github-abacus',
    lines: ['Opening Abacus repository...'],
  },
  maat: {
    type: 'openUrl',
    url: 'https://github.com/musyslab/MAAT',
    trustedLinkId: 'link-github-maat',
    lines: ['Opening MAAT repository...'],
  },
  'ta-bot': {
    type: 'openUrl',
    url: 'https://github.com/musyslab/MAAT',
    trustedLinkId: 'link-github-maat',
    lines: ['Opening MAAT repository...'],
  },
  finch: {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/BirdVroomVroom',
    trustedLinkId: 'link-github-finch',
    lines: ['Opening Finch repository...'],
  },
  'finch-controller': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/BirdVroomVroom',
    trustedLinkId: 'link-github-finch',
    lines: ['Opening Finch repository...'],
  },
  'space-shmup': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/space-shmup-unity',
    trustedLinkId: 'link-github-space-shmup',
    lines: ['Opening Space SHMUP repository...'],
  },
  'apple-picker': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/apple-picker-unity',
    trustedLinkId: 'link-github-apple-picker',
    lines: ['Opening Apple Picker repository...'],
  },
  'mission-demolition': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/mission-demolition-unity',
    trustedLinkId: 'link-github-mission-demolition',
    lines: ['Opening Mission Demolition repository...'],
  },
  'operating-systems-c': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/operating-systems-c-projects',
    trustedLinkId: 'link-github-os-c-docs',
    lines: ['Opening Operating Systems C documentation repository...'],
  },
  'operating-systems': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/operating-systems-c-projects',
    trustedLinkId: 'link-github-os-c-docs',
    lines: ['Opening Operating Systems C documentation repository...'],
  },
  fmsc: {
    type: 'openUrl',
    url: 'https://www.fmsc.org/locations/libertyville-il',
    trustedLinkId: 'link-fmsc-libertyville',
    lines: ['Opening Feed My Starving Children (Libertyville)...'],
  },
  'sleep-analysis': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/sleep-efficiency-analysis',
    trustedLinkId: 'link-github-sleep-efficiency',
    lines: ['Opening Sleep Efficiency Analysis repository...'],
  },
  'basketball-predictor': {
    type: 'openUrl',
    url: 'https://github.com/markyoingco/marquette-basketball-predictor-2024',
    trustedLinkId: 'link-github-marquette-basketball-predictor',
    lines: ['Opening Marquette Basketball Predictor repository...'],
  },
}

export const PUBLIC_OPEN_ALIAS_KEYS = Object.keys(PUBLIC_OPEN_ALIASES).sort((a, b) =>
  a.localeCompare(b),
)

/**
 * @param {string} lowerCommand full lowercased command
 * @returns {PublicOpenAliasResult | null}
 */
export function parsePublicOpenAliasCommand(lowerCommand) {
  const trimmed = String(lowerCommand || '').trim().toLowerCase()
  if (!trimmed.startsWith('open ')) {
    return null
  }
  const alias = trimmed.slice(5).trim()
  if (!alias || alias.includes('/') || alias.includes('.')) {
    // Keep dotted file opens (abacus.github, resume.pdf, vsco.link) on existing parsers.
    return null
  }
  const entry = PUBLIC_OPEN_ALIASES[alias]
  if (!entry) {
    return null
  }
  return {
    type: entry.type,
    url: entry.url,
    screen: entry.screen,
    lines: entry.lines,
    trustedLinkId: entry.trustedLinkId,
  }
}

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const KNOWLEDGE_ROOT = path.join(REPO_ROOT, 'markai-knowledge')
const EXPORT_PATH = path.join(REPO_ROOT, 'server', 'markai', 'generated', 'approved-v1.json')

const CORE_CATEGORIES = new Set([
  'profile',
  'education',
  'career-direction',
  'work-style',
  'contact',
  'navigation',
])

const RECORD_RUNTIME_FIELDS = [
  'id',
  'category',
  'recordType',
  'title',
  'publicText',
  'shortText',
  'aliases',
  'keywords',
  'technologies',
  'dates',
  'projectIds',
  'relatedRecordIds',
  'linkIds',
  'answerUses',
  'prohibitedUses',
  'notes',
]

function fail(message) {
  console.error(`MarkAI export failed: ${message}`)
  process.exit(1)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function listJsonFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(dirPath, name))
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2) + '\n'
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

function pickFields(source, fields) {
  const out = {}
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      out[field] = source[field]
    }
  }
  return out
}

function classifyPolicy(rule) {
  const action = String(rule.action || '').toLowerCase()
  const hasModel = typeof rule.modelInstruction === 'string' && rule.modelInstruction.length > 0
  const serverish = ['validate-and-block', 'omit', 'refuse', 'enforce'].includes(action)
  if (hasModel && serverish) return 'model-and-server'
  if (hasModel) return 'model'
  if (serverish) return 'server'
  return 'model-and-server'
}

function compactPolicy(rule) {
  return {
    id: rule.id,
    category: rule.category,
    action: rule.action,
    purpose: rule.category,
    publicBehavior: rule.publicBehavior,
    modelInstruction: rule.modelInstruction,
    logPolicy: rule.logPolicy,
    notes: rule.notes,
    enforcement: classifyPolicy(rule),
  }
}

function compactLink(link) {
  return pickFields(link, [
    'id',
    'label',
    'href',
    'type',
    'public',
    'enabled',
    'allowedContexts',
    'external',
    'opensNewTab',
    'disclosure',
    'relatedRecordIds',
    'notes',
  ])
}

function hasApprovedAbacusEventScale(text) {
  const hasApproxScale = /approximately\s+200\s*[-–—]\s*300/i.test(text)
  const hasAbacus = /\babacus\b/i.test(text)
  const hasEventDate = /april\s+15,?\s+2026/i.test(text)
  const hasStakeholders =
    /(?:high-school\s+)?students?,?\s+teachers?,?\s+judges?,?\s+and\s+administrators/i.test(text)
  return hasApproxScale && hasAbacus && hasEventDate && hasStakeholders
}

function scanUnsafeText(label, text, { claimSurface = false } = {}) {
  if (typeof text !== 'string' || text.length === 0) return

  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
    fail(`${label} contains a phone-number pattern`)
  }
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) {
    fail(`${label} contains an email address`)
  }
  if (/XINU26|ayazdani1/i.test(text)) {
    fail(`${label} exposes private/shared XINU repository material`)
  }

  // Awkward 200-300+ phrase remains rejected everywhere.
  if (/200\s*[-–—]\s*300\+|200-300\+/i.test(text)) {
    fail(`${label} contains unsupported Abacus 200-300+ wording`)
  }

  // Affirmative claim surfaces only (publicText/shortText/title).
  if (claimSurface) {
    if (/(api[_-]?key\s*[:=]|password\s*[:=]|db_pass\s*[:=]|connection string\s*[:=])/i.test(text)) {
      fail(`${label} appears to contain credential-like material`)
    }
    if (/\bled frontend\b/i.test(text)) {
      fail(`${label} contains affirmative Finch "led frontend" wording`)
    }
    if (/\buses vitest\b|\bused vitest\b|\bvitest framework\b/i.test(text) && !/\bnot\b|\bnever\b|\bdo not\b/i.test(text)) {
      fail(`${label} contains affirmative Vitest use`)
    }
    if (
      /300\s+verified\s+users|300\s+customers|300\s+paying\s+users|300\s+daily\s+active\s+users|enterprise[- ]scale(?:\s+\w+)*\s+traffic|more\s+than\s+300\s+users|thousands\s+of\s+users/i.test(
        text,
      )
    ) {
      fail(`${label} contains unsupported inflated Abacus/user-scale wording`)
    }
    if (/200\s*[-–—]\s*300|200-300/.test(text) && !hasApprovedAbacusEventScale(text)) {
      fail(
        `${label} mentions 200-300 without approved Abacus April 15, 2026 live-competition stakeholder wording`,
      )
    }
  }
}

function scanRecordSafety(record) {
  const claimFields = [record.title, record.publicText, record.shortText]
  for (const blob of claimFields) {
    scanUnsafeText(`record ${record.id}`, blob, { claimSurface: true })
    if (typeof blob === 'string' && /https?:\/\//i.test(blob)) {
      fail(`record ${record.id} contains a raw URL; hrefs belong only in trustedLinks`)
    }
  }

  const supportFields = [
    record.notes,
    ...(record.aliases || []),
    ...(record.keywords || []),
    ...(record.technologies || []),
    ...(record.answerUses || []),
    ...(record.prohibitedUses || []),
  ]
  for (const blob of supportFields) {
    scanUnsafeText(`record ${record.id}`, blob, { claimSurface: false })
    if (typeof blob === 'string' && /https?:\/\//i.test(blob)) {
      fail(`record ${record.id} contains a raw URL; hrefs belong only in trustedLinks`)
    }
  }
}

function scanPolicySafety(rule) {
  for (const field of ['publicBehavior', 'modelInstruction', 'notes']) {
    const value = rule[field]
    scanUnsafeText(`policy ${rule.id}.${field}`, value, { claimSurface: false })
    if (typeof value === 'string' && /https?:\/\//i.test(value)) {
      fail(`policy ${rule.id}.${field} contains a raw URL`)
    }
  }
}

function loadSources() {
  const recordFiles = listJsonFiles(path.join(KNOWLEDGE_ROOT, 'records'))
  const policyFiles = {
    privacy: path.join(KNOWLEDGE_ROOT, 'policies', 'privacy-boundaries.json'),
    voice: path.join(KNOWLEDGE_ROOT, 'policies', 'voice-and-answer-behavior.json'),
    linkContact: path.join(KNOWLEDGE_ROOT, 'policies', 'link-and-contact-behavior.json'),
  }
  const linksFile = path.join(KNOWLEDGE_ROOT, 'links', 'trusted-links.json')

  const records = []
  for (const filePath of recordFiles) {
    const data = readJson(filePath)
    if (!Array.isArray(data.records)) {
      fail(`missing records array in ${path.relative(REPO_ROOT, filePath)}`)
    }
    for (const record of data.records) {
      records.push(record)
    }
  }

  const privacy = readJson(policyFiles.privacy).rules || []
  const voice = readJson(policyFiles.voice).rules || []
  const linkContact = readJson(policyFiles.linkContact).rules || []
  const trustedLinks = readJson(linksFile).links || []

  return {
    recordFiles,
    policyFiles,
    linksFile,
    records,
    privacy,
    voice,
    linkContact,
    trustedLinks,
  }
}

function validateAndBuildExport(sources) {
  const { records, privacy, voice, linkContact, trustedLinks } = sources
  const recordIds = new Set()
  const projectIds = new Set()
  const policyIds = new Set()
  const linkIds = new Set()

  for (const record of records) {
    if (!record?.id) fail('record missing id')
    if (recordIds.has(record.id)) fail(`duplicate record ID: ${record.id}`)
    recordIds.add(record.id)
    if (record.category === 'projects') projectIds.add(record.id)

    if (record.reviewedByMark !== true) {
      fail(`record ${record.id} failed approval gate: reviewedByMark !== true`)
    }
    if (!['verified', 'approved-summary'].includes(record.status)) {
      fail(`record ${record.id} failed approval gate: status=${record.status}`)
    }
    const visibility = record.visibility || {}
    for (const key of ['answerable', 'exportPublic', 'modelVisible']) {
      if (visibility[key] !== true) {
        fail(`record ${record.id} failed approval gate: visibility.${key} !== true`)
      }
    }
    scanRecordSafety(record)
  }

  for (const record of records) {
    for (const relatedId of record.relatedRecordIds || []) {
      if (!recordIds.has(relatedId)) {
        fail(`record ${record.id} has unresolved relatedRecordId: ${relatedId}`)
      }
    }
    for (const projectId of record.projectIds || []) {
      if (!projectIds.has(projectId)) {
        fail(`record ${record.id} has unresolved projectId: ${projectId}`)
      }
    }
    if (record.projectId && !projectIds.has(record.projectId)) {
      fail(`record ${record.id} has unresolved projectId field: ${record.projectId}`)
    }
  }

  for (const group of [privacy, voice, linkContact]) {
    for (const rule of group) {
      if (!rule?.id) fail('policy missing id')
      if (policyIds.has(rule.id)) fail(`duplicate policy ID: ${rule.id}`)
      policyIds.add(rule.id)
      scanPolicySafety(rule)
    }
  }

  for (const link of trustedLinks) {
    if (!link?.id) fail('trusted link missing id')
    if (linkIds.has(link.id)) fail(`duplicate trusted-link ID: ${link.id}`)
    linkIds.add(link.id)
    if (/XINU26|ayazdani1/i.test(String(link.href || ''))) {
      fail(`trusted link ${link.id} points to a private/shared XINU repository`)
    }
    if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(String(link.href || ''))) {
      fail(`trusted link ${link.id} looks like a phone link`)
    }
  }

  for (const record of records) {
    for (const linkId of record.linkIds || []) {
      if (!linkIds.has(linkId)) {
        fail(`record ${record.id} has unresolved linkId: ${linkId}`)
      }
    }
  }

  const email = trustedLinks.find((l) => l.id === 'link-email')
  const markai = trustedLinks.find((l) => l.id === 'link-markai-route')
  if (!email || email.enabled !== false) fail('link-email must exist and remain disabled')
  if (!markai || markai.enabled !== true) fail('link-markai-route must exist and remain enabled now that MarkAI is live')

  const runtimeRecords = records.map((record) => pickFields(record, RECORD_RUNTIME_FIELDS))
  const coreRecordIds = runtimeRecords
    .filter((record) => CORE_CATEGORIES.has(record.category))
    .map((record) => record.id)

  const exportObject = {
    schemaVersion: '1.0.0',
    sourceDigest: '',
    counts: {
      records: runtimeRecords.length,
      skills: runtimeRecords.filter((r) => r.category === 'skills').length,
      trustedLinks: trustedLinks.length,
      enabledTrustedLinks: trustedLinks.filter((l) => l.enabled === true).length,
      privacyRules: privacy.length,
      voiceRules: voice.length,
      linkContactRules: linkContact.length,
    },
    coreRecordIds,
    records: runtimeRecords,
    policies: {
      privacy: privacy.map(compactPolicy),
      voice: voice.map(compactPolicy),
      linkContact: linkContact.map(compactPolicy),
    },
    trustedLinks: trustedLinks.map(compactLink),
  }

  // Digest excludes itself: hash canonical payload with empty digest placeholder removed.
  const digestBasis = {
    schemaVersion: exportObject.schemaVersion,
    counts: exportObject.counts,
    coreRecordIds: exportObject.coreRecordIds,
    records: exportObject.records,
    policies: exportObject.policies,
    trustedLinks: exportObject.trustedLinks,
  }
  exportObject.sourceDigest = sha256Hex(JSON.stringify(digestBasis))

  const expected = {
    records: 103,
    skills: 26,
    trustedLinks: 28,
    enabledTrustedLinks: 27,
    privacyRules: 14,
    voiceRules: 7,
    linkContactRules: 8,
  }
  for (const [key, value] of Object.entries(expected)) {
    if (exportObject.counts[key] !== value) {
      fail(`count mismatch for ${key}: expected ${value}, got ${exportObject.counts[key]}`)
    }
  }

  return exportObject
}

function main() {
  const checkMode = process.argv.includes('--check')
  const sources = loadSources()
  const exportObject = validateAndBuildExport(sources)
  const serialized = stableStringify(exportObject)

  if (checkMode) {
    if (!fs.existsSync(EXPORT_PATH)) {
      fail(`export missing at ${path.relative(REPO_ROOT, EXPORT_PATH)}`)
    }
    const current = fs.readFileSync(EXPORT_PATH, 'utf8')
    if (current !== serialized) {
      fail('approved-v1.json is out of date with source knowledge')
    }
    console.log('MarkAI export check OK')
    console.log(`sourceDigest=${exportObject.sourceDigest}`)
    console.log(JSON.stringify(exportObject.counts))
    return
  }

  fs.mkdirSync(path.dirname(EXPORT_PATH), { recursive: true })
  fs.writeFileSync(EXPORT_PATH, serialized, 'utf8')
  console.log('MarkAI export written')
  console.log(path.relative(REPO_ROOT, EXPORT_PATH))
  console.log(`sourceDigest=${exportObject.sourceDigest}`)
  console.log(JSON.stringify(exportObject.counts))
  console.log(`coreRecordIds=${exportObject.coreRecordIds.length}`)
}

main()

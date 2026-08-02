/**
 * Shared MarkAI intent normalization, typo tolerance, and topic matching.
 * Mirrors server/markai/IntentUnderstanding.php using the same ontology JSON.
 */

import ontology from '../../markai-knowledge/routing/intent-ontology.json'

function getOntology() {
  return ontology && typeof ontology === 'object' ? ontology : {}
}

export function normalizeIntentText(question) {
  let text = String(question || '')
    .trim()
    .toLowerCase()
  text = text
    .replace(/[\u2019\u2018`]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
  text = text.replace(/[áàäâ]/g, 'a')
  text = text.replace(/[éèëê]/g, 'e')
  text = text.replace(/[íìïî]/g, 'i')
  text = text.replace(/[óòöô]/g, 'o')
  text = text.replace(/[úùüû]/g, 'u')
  text = text.replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
  text = text.replace(/[?!.,;:]+/g, ' ')
  text = text.replace(/\b(what's|whats)\b/g, 'what is')
  text = text.replace(/\b(who's|whos)\b/g, 'who is')
  text = text.replace(/\b(where's|wheres)\b/g, 'where is')
  text = text.replace(/\b(can't|cant)\b/g, 'can not')
  text = text.replace(/\b(don't|dont)\b/g, 'do not')
  text = text.replace(/\bi'm\b/g, 'i am')
  text = text.replace(/\byou're\b/g, 'you are')
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = new Array(n + 1)
  for (let j = 0; j <= n; j += 1) row[j] = j
  for (let i = 1; i <= m; i += 1) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= n; j += 1) {
      const cur = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = cur
    }
  }
  return row[n]
}

export function applyIntentTypos(text) {
  const data = getOntology()
  const typos = data.typos && typeof data.typos === 'object' ? data.typos : {}
  const oneWord = data.oneWord && typeof data.oneWord === 'object' ? data.oneWord : {}
  const fuzzyTargets = new Set()
  for (const token of Object.keys(oneWord)) {
    if (token && !/family|salary|password|email|phone|private|journal|contact/i.test(token)) {
      fuzzyTargets.add(token)
    }
  }
  for (const token of [
    'goals',
    'hobbies',
    'projects',
    'experience',
    'favorite',
    'movies',
    'music',
    'artists',
    'personality',
    'resume',
    'repository',
    'collaborators',
    'photography',
    'testimonials',
    'education',
    'mindset',
    'fitness',
    'bodybuilding',
    'mythology',
    'travel',
    'traveled',
    'github',
    'skills',
    'color',
  ]) {
    fuzzyTargets.add(token)
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const clean = part.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
      if (!clean) return part
      if (typeof typos[clean] === 'string') return typos[clean]
      if (fuzzyTargets.has(clean) || clean in oneWord) return clean
      let best = null
      let bestDistance = Infinity
      if (clean.length >= 5) {
        for (const candidate of fuzzyTargets) {
          const distance = levenshtein(clean, candidate)
          if (distance === 1 && distance < bestDistance) {
            best = candidate
            bestDistance = distance
          }
        }
      }
      return best || clean
    })
    .join(' ')
    .trim()
}

function includesAny(text, phrases) {
  return (phrases || []).some((phrase) => phrase && text.includes(phrase))
}

function historyContext(history) {
  return (Array.isArray(history) ? history.slice(-6) : [])
    .map((turn) => String(turn?.content || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ')
}

export function rewriteIntentPronouns(text, history = []) {
  const context = historyContext(history)
  const collaboratorFocus = includesAny(context, [
    'justin',
    'angel',
    'jacob',
    'sam mazzone',
    'julianne',
    'luis',
    'xavier',
    'allan',
    'armaan',
    'hunter',
    'zack',
    'farzeen',
    'jorge',
    'collaborator',
    'teammate',
    'team included',
    'worked with',
  ])
  if (collaboratorFocus) return text

  let out = text.replace(/\bmark yoingco\b/g, 'mark')
  out = out.replace(/\babout him\b/g, 'about mark')
  out = out.replace(/\bfacts about him\b/g, 'facts about mark')
  out = out.replace(/\bdoes he\b/g, 'does mark')
  out = out.replace(/\bis he\b/g, 'is mark')
  out = out.replace(/\bwhat is he\b/g, 'what is mark')
  out = out.replace(/\bwhat does he\b/g, 'what does mark')
  out = out.replace(/\bwhere does he\b/g, 'where does mark')
  out = out.replace(/\bhis\b/g, "mark's")
  out = out.replace(/\bhim\b/g, 'mark')
  out = out.replace(/\bhe\b/g, 'mark')
  return out.replace(/\s+/g, ' ').trim()
}

export function prepareIntentText(question, history = []) {
  let text = normalizeIntentText(question)
  text = applyIntentTypos(text)
  text = rewriteIntentPronouns(text, history)
  return text
}

function result(category, mode, answer) {
  return {
    category,
    mode,
    answer,
    answerStatus: 'answered',
  }
}

function categoryToResult(category, answers, normalized = '') {
  let mode = 'casual'
  let answerKey = category
  switch (category) {
    case 'careerGoals':
      if (includesAny(normalized, ['success'])) {
        answerKey = 'success'
      } else if (
        includesAny(normalized, [
          'want to work',
          'job locations',
          'work',
          'relocate',
        ])
      ) {
        mode = 'recruiter'
        answerKey = 'workLocation'
      } else {
        answerKey = 'careerGoals'
      }
      break
    case 'hobbies':
      if (
        includesAny(normalized, ['dog', 'kobe']) ||
        normalized === 'dog' ||
        normalized === 'dog name'
      ) {
        answerKey = 'dog'
      }
      break
    case 'favoriteColor':
      answerKey = 'favoriteColor'
      break
    case 'technologies':
    case 'projectsInventory':
    case 'githubOnly':
      mode = 'technical'
      break
    case 'work':
    case 'profile':
    case 'resume':
    case 'contact':
    case 'testimonials':
    case 'testimonialsList':
    case 'testimonialsAllQuotes':
    case 'testimonialProfessors':
    case 'testimonialCoworkers':
    case 'testimonialZack':
    case 'testimonialFarzeen':
    case 'testimonialJorge':
      mode = 'recruiter'
      if (category === 'testimonialsList') {
        answerKey = includesAny(normalized, ['all full', 'all quotes'])
          ? 'testimonialsAllQuotes'
          : 'testimonialsList'
      } else if (
        includesAny(normalized, [
          'full quote',
          'exact quote',
          'word for word',
          'direct quote',
          'full testimonial',
        ])
      ) {
        if (category === 'testimonialZack') answerKey = 'testimonialZackQuote'
        else if (category === 'testimonialFarzeen')
          answerKey = 'testimonialFarzeenQuote'
        else if (category === 'testimonialJorge')
          answerKey = 'testimonialJorgeQuote'
      }
      break
    case 'capabilities':
      mode = 'general'
      break
    default:
      break
  }
  const answer = String(answers[answerKey] || answers[category] || '')
  if (!answer) return null
  return result(category, mode, answer)
}

function matchMultiTopic(text, answers) {
  const hints = getOntology().multiTopicHints || {}
  const matched = {}
  for (const [category, needles] of Object.entries(hints)) {
    if (!Array.isArray(needles)) continue
    if (needles.some((needle) => needle && text.includes(needle))) {
      matched[category] = true
    }
  }
  if (Object.keys(matched).length < 2) return null
  if (matched.funFacts && includesAny(text, ['fun', 'facts', 'into', 'like'])) {
    return null
  }

  if (
    matched.travelPlaces &&
    matched.careerGoals &&
    includesAny(text, [
      'want to work',
      'job locations',
      'work location',
      'where does mark want',
    ]) &&
    answers.travelAndWork
  ) {
    return result('travelPlaces', 'casual', answers.travelAndWork)
  }

  const sections = []
  if (matched.careerGoals) sections.push(`Goals: ${answers.careerGoals || ''}`)
  if (matched.projectsInventory) {
    sections.push(
      'Projects: Mark’s approved public software work includes his portfolio platform, MarkAI, Abacus, TA-Bot / MAAT, Finch, Operating Systems coursework, Unity games, and data projects.',
    )
  }
  if (matched.technologies) sections.push(`Skills: ${answers.technologies || ''}`)
  if (matched.hobbies || matched.funFacts) sections.push(`Interests: ${answers.hobbies || ''}`)
  if (matched.personality || matched.vibe) {
    sections.push(`Personality: ${answers.vibe || answers.personality || ''}`)
  }
  if (matched.work) sections.push(`Experience: ${answers.work || ''}`)
  if (matched.favoriteArtists) sections.push(`Music: ${answers.favoriteArtists || ''}`)
  if (matched.favoriteFilms) sections.push(`Films: ${answers.favoriteFilms || ''}`)
  if (matched.bodybuilding || matched.powerlifting) {
    sections.push(`Fitness: ${answers.bodybuilding || ''}`)
  }
  if (matched.travelPlaces) sections.push(`Travel: ${answers.travelPlaces || ''}`)
  if (sections.length < 2) return null
  const clipped = sections.slice(0, 3)
  return result(
    'multiTopic',
    'general',
    `Here is a concise overview of those topics:\n\n- ${clipped.join('\n- ')}`,
  )
}

export function matchIntentTopic(text, answers) {
  const data = getOntology()
  const normalized = text.trim()

  const capabilities = data.topics?.capabilities
  if (capabilities) {
    const projectMention = includesAny(normalized, [
      'abacus',
      'maat',
      'finch',
      'portfolio',
      'shmup',
      'apple picker',
      'mission demolition',
      'sleep',
      'basketball',
      'operating systems',
      'markai',
    ])
    if (
      !projectMention &&
      (includesAny(normalized, [
        'what can i ask',
        'what can you answer',
        'what can you help',
        'options of questions',
        'question options',
        'what do you know',
        'what should i ask',
        'what are you capable',
        'example questions',
        'sample questions',
        'my options',
        'options of question',
      ]) ||
        ['help', 'topics', 'examples', 'capabilities'].includes(normalized) ||
        (includesAny(normalized, ['what can you']) &&
          includesAny(normalized, ['ask', 'answer', 'know', 'help', 'capable', 'topics'])))
    ) {
      return result(
        'capabilities',
        'general',
        String(answers.capabilities || answers.fallback || ''),
      )
    }
  }

  const funFacts = data.topics?.funFacts
  if (funFacts) {
    const aliases = Array.isArray(funFacts.aliases) ? funFacts.aliases : []
    const specificTopic = includesAny(normalized, [
      'music',
      'movie',
      'movies',
      'film',
      'films',
      'show',
      'marvel',
      'dc',
      'creed',
      'batman',
      'artist',
      'artists',
      'gym',
      'bodybuilding',
      'fitness',
      'photograph',
      'travel',
      'mythology',
      'project',
      'skill',
      'goal',
    ])
    if (
      !specificTopic &&
      (includesAny(normalized, aliases) ||
        (normalized.includes('facts') &&
          includesAny(normalized, [
            'fun',
            'interesting',
            'about mark',
            'about him',
            'all the',
            'all about',
          ])) ||
        includesAny(normalized, [
          'what does mark like',
          'what is mark into',
          'what does he like',
          'what is he into',
        ]))
    ) {
      return result('funFacts', 'casual', String(answers.funFacts || answers.hobbies || ''))
    }
  }

  const oneWord = data.oneWord && typeof data.oneWord === 'object' ? data.oneWord : {}
  if (typeof oneWord[normalized] === 'string') {
    return categoryToResult(oneWord[normalized], answers, normalized)
  }

  const multi = matchMultiTopic(normalized, answers)
  if (multi) return multi

  for (const topicId of ['careerGoals', 'vibe', 'drives', 'favoriteArtists', 'favoriteFilms']) {
    const topic = data.topics?.[topicId]
    if (!topic) continue
    const aliases = Array.isArray(topic.aliases) ? topic.aliases : []
    if (!includesAny(normalized, aliases)) continue
    let answer = String(answers[topic.answerKey || topic.category || topicId] || '')
    const category = String(topic.category || topicId)
    if (category === 'careerGoals' && includesAny(normalized, ['success'])) {
      answer = String(answers.success || answer)
    }
    if (category === 'bodybuilding') {
      if (
        includesAny(normalized, [
          'gym taught',
          'fitness taught',
          'what has fitness',
          'what has the gym',
          'taught mark',
        ])
      ) {
        answer = String(answers.fitnessTaught || answer)
      } else if (
        includesAny(normalized, [
          'bodybuilding mean',
          'what does bodybuilding',
          'why bodybuilding',
          'why did mark move',
          'move from powerlifting',
          'powerlifting to bodybuilding',
        ])
      ) {
        answer = String(answers.bodybuildingMeaning || answer)
      }
    }
    if (category === 'favoriteFilms') {
      if (includesAny(normalized, ['regular show'])) answer = String(answers.favoriteShow || answer)
      else if (includesAny(normalized, ['marvel', 'dc', 'superhero'])) {
        answer = String(answers.favoriteFilmsMarvelDc || answer)
      }
    }
    return result(category, String(topic.mode || 'casual'), answer)
  }

  return null
}

export function resolveTopicFollowup(text, history, answers) {
  const data = getOntology()
  let normalized = text.trim().replace(/[?.!]+$/g, '')
  const followUps = data.followUpTopics && typeof data.followUpTopics === 'object' ? data.followUpTopics : {}

  if (!(normalized in followUps) && !(text in followUps)) {
    if (normalized.startsWith('and ')) {
      const trimmed = normalized.slice(4).trim()
      if (trimmed in followUps || `${trimmed}?` in followUps) {
        normalized = trimmed
      }
    }
  }

  const target = followUps[normalized] || followUps[`${normalized}?`] || followUps[text]
  if (typeof target !== 'string' || !target) return null

  const context = historyContext(history)
  if (
    target === 'testimonials' &&
    (normalized === 'full quote' ||
      normalized === 'exact quote' ||
      text.trim().toLowerCase().startsWith('full quote'))
  ) {
    if (
      context.includes('zack') ||
      context.includes('kohlwey') ||
      context.includes('alumni memorial')
    ) {
      return categoryToResult('testimonialZack', answers, 'full quote')
    }
    if (
      context.includes('farzeen') ||
      context.includes('harunani') ||
      context.includes('professor of computer science')
    ) {
      return categoryToResult('testimonialFarzeen', answers, 'full quote')
    }
    if (
      context.includes('jorge') ||
      context.includes('torres') ||
      context.includes('performance validation')
    ) {
      return categoryToResult('testimonialJorge', answers, 'full quote')
    }
  }

  if (target === 'collaboratorsContextual') {
    const projectMap = data.projectContext && typeof data.projectContext === 'object' ? data.projectContext : {}
    for (const [needle, category] of Object.entries(projectMap)) {
      if (context.includes(needle)) {
        return categoryToResult(category, answers)
      }
    }
    return categoryToResult('collaboratorsInventory', answers)
  }

  return categoryToResult(target, answers, normalized)
}

export function getIntentOntology() {
  return getOntology()
}

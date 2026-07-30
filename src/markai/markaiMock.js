/**
 * Local deterministic MarkAI responder.
 * No network, no knowledge export, no persistence.
 */

const MOCK_DELAY_MS = 400

const ANSWERS = {
  profile:
    'Mark Yoingco is a recent Computer Science graduate from Marquette University seeking his first full-time technology role. His work includes a personal portfolio platform, senior design projects, systems coursework, robotics, data projects, and Unity projects.',
  abacus:
    'Abacus was a team senior-design project used for the Wisconsin-Dairyland Programming Competition. Mark’s verified work included Eagle messaging APIs, role-aware chat and inbox behavior, competition workflows, routing and persistence, frontend/backend integration, submission-system support, testing, and UI debugging. The April 15, 2026 event used the platform to support approximately 200–300 high-school students, teachers, judges, and administrators and ran without major server crashes, platform failures, critical bugs, or major lag.',
  technologies:
    'Mark has worked with technologies including JavaScript, TypeScript, Python, Java, R, SQL, C, C#, PHP, React, Vite, Flask, MySQL, Docker, Socket.IO, Linux/WSL, Unity, Figma, Cloudflare Workers AI, and REST-style APIs through coursework and projects.',
  individualTeam:
    'Mark built his portfolio platform as an individual project. Abacus, MAAT, Finch, Sleep Efficiency Analysis, and the basketball predictor were team or coursework projects, so their team context should remain clear.',
  work: 'Mark’s public experience includes AV Technician, Information Desk Specialist Manager, Assistant Building Manager, Hollister retail work, and Panda Express Chef/Person in Charge, along with approved campus leadership experience.',
  contact:
    'The portfolio Contact page is the preferred method. LinkedIn, GitHub, the résumé, and VSCO may also be relevant depending on what a visitor is looking for.',
  sensitive:
    'I only share Mark’s approved public portfolio information. I can help with his projects, skills, experience, education, interests, or the portfolio Contact page.',
  status:
    'MarkAI is live on markyoingco.com and actively maintained. It answers from Mark’s approved portfolio information using a PHP backend and Cloudflare Workers AI, with response validation, deterministic fallback answers, privacy protections, and anonymous usage limits. Future updates may include bug fixes, testing, design refinement, and approved knowledge expansion.',
  fallback:
    'I can answer questions about Mark’s projects, skills, experience, education, interests, goals, and contact options. Try asking a more specific question.',
  favoriteColor:
    'Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he uses throughout his portfolio and personal branding.',
  bodybuilding:
    'Fitness and bodybuilding are major interests for Mark outside technology. Training represents consistency, patience, detail, structure, and progress earned over time, and those habits also influence how he approaches design and technical work.',
  mythology:
    'Mark is strongly interested in Greek mythology, classical statues, and the symbolism behind figures such as Achilles, Icarus, and Heracles. He is drawn to themes like ambition, discipline, strength, consequence, and resilience, and those visual ideas influenced the cinematic direction of his portfolio.',
  values:
    'Mark values discipline, ownership, responsibility, resilience, useful work, and steady improvement. Public goals include building a stable career, becoming financially independent, supporting family, and continuing to grow technically and personally.',
  hobbies:
    'Outside technology, Mark’s public interests include bodybuilding and gym training, hiking, reading, music, travel, photography, running, and Greek mythology and classical art.',
  passion:
    'Mark is passionate about building useful software, improving through consistent practice, and pursuing disciplined growth in both technical work and fitness.',
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase))
}

function classifyQuestion(rawQuestion) {
  const text = String(rawQuestion || '')
    .trim()
    .toLowerCase()

  if (
    includesAny(text, [
      'phone',
      'email address',
      'raw email',
      'password',
      'credential',
      'private repository',
      'private repo',
      'relationship',
      'medical',
      'health',
      'finances',
    ])
  ) {
    return {
      category: 'sensitive',
      mode: 'general',
      answer: ANSWERS.sensitive,
      answerStatus: 'refused',
    }
  }

  if (
    includesAny(text, [
      'is markai live',
      'markai status',
      'connected',
      'real ai',
      'preview',
    ]) ||
    (text.includes('markai') && includesAny(text, ['live', 'status', 'ready', 'working']))
  ) {
    return {
      category: 'status',
      mode: 'general',
      answer: ANSWERS.status,
      answerStatus: 'answered',
    }
  }

  if (includesAny(text, ['abacus', 'eagle', 'messaging'])) {
    return {
      category: 'abacus',
      mode: 'technical',
      answer: ANSWERS.abacus,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'hobbies',
      'interests outside',
      'passionate about',
      'visual style',
    ])
  ) {
    const answer = includesAny(text, ['passionate'])
      ? ANSWERS.passion
      : includesAny(text, ['visual style'])
        ? ANSWERS.favoriteColor
        : ANSWERS.hobbies
    return {
      category: 'hobbies',
      mode: 'casual',
      answer,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'technologies',
      'technology',
      'tech stack',
      'skills',
      'programming languages',
      'tools',
    ])
  ) {
    return {
      category: 'technologies',
      mode: 'technical',
      answer: ANSWERS.technologies,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'built by himself',
      'build by himself',
      'build himself',
      'solo',
      'individual project',
      'team project',
      'ownership',
    ])
  ) {
    return {
      category: 'individualTeam',
      mode: 'technical',
      answer: ANSWERS.individualTeam,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'work experience',
      'jobs',
      'employment',
      'outside the classroom',
      'leadership',
    ])
  ) {
    return {
      category: 'work',
      mode: 'recruiter',
      answer: ANSWERS.work,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'contact',
      'linkedin',
      'github',
      'resume',
      'résumé',
      'vsco',
      'reach mark',
    ])
  ) {
    return {
      category: 'contact',
      mode: 'recruiter',
      answer: ANSWERS.contact,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'who is mark',
      'tell me about mark',
      'background',
      'education',
      'graduate',
    ])
  ) {
    return {
      category: 'profile',
      mode: 'general',
      answer: ANSWERS.profile,
      answerStatus: 'answered',
    }
  }

  if (includesAny(text, ['favorite color', 'favourite color', 'color black'])) {
    return {
      category: 'favoriteColor',
      mode: 'casual',
      answer: ANSWERS.favoriteColor,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'bodybuilding',
      'fitness',
      'gym',
      'training mean',
      'how does fitness',
    ])
  ) {
    return {
      category: 'bodybuilding',
      mode: 'casual',
      answer: ANSWERS.bodybuilding,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'mythology',
      'achilles',
      'icarus',
      'heracles',
      'hercules',
      'greek myth',
    ])
  ) {
    return {
      category: 'mythology',
      mode: 'casual',
      answer: ANSWERS.mythology,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'what does mark value',
      'what motivates',
      'long-term goals',
      'long term goals',
      'what does success',
      'type of person',
      'recruiters to remember',
    ])
  ) {
    return {
      category: 'values',
      mode: 'casual',
      answer: ANSWERS.values,
      answerStatus: 'answered',
    }
  }

  return {
    category: 'fallback',
    mode: 'general',
    answer: ANSWERS.fallback,
    answerStatus: 'unavailable',
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timeoutId = setTimeout(() => {
      resolve()
    }, ms)

    if (!signal) {
      return
    }

    const onAbort = () => {
      clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * @param {string} question
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{
 *   success: true,
 *   answer: string,
 *   answerStatus: 'answered',
 *   links: [],
 *   mode: 'recruiter' | 'technical' | 'general' | 'casual',
 *   conversationId: 'preview',
 *   error: null
 * }>}
 */
export async function getMockMarkAiResponse(question, options = {}) {
  await delay(MOCK_DELAY_MS, options.signal)
  const classified = classifyQuestion(question)

  return {
    success: true,
    answer: classified.answer,
    answerStatus: classified.answerStatus,
    links: [],
    mode: classified.mode,
    conversationId: 'preview',
    error: null,
  }
}

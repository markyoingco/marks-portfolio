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
  links:
    'Mark’s public portfolio links include his homepage, project contact section, GitHub, LinkedIn, résumé, and VSCO profile.',
  sensitive:
    'I only share Mark’s approved public portfolio information. I can help with his projects, skills, experience, education, interests, or the portfolio Contact page.',
  status:
    'MarkAI is live on markyoingco.com and actively maintained. It answers from Mark’s approved portfolio information using a PHP backend and Cloudflare Workers AI, with response validation, deterministic fallback answers, privacy protections, and anonymous usage limits. Future updates may include bug fixes, testing, design refinement, and approved knowledge expansion.',
  favoriteColor:
    'Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he prefers across his portfolio and personal branding, along with clean, organized environments rather than loud or decorative presentation.',
  bodybuilding:
    'Bodybuilding is Mark’s strongest personal passion outside technology. He views it as a craft built through symmetry, structure, patience, detail, and repetition, and his current focus is aesthetics, controlled movement, and quality progress. Lessons from training also shape how he approaches projects and professional development.',
  mythology:
    'Mark connects with different Greek mythology figures for different reasons: Icarus for ambition, Achilles for intensity, and Heracles for discipline and endurance. He is drawn to themes like ambition, discipline, strength, consequence, and resilience, and he does not treat one figure as a permanent favorite or as religion.',
  mythologyIcarus:
    'For Mark, Icarus connects to ambition, dreaming, risk, and the consequences of losing control. It is one symbolic interest among several mythological figures, not a permanent identity or religious claim.',
  mythologyAchilles:
    'For Mark, Achilles connects to intensity, strength, pride, drive, and human vulnerability. It represents one part of the mindset themes he finds meaningful, not a permanent favorite or complete identity.',
  mythologyHeracles:
    'For Mark, Heracles connects to endurance, discipline, repeated trials, and becoming stronger through difficult work. It represents growth through challenging effort rather than a permanent favorite or religious claim.',
  values:
    'Mark values discipline, consistency, responsibility, ownership, ambition, resilience, patience, humility, learning, family support, financial independence, usefulness, creativity, personal growth, controlled confidence, and direct communication. He wants progress to come from repeatable actions rather than temporary intensity.',
  personality:
    'Mark comes across as ambitious, reflective, disciplined, and growth-oriented. He is detail-focused, direct, and practical, confident when prepared, and serious about improving both technically and personally without relying on loud or theatrical self-presentation.',
  discipline:
    'Mark values consistency because motivation is temporary. Whether he is training, building software, or working toward a career, he wants progress to come from repeatable actions rather than temporary intensity, with actions proving intentions.',
  consistency:
    'Mark believes consistency is more dependable than temporary intensity. He values doing the work even when motivation is absent and sees repeated controlled effort as the path to progress.',
  controlledStrength:
    'Mark is drawn to strength with direction. He believes strength without discipline can become wasted potential, and he prefers confidence that is earned, controlled, patient, and deliberate rather than loud or arrogant.',
  setbacks:
    'Mark sees setbacks as lessons that can improve future decisions. He values rebuilding, learning, and continuing after difficult periods, and he wants to keep progressing instead of becoming too comfortable to grow.',
  hobbies:
    'Outside technology, Mark’s public hobbies include bodybuilding and gym training, hiking, reading, music, travel, photography, running, Greek mythology, classical statues and art, museums, and exploring cities and landscapes.',
  passion:
    'Mark is passionate about building useful software and about bodybuilding outside technology. In both areas he focuses on disciplined practice, steady improvement, and work he can stand behind.',
  careerGoals:
    'Mark’s immediate goal is a stable technology role with room to grow, including software development, full-stack work, developer tools, data-oriented systems, and related entry-level paths. He wants meaningful work, financial independence, and the ability to support his family, and he is open to Milwaukee, Chicago, remote work, or other locations when the opportunity makes relocation practical.',
  success:
    'For Mark, long-term success means stability, confidence, meaningful work, independence, continued ambition, and excitement about what comes next. He wants to be proud of work he built usefully and followed through on, not money as his only motivation.',
  familyGoals:
    'Supporting his family is part of Mark’s public goals alongside building a stable technology career and becoming financially independent. He wants his work to create stability and meaningful progress he can stand behind.',
  photography:
    'Mark uses photography to preserve feelings, places, views, memories, and important moments. He prefers cinematic, personal, dark, low-exposure, story-driven images of cities, architecture, landscapes, museums, and travel experiences.',
  travel:
    'Travel helps Mark see different cultures, lifestyles, opportunities, and perspectives. Cities represent ambition and progress, oceans and islands represent peace, and mountains represent effort that earns the view, all motivating greater independence and freedom.',
  environment:
    'Mark prefers clean, organized, minimal environments with a cinematic mix of classical architecture, statues, modern technology, city lights, rooftops, and controlled darkness. He likes a modern technical-professional atmosphere and dislikes corny or overly decorative presentation.',
  becoming:
    'Mark is working to become more consistent, controlled, and capable over time. He wants confidence rooted in preparation and demonstrated work, with strength directed by discipline rather than temporary intensity.',
  collaboratorsAbacus:
    'The core student team for Abacus included Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman. Sam Mazzone supported the team separately as an advisor, software developer, and moral supporter.',
  collaboratorsMaat:
    'The core student team for TA-Bot / MAAT included Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman. Sam Mazzone supported the team separately as an advisor, software developer, and moral supporter.',
  collaboratorsSam:
    'Sam Mazzone supported the Abacus and TA-Bot / MAAT teams as an advisor, software developer, and moral supporter. He is not described as one of the core student teammates; the core student team was Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman.',
  collaboratorsFinch:
    'The Finch Web Controller team included Mark Yoingco, Julianne Browne, Luis Serrano, and Xavier Barth.',
  collaboratorsDataMining:
    'The Data Mining Game Predictor team included Mark Yoingco and Allan Akkathara.',
  collaboratorsOs:
    'For Operating Systems C Projects, the approved collaborator names are Mark Yoingco and Armaan Yaz. Private or shared course repositories remain unpublished.',
  collaboratorsSleep:
    'For the Sleep Efficiency Analysis data-science project, the approved collaborator names are Mark Yoingco and Hunter Carlson.',
  collaboratorsInventory:
    "Mark’s approved project collaborators, by project:\n\n- Abacus: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- TA-Bot / MAAT: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- Support for Abacus and MAAT: Sam Mazzone (advisor, software developer, moral supporter)\n- Finch: Mark Yoingco, Julianne Browne, Luis Serrano, Xavier Barth\n- Data Mining: Mark Yoingco, Allan Akkathara\n- Operating Systems: Mark Yoingco, Armaan Yaz\n- Sleep Analysis: Mark Yoingco, Hunter Carlson",
  testimonials:
    'Yes. Mark’s portfolio includes public testimonials from people who have worked with, taught, or known him. Zack Kohlwey, Mark’s former supervisor at Marquette University, highlights his dedication, work ethic, and leadership by example. Farzeen Harunani, a Computer Science professor at Marquette, notes his initiative, composure, and dedication. Jorge Torres, a former coworker, emphasizes his thoroughness, ownership, and reliability. Full attributed quotes are in the portfolio Testimonials section.',
  projectsInventory:
    "Mark’s approved public software projects include:\n\n- Portfolio & AI: Personal Portfolio Platform; MarkAI\n- Capstones: Abacus; TA-Bot / MAAT\n- Systems: Operating Systems C Projects\n- Robotics & Software Design: Finch Robot Web Controller\n- Games: Space SHMUP; Apple Picker; Mission Demolition\n- Data: Sleep Efficiency Analysis; Marquette Basketball Predictor\n\nThe portfolio platform and MarkAI are solo personal work. Abacus, MAAT, Finch, and the data projects were team or coursework collaborations.",
  fallback:
    'I can answer questions about Mark’s projects, skills, experience, education, interests, goals, testimonials, and contact options. Try asking a more specific question.',
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

  if (
    includesAny(text, [
      'all existing links',
      'all links',
      'show me mark’s links',
      "show me mark's links",
      'show me marks links',
      'give me all links',
      'give me his links',
      'mark’s links',
      "mark's links",
      'marks links',
      'find mark online',
      'where can i find mark',
      'github and linkedin',
      'linkedin and github',
      'give me his github',
      'give me his linkedin',
      'public links',
      'portfolio links',
    ])
  ) {
    return {
      category: 'links',
      mode: 'general',
      answer: ANSWERS.links,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, ['abacus', 'eagle', 'messaging']) &&
    !includesAny(text, [
      'abacus team',
      'on the abacus',
      'worked on abacus',
      'who was on abacus',
      'who worked on abacus',
      'sam mazzone',
    ])
  ) {
    return {
      category: 'abacus',
      mode: 'technical',
      answer: ANSWERS.abacus,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'list every project',
      'list all mark’s projects',
      "list all mark's projects",
      'list all marks projects',
      'list out every project',
      'list all projects',
      'what projects has mark',
      'what projects did mark',
      'what has mark built',
      'what has mark worked on',
      'what mark has built',
      'what mark worked on',
      'software projects',
      'project portfolio',
      'project list',
      'all projects',
      'every project',
      'summarize mark’s technical work',
      "summarize mark's technical work",
      'summarize marks technical work',
      'technical work',
      'built in college',
      'build in college',
      'personal projects',
      'projects has he completed',
      'projects he completed',
      'projects mark has done',
      'projects mark has',
      'show me his projects',
      'give me his projects',
      'give me his project portfolio',
      'show me his software projects',
    ])
  ) {
    return {
      category: 'projectsInventory',
      mode: 'technical',
      answer: ANSWERS.projectsInventory,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'sam mazzone',
      'what was sam',
      'sam’s role',
      "sam's role",
      'sams role',
    ])
  ) {
    return {
      category: 'collaboratorsSam',
      mode: 'technical',
      answer: ANSWERS.collaboratorsSam,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'abacus team',
      'on the abacus',
      'worked on abacus',
      'who was on abacus',
      'who worked on abacus',
    ])
  ) {
    return {
      category: 'collaboratorsAbacus',
      mode: 'technical',
      answer: ANSWERS.collaboratorsAbacus,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'maat team',
      'ta-bot team',
      'tabot team',
      'worked on ta-bot',
      'worked on maat',
      'helped with maat',
      'helped with ta-bot',
      'who worked on ta-bot',
      'who helped with maat',
      'who worked on maat',
      'who was on ta-bot',
      'who was on maat',
    ])
  ) {
    return {
      category: 'collaboratorsMaat',
      mode: 'technical',
      answer: ANSWERS.collaboratorsMaat,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'finch team',
      'on the finch',
      'on mark’s finch',
      "on mark's finch",
      'worked on finch',
      'who was on finch',
      'who worked on finch',
    ])
  ) {
    return {
      category: 'collaboratorsFinch',
      mode: 'technical',
      answer: ANSWERS.collaboratorsFinch,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'allan akkathara',
      'basketball predictor team',
      'worked with mark on data mining',
      'who worked with mark on data mining',
      'data mining collaborators',
      'data mining team',
    ])
  ) {
    return {
      category: 'collaboratorsDataMining',
      mode: 'technical',
      answer: ANSWERS.collaboratorsDataMining,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'armaan yaz',
      'worked with mark in operating systems',
      'who worked with mark in operating systems',
      'os collaborators',
      'operating systems collaborators',
      'who worked with mark on operating systems',
    ])
  ) {
    return {
      category: 'collaboratorsOs',
      mode: 'technical',
      answer: ANSWERS.collaboratorsOs,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'hunter carlson',
      'worked with mark on the data science',
      'who worked with mark on the data science',
      'sleep analysis collaborators',
      'data science collaborators',
      'who worked with mark on sleep',
    ])
  ) {
    return {
      category: 'collaboratorsSleep',
      mode: 'technical',
      answer: ANSWERS.collaboratorsSleep,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'project collaborators',
      'list mark’s project collaborators',
      "list mark's project collaborators",
      'list marks project collaborators',
      'who has mark worked with',
      'who has mark collaborated',
      'list collaborators',
    ])
  ) {
    return {
      category: 'collaboratorsInventory',
      mode: 'technical',
      answer: ANSWERS.collaboratorsInventory,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'testimonial',
      'testimonials',
      'reviews',
      'recommendations',
      'recommendation',
      'what people say',
      'people say about',
      'others say',
      'people say',
      'show me mark’s testimonials',
      "show me mark's testimonials",
      'show me marks testimonials',
      'does mark have testimonial',
      'have testimonials',
      'recommended mark',
      'who has recommended',
      'who recommended',
      'coworkers say',
      'teammates say',
      'teammates or coworkers',
      'work ethic',
    ])
  ) {
    return {
      category: 'testimonials',
      mode: 'recruiter',
      answer: ANSWERS.testimonials,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'describe mark’s personality',
      "describe mark's personality",
      'describe marks personality',
      'mark’s personality',
      "mark's personality",
      'marks personality',
      'what kind of person is mark',
      'type of person is mark',
      'what type of person is mark trying',
      'person is mark trying to become',
    ])
  ) {
    const answer = includesAny(text, ['trying to become', 'become'])
      ? ANSWERS.becoming
      : ANSWERS.personality
    return {
      category: 'personality',
      mode: 'casual',
      answer,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'what does discipline mean',
      'discipline mean to mark',
      'what does consistency mean',
      'consistency mean to',
      'controlled strength',
      'how does mark handle setbacks',
      'handle setbacks',
    ])
  ) {
    let answer = ANSWERS.discipline
    if (includesAny(text, ['consistency'])) answer = ANSWERS.consistency
    else if (includesAny(text, ['controlled strength'])) answer = ANSWERS.controlledStrength
    else if (includesAny(text, ['setback'])) answer = ANSWERS.setbacks
    return {
      category: 'discipline',
      mode: 'casual',
      answer,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'what does family mean',
      'family mean to his goals',
      'family mean to mark',
      'support his family',
      'supporting family',
    ])
  ) {
    return {
      category: 'familyGoals',
      mode: 'casual',
      answer: ANSWERS.familyGoals,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'what are mark’s goals',
      "what are mark's goals",
      'what are marks goals',
      'why does mark want a technology career',
      'technology career',
      'career goals',
      'what does success mean',
      'success mean to mark',
    ])
  ) {
    const answer = includesAny(text, ['success']) ? ANSWERS.success : ANSWERS.careerGoals
    return {
      category: 'careerGoals',
      mode: 'casual',
      answer,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'why does mark like photography',
      'photography mean',
      'what does travel mean',
      'travel mean to mark',
      'environment does mark want',
      'environment mark want',
      'kind of environment',
    ])
  ) {
    let answer = ANSWERS.photography
    if (includesAny(text, ['travel'])) answer = ANSWERS.travel
    else if (includesAny(text, ['environment'])) answer = ANSWERS.environment
    return {
      category: 'photographyTravel',
      mode: 'casual',
      answer,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'hobbies',
      'interests outside',
      'passionate about',
      'visual style',
      'why does mark like black',
      'why black',
    ])
  ) {
    const answer = includesAny(text, ['passionate'])
      ? ANSWERS.passion
      : includesAny(text, ['visual style', 'like black', 'why black'])
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
      'how can i contact',
      'how do i contact',
      'contact mark',
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
      'gym taught',
      'bodybuilding mean',
      'what does bodybuilding',
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
      'mythology figures',
      'figures connect',
    ])
  ) {
    let answer = ANSWERS.mythology
    if (includesAny(text, ['icarus'])) answer = ANSWERS.mythologyIcarus
    else if (includesAny(text, ['achilles'])) answer = ANSWERS.mythologyAchilles
    else if (includesAny(text, ['heracles', 'hercules'])) answer = ANSWERS.mythologyHeracles
    return {
      category: 'mythology',
      mode: 'casual',
      answer,
      answerStatus: 'answered',
    }
  }

  if (
    includesAny(text, [
      'what does mark value',
      'what are mark’s values',
      "what are mark's values",
      'what are marks values',
      'what motivates',
      'long-term goals',
      'long term goals',
      'what does success',
      'type of person',
      'recruiters to remember',
    ])
  ) {
    let answer = ANSWERS.values
    if (includesAny(text, ['success'])) answer = ANSWERS.success
    else if (includesAny(text, ['type of person', 'recruiters to remember'])) answer = ANSWERS.personality
    return {
      category: 'values',
      mode: 'casual',
      answer,
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

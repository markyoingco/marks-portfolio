import {
  blankLine,
  buildFileCatOutput,
  metaLine,
  sectionLine,
  textLine,
  titleLine,
} from './terminalFileOutput'

function buildProjectFileContent({
  title,
  category,
  summary,
  roleFocus,
  stack,
  notes,
}) {
  const content = [titleLine(title), metaLine(category), blankLine(), sectionLine('SUMMARY'), textLine(summary)]

  if (roleFocus) {
    content.push(blankLine(), sectionLine('ROLE / FOCUS'), textLine(roleFocus))
  }

  if (stack) {
    content.push(blankLine(), sectionLine('STACK'), textLine(stack))
  }

  if (notes) {
    content.push(blankLine(), sectionLine('NOTES'), textLine(notes))
  }

  return content
}

export function buildPortfolioSiteTxtCatOutput() {
  return buildFileCatOutput(
    'portfolio-site.txt',
    buildProjectFileContent({
      title: 'PERSONAL PORTFOLIO WEBSITE',
      category: 'Personal Build',
      summary:
        'Personal portfolio website built to showcase software projects, technical experience, resume work, merchandise design, service work, and personal background.',
      roleFocus:
        'Built with React, Vite, JavaScript, and CSS. Includes webpage mode, terminal portfolio mode, dark/light theme support, responsive navigation, DreamHost deployment, and PHP/MySQL contact backend.',
      stack: 'React · Vite · JavaScript · CSS · PHP · MySQL · DreamHost',
    }),
  )
}

export function buildAbacusTxtCatOutput() {
  return buildFileCatOutput(
    'abacus.txt',
    buildProjectFileContent({
      title: 'ABACUS SENIOR DESIGN CAPSTONE',
      category: 'Senior Design Capstone',
      summary:
        'Senior design web platform contribution focused on Eagle Division features, including chat box interfaces, textbox submission workflows, and frontend updates for student interaction.',
      roleFocus:
        'Worked on full-stack competition platform features supporting submissions, teacher workflows, admin tools, leaderboards, help requests, and automated grading.',
      stack: 'React · TypeScript · Flask · MySQL · Docker · Git',
    }),
  )
}

export function buildMaatTxtCatOutput() {
  return buildFileCatOutput(
    'maat.txt',
    buildProjectFileContent({
      title: 'TA-BOT / MAAT SENIOR DESIGN CAPSTONE',
      category: 'Senior Design Capstone',
      summary:
        'Senior design chatbot and automated assessment tooling contribution supporting course help workflows, student assistance, and teaching-assistant grading workflows through a full-stack web application.',
      roleFocus:
        'Built rubric grading features, score recalculation, observed error tables, plagiarism-detection functionality, backend API integration, database checks, Docker Compose testing, debugging, and UI cleanup.',
      stack: 'React · TypeScript · Flask · MySQL · Docker · Git',
    }),
  )
}

export function buildOperatingSystemsCTxtCatOutput() {
  return buildFileCatOutput(
    'operating-systems-c.txt',
    buildProjectFileContent({
      title: 'OPERATING SYSTEMS C PROJECTS',
      category: 'Systems Programming',
      summary:
        'Lower-level programming work focused on C, UNIX, Linux, memory, files, process control, and operating system concepts.',
      roleFocus:
        'Public portfolio documentation for Operating Systems coursework in C, covering UNIX/Linux development, process control, memory, file systems, and system-level debugging. Original course repositories may require access.',
      stack: 'C · UNIX · Linux · WSL · Git',
    }),
  )
}

export function buildFinchControllerTxtCatOutput() {
  return buildFileCatOutput(
    'finch-controller.txt',
    buildProjectFileContent({
      title: 'FINCH ROBOT WEB CONTROLLER',
      category: 'Software Design and Analysis',
      summary:
        'Team robotics project for controlling BirdBrain Finch 2.0 robots through browser pages, room codes, multiplayer lobbies, and real-time controller screens.',
      roleFocus:
        'Contributed heavily to frontend controller screens, UI planning, setup documentation, and Flask/Socket.IO based interaction flow.',
      stack:
        'Python · Flask · JavaScript · HTML · CSS · Socket.IO · BirdBrain Finch',
    }).concat([
      blankLine(),
      sectionLine('LINKS'),
      textLine('Portfolio section: open finch-controller.webpage'),
      textLine('GitHub: open finch-controller.github'),
    ]),
  )
}

export function buildSpaceShmupTxtCatOutput() {
  return buildFileCatOutput(
    'space-shmup.txt',
    buildProjectFileContent({
      title: 'SPACE SHMUP',
      category: 'Programming Computer Games',
      summary:
        'Unity 2D arcade shooter inspired by classic space shooters, built with player movement, projectile firing, enemy behavior, collision handling, scoring, and game-state logic.',
      stack:
        'Unity · C# · 2D Physics · Game Objects · Prefabs · Collision Detection',
    }),
  )
}

export function buildMissionDemolitionTxtCatOutput() {
  return buildFileCatOutput(
    'mission-demolition.txt',
    buildProjectFileContent({
      title: 'MISSION DEMOLITION',
      category: 'Programming Computer Games',
      summary:
        'Unity physics-based projectile game focused on aiming, launching, collisions, structural targets, and scene-based gameplay logic.',
      stack: 'Unity · C# · Physics · Colliders · Rigidbody · Scene Management',
    }),
  )
}

export function buildApplePickerTxtCatOutput() {
  return buildFileCatOutput(
    'apple-picker.txt',
    buildProjectFileContent({
      title: 'APPLE PICKER',
      category: 'Programming Computer Games',
      summary:
        'Unity arcade-style game built with falling objects, basket controls, score tracking, high-score persistence, lives, collision detection, and scene restart logic.',
      stack: 'Unity · C# · Game Objects · Prefabs · UI · Collision Detection',
    }),
  )
}

export function buildBasketballPredictorTxtCatOutput() {
  return buildFileCatOutput(
    'basketball-predictor.txt',
    buildProjectFileContent({
      title: 'MARQUETTE BASKETBALL PREDICTOR 2023-24',
      category: 'Data Science and Machine Learning',
      summary:
        'Machine learning project using Marquette basketball game data, Random Forest feature importance, and Logistic Regression to predict wins and losses.',
      stack:
        'Python · Pandas · Scikit-learn · Matplotlib · Machine Learning · Logistic Regression · Random Forest',
    }),
  )
}

export function buildSleepAnalysisTxtCatOutput() {
  return buildFileCatOutput(
    'sleep-analysis.txt',
    buildProjectFileContent({
      title: 'SLEEP EFFICIENCY ANALYSIS',
      category: 'Data Analysis / Machine Learning',
      summary:
        'Analyzed Kaggle sleep efficiency data with cleaning, visualization, VIF checks, and linear regression to explore factors related to sleep quality.',
      stack:
        'Python · Pandas · Seaborn · Matplotlib · Scikit-learn · Statsmodels · Linear Regression · Data Visualization',
    }),
  )
}

export function buildSigmaChiMerchTxtCatOutput() {
  return buildFileCatOutput(
    'sigma-chi-merch.txt',
    buildProjectFileContent({
      title: 'SIGMA CHI MERCHANDISE',
      category: 'Creative Leadership',
      summary:
        'Merchandise design proof, including hoodies, t-shirts, and polos created as Merchandise Chair.',
      roleFocus:
        'Creative leadership work connected to merchandise, branding, organizations, and campus involvement.',
    }),
  )
}

export function buildFeedMyStarvingChildrenTxtCatOutput() {
  return buildFileCatOutput(
    'feed-my-starving-children.txt',
    buildProjectFileContent({
      title: 'FEED MY STARVING CHILDREN',
      category: 'Service',
      summary:
        'Volunteer experience supporting food packing and service work focused on helping communities through organized group effort.',
    }).concat([
      blankLine(),
      sectionLine('LINKS'),
      textLine('Portfolio section: open service.webpage'),
      textLine('FMSC page: open fmsc.link'),
    ]),
  )
}

export const PORTFOLIO_TXT_CAT_BUILDERS = {
  'portfolio-site.txt': buildPortfolioSiteTxtCatOutput,
  'abacus.txt': buildAbacusTxtCatOutput,
  'maat.txt': buildMaatTxtCatOutput,
  'operating-systems-c.txt': buildOperatingSystemsCTxtCatOutput,
  'finch-controller.txt': buildFinchControllerTxtCatOutput,
  'space-shmup.txt': buildSpaceShmupTxtCatOutput,
  'mission-demolition.txt': buildMissionDemolitionTxtCatOutput,
  'apple-picker.txt': buildApplePickerTxtCatOutput,
  'basketball-predictor.txt': buildBasketballPredictorTxtCatOutput,
  'sleep-analysis.txt': buildSleepAnalysisTxtCatOutput,
  'sigma-chi-merch.txt': buildSigmaChiMerchTxtCatOutput,
  'feed-my-starving-children.txt': buildFeedMyStarvingChildrenTxtCatOutput,
}

export function buildPortfolioTxtCatOutput(filename) {
  const builder = PORTFOLIO_TXT_CAT_BUILDERS[filename]
  return builder ? builder() : null
}

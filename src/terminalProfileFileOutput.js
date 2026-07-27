import {
  blankLine,
  buildFileCatOutput,
  bulletLine,
  sectionLine,
  textLine,
} from './terminalFileOutput'

export const VSCO_GALLERY_URL = 'https://vsco.co/markyoingco/gallery'

export function buildAboutTxtCatOutput() {
  return buildFileCatOutput('about.txt', [
    sectionLine('ABOUT'),
    blankLine(),
    textLine(
      "I'm Mark Yoingco, a recent Computer Science graduate from Marquette University building toward a career in software development and technology.",
    ),
    blankLine(),
    textLine(
      'My background includes hands-on work across this portfolio platform, Abacus, TA-Bot / MAAT, and the Finch Web Controller. Those projects taught me more than code: communication, teamwork, consistency, ownership, and the importance of asking the right questions before building.',
    ),
    blankLine(),
    textLine(
      "I'm drawn to software that is useful, organized, creative, and grounded in real problems - systems that solve problems, connect people, or make something easier to understand or use.",
    ),
    blankLine(),
    textLine(
      'My path has taught me to keep building, learn what I need, and improve the work until it can speak for itself.',
    ),
    blankLine(),
    textLine(
      'This portfolio brings that work together and shows the range I continue to build.',
    ),
  ])
}

export function buildMindsetTxtCatOutput() {
  return buildFileCatOutput('mindset.txt', [
    sectionLine('MINDSET'),
    blankLine(),
    textLine('Consistency over intensity.'),
    textLine('Control the response.'),
    textLine('Strength without direction is only potential.'),
    blankLine(),
    textLine(
      "I'm working to become the best version of myself, not only in technology, but in how I move, train, think, and handle pressure.",
    ),
    blankLine(),
    textLine(
      'The goal is not to look busy. The goal is to build something real. Progress is made through repetition, quiet decisions, and the days when motivation is not enough.',
    ),
    blankLine(),
    textLine(
      'Setbacks taught me perspective. Training taught me discipline. Software taught me patience. Team projects taught me communication, ownership, and when to lead or step back.',
    ),
    blankLine(),
    textLine(
      'The standard is simple: keep moving, learn from the setback, and respond with more control than before.',
    ),
    blankLine(),
    textLine(
      'Achilles represents intensity and ambition to me. The lesson is to keep that strength guided by discipline instead of impulse.',
    ),
  ])
}

export function buildGoalsTxtCatOutput() {
  return buildFileCatOutput('goals.txt', [
    sectionLine('GOALS'),
    blankLine(),
    sectionLine('CURRENT MISSION'),
    textLine(
      'Earn a full-time technology role where I can contribute, keep learning, and build toward greater responsibility.',
    ),
    blankLine(),
    sectionLine('SHORT TERM'),
    bulletLine('Keep applying with a stronger resume, LinkedIn, GitHub, and portfolio'),
    bulletLine('Continue developing MarkAI and improving the portfolio platform'),
    bulletLine(
      'Build projects that show ownership, design, systems thinking, and real problem solving',
    ),
    bulletLine('Strengthen technical confidence through repetition and practice'),
    blankLine(),
    sectionLine('LONG TERM'),
    bulletLine('Build a career with stability, freedom, and momentum'),
    bulletLine('Move closer to the city and life I actually want'),
    bulletLine(
      'Keep becoming sharper physically, mentally, financially, and professionally',
    ),
    bulletLine('Create the independence to make decisions from confidence instead of pressure'),
    bulletLine('Keep building my career, body, environment, and future with intention'),
    blankLine(),
    textLine(
      'The dream is not only a job. It is direction, freedom, and a life that feels earned.',
    ),
  ])
}

export function buildBeyondWorkTxtCatOutput() {
  return buildFileCatOutput('beyond-work.txt', [
    sectionLine('BEYOND WORK'),
    blankLine(),
    textLine('Outside of technology, fitness is one of the strongest parts of my life.'),
    blankLine(),
    textLine(
      'I began training because I wanted change. Over time, it taught me discipline, patience, consistency, and how much progress can come from work repeated in silence.',
    ),
    blankLine(),
    textLine(
      'Bodybuilding feels like both training and art. Structure, symmetry, control, and attention to detail matter, which is also why I am drawn to clean design, organized spaces, strong visuals, and work that feels intentional.',
    ),
    blankLine(),
    textLine(
      'I have always found Greek mythology interesting, especially Achilles. His story carries strength, intensity, loyalty, and consequence. What stays with me is the idea that strength means more when it has direction.',
    ),
    blankLine(),
    textLine(
      'Travel, music, reading, and photography give me another way to see and remember life. I am drawn to cities, water, mountains, museums, streets, and small moments that make life feel cinematic. I like capturing scenes that hold a memory or feeling that words cannot always explain.',
    ),
    blankLine(),
    textLine(
      'That perspective matters to me. I want my work, my body, my environment, and my future to feel like they were built with intention.',
    ),
    blankLine(),
    textLine('For more of the visual side, type open vsco.link.'),
  ])
}

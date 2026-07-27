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
      "I'm Mark Yoingco, a Computer Science graduate from Marquette University building toward a career in software development and technology.",
    ),
    blankLine(),
    textLine(
      'My experience includes full-stack development, systems programming, developer tools, data projects, robotics, and two senior design capstones. My strongest work includes this portfolio platform, Abacus, TA-Bot / MAAT, and the Finch Web Controller.',
    ),
    blankLine(),
    textLine(
      'I enjoy turning ideas into useful, organized products. I learn by building, ask the right questions, and keep improving the work until the result speaks for itself.',
    ),
  ])
}

export function buildWorkStyleTxtCatOutput() {
  return buildFileCatOutput('work-style.txt', [
    sectionLine('WORK STYLE'),
    blankLine(),
    textLine(
      'I value consistency over noise, ownership over excuses, and progress over talking.',
    ),
    blankLine(),
    textLine(
      'I work best when expectations are clear, details are documented, and the team communicates honestly. I know when to lead, when to listen, and when to step back so the work can move forward.',
    ),
    blankLine(),
    textLine(
      'I care about clean systems, useful software, and finishing what I start.',
    ),
  ])
}

export function buildCareerGoalsTxtCatOutput() {
  return buildFileCatOutput('career-goals.txt', [
    sectionLine('CAREER GOALS'),
    blankLine(),
    sectionLine('CURRENT FOCUS'),
    textLine(
      'Earn a full-time technology role where I can contribute, keep learning, and build strong professional experience.',
    ),
    blankLine(),
    sectionLine('AREAS OF INTEREST'),
    bulletLine('Software development'),
    bulletLine('Full-stack web development'),
    bulletLine('Developer tools'),
    bulletLine('Data-oriented systems'),
    bulletLine('Technical support and systems roles'),
    blankLine(),
    sectionLine('LONG-TERM DIRECTION'),
    textLine(
      'Take on greater technical ownership, solve real problems, and build a stable career with room to grow.',
    ),
  ])
}

export function buildInterestsTxtCatOutput() {
  return buildFileCatOutput('interests.txt', [
    sectionLine('INTERESTS'),
    blankLine(),
    textLine(
      'Outside of technology, fitness is one of my strongest interests. It has taught me consistency, patience, attention to detail, and the value of progress earned over time.',
    ),
    blankLine(),
    textLine(
      'I also enjoy photography, travel, music, reading, and hiking. Photography gives me a way to document places, people, and moments through clean composition and a darker cinematic style.',
    ),
    blankLine(),
    textLine(
      "I'm interested in Greek mythology and sculpture, especially stories about ambition, discipline, strength, and consequence. Use open vsco.link to view more of my photography.",
    ),
  ])
}

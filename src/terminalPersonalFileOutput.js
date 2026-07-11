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
      'I’m Mark Yoingco, a recent Computer Science graduate from Marquette University building toward entry-level software development, full-stack, developer tools, data-oriented systems, and technical support roles.',
    ),
    blankLine(),
    textLine(
      'I’m drawn to projects that feel useful, organized, and real — systems that solve problems, connect people, or make something easier to understand.',
    ),
    blankLine(),
    textLine(
      'My path has not been perfect, but it has taught me to value ownership, consistency, and growth. I respect progress that is earned over time and work that keeps moving even when the next step is not fully clear yet.',
    ),
    blankLine(),
    textLine(
      'This portfolio is part of that process: proof of work, proof of growth, and a place to show the range I am still building.',
    ),
  ])
}

export function buildMindsetTxtCatOutput() {
  return buildFileCatOutput('mindset.txt', [
    sectionLine('MINDSET'),
    blankLine(),
    textLine('Purpose over noise.'),
    textLine('Discipline over motivation.'),
    textLine('Growth over comfort.'),
    blankLine(),
    textLine(
      'I’m trying to become the best version of myself, not just in tech, but in how I move, train, think, and handle pressure.',
    ),
    blankLine(),
    textLine(
      'The goal is not to look busy. The goal is to build something real — skills, proof, money, freedom, family support, and a life with direction.',
    ),
    blankLine(),
    textLine(
      'Setbacks taught me perspective. The gym taught me discipline. Projects taught me patience. Life taught me that nobody is coming to save the vision for you.',
    ),
    blankLine(),
    textLine('So I keep building.'),
  ])
}

export function buildGoalsTxtCatOutput() {
  return buildFileCatOutput('goals.txt', [
    sectionLine('GOALS'),
    blankLine(),
    sectionLine('CURRENT MISSION'),
    textLine(
      'Earn a full-time role that moves me closer to software development, full-stack work, developer tools, data-oriented systems, or technical support.',
    ),
    blankLine(),
    sectionLine('SHORT TERM'),
    bulletLine('Keep applying with a stronger resume, LinkedIn, GitHub, and portfolio'),
    bulletLine('Build projects that show real ownership'),
    bulletLine('Improve technical confidence through repetition'),
    bulletLine('Find work that helps me support myself and my family'),
    blankLine(),
    sectionLine('LONG TERM'),
    bulletLine('Build a career with freedom, stability, and momentum'),
    bulletLine('Move closer to the city/life I actually want'),
    bulletLine('Keep becoming sharper physically, mentally, financially, and professionally'),
    bulletLine('Create a life that feels earned, stable, and genuinely happy to live in'),
    blankLine(),
    textLine('The dream is not just a job. The dream is direction.'),
  ])
}

export function buildBeyondWorkTxtCatOutput() {
  return buildFileCatOutput('beyond-work.txt', [
    sectionLine('BEYOND WORK'),
    blankLine(),
    textLine('Outside of technology, fitness has always been one of my biggest anchors.'),
    blankLine(),
    textLine(
      'The gym gave me structure when life felt scattered. Training taught me discipline, patience, and how to chase progress without needing applause every day.',
    ),
    blankLine(),
    textLine(
      'I’m also inspired by travel, music, reading, photography, and places that make life feel cinematic. I like capturing moments that feel real — cities, views, trips, people, and small scenes that hold a memory.',
    ),
    blankLine(),
    textLine(
      'That perspective matters to me. I want my work, my body, my environment, and my future to all feel like they were built with intention.',
    ),
    blankLine(),
    textLine('For more of the visual side, type open vsco.link.'),
  ])
}

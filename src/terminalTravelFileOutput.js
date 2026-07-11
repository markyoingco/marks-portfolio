import {
  blankLine,
  buildFileCatOutput,
  sectionLine,
  textLine,
} from './terminalFileOutput'
import { TRAVEL_PLACES } from './travelPlacesData'

export const TRAVEL_WEBPAGE_FILE = 'travel.webpage'
export const TRAVEL_PLACES_FILE = 'places.txt'

export function buildCaughtInMotionTxtCatOutput() {
  return buildFileCatOutput('caught-in-motion.txt', [
    sectionLine('CAUGHT IN MOTION'),
    blankLine(),
    textLine(
      'Every picture has a story behind it. Some come from places I have visited, some come from moments I wanted to remember, and some are scenes that felt too real not to keep.',
    ),
    blankLine(),
    textLine(
      'Outside of work, photography is how I capture travel, lifestyle, growth, and the parts of life that feel cinematic and personal.',
    ),
    blankLine(),
    textLine(
      'I like taking photos because it gives me a way to hold onto views, nights, cities, people, and small moments that feel bigger than they looked at the time.',
    ),
    blankLine(),
    textLine('For the full visual section, type open travel.webpage.'),
    textLine('For more photos, type open vsco.link.'),
  ])
}

export function buildPlacesTxtCatOutput() {
  const content = [sectionLine('PLACES'), blankLine(), textLine('const places = [')]

  TRAVEL_PLACES.forEach((place, index) => {
    const suffix = index < TRAVEL_PLACES.length - 1 ? ',' : ''
    content.push(textLine(`  "${place}"${suffix}`))
  })

  content.push(textLine(']'))

  return buildFileCatOutput(TRAVEL_PLACES_FILE, content)
}

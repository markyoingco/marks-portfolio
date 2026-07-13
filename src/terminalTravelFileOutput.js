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
      'Every picture has a story behind it. Some come from places I have visited, some from moments I wanted to remember, and some from scenes that felt too real not to keep.',
    ),
    blankLine(),
    textLine(
      'Outside of work, photography is how I capture travel, lifestyle, growth, and the parts of life that feel cinematic and personal.',
    ),
    blankLine(),
    textLine(
      'I like using photography to hold onto the feeling of a place - city lights, quiet streets, water, mountains, museums, people, and small details that might otherwise disappear.',
    ),
    blankLine(),
    textLine(
      'The image matters, but so does the memory behind it. A picture can hold a feeling, a lesson, or a place that still means something long after the moment is gone.',
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

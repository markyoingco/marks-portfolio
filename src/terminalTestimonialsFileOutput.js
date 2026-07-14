import {
  blankLine,
  buildFileCatOutput,
  textLine,
} from './terminalFileOutput'
import {
  getTestimonialDisplayTitle,
  TESTIMONIAL_LINKEDIN_FILE,
  TESTIMONIAL_TXT_FILE,
  TESTIMONIALS_WEBPAGE_FILE,
} from './testimonialsData'

export function buildTestimonialTxtCatOutput(item) {
  if (!item) {
    return buildFileCatOutput(TESTIMONIAL_TXT_FILE, [textLine('Testimonial not found.')])
  }

  const content = [
    textLine(String(item.name).toUpperCase()),
    blankLine(),
    textLine(getTestimonialDisplayTitle(item).toUpperCase()),
  ]

  if (item.relationship) {
    content.push(blankLine(), textLine('Relationship:'), textLine(item.relationship))
  }

  content.push(blankLine())

  const quoteParagraphs = String(item.quote)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  quoteParagraphs.forEach((paragraph, index) => {
    if (index > 0) {
      content.push(blankLine())
    }
    content.push(textLine(paragraph))
  })

  content.push(blankLine())
  content.push(textLine(`LinkedIn: open ${TESTIMONIAL_LINKEDIN_FILE}`))
  content.push(textLine(`Webpage: open ${TESTIMONIALS_WEBPAGE_FILE}`))

  return buildFileCatOutput(TESTIMONIAL_TXT_FILE, content)
}

export const TESTIMONIALS_TITLE = 'Testimonials'

export const TESTIMONIALS_COMING_SOON_LEAD = 'More perspectives are on the way.'

export const TESTIMONIALS_COMING_SOON_DETAIL =
  'Testimonials from people I have worked with, learned from, and built alongside will be added here soon.'

export const TESTIMONIALS = [
  {
    published: false,
    imageDark: '/images/testimonials/testimonial-1.jpg',
    imageLight: '/images/testimonials/testimonial-1color.jpg',
    quote:
      "Mark is one of my best friends who I've known since our days of middle school basketball. He boasts a plethora of outstanding qualities that have stood out since our first practice together. He is one of the most dedicated and reliable individuals I know, applying no less than his absolute best to any team he is apart of. His perseverance and professionalism through school, life challenges, and the workplace proceeds his reputation as a respectful, hard working, and disciplined person with extensive work and projects to show for it. He's truly a valuable asset to have as a part of any team, and an even better friend.",
    name: 'Maxwell Zeisler',
    role: 'Accounting Student and Audit Intern @ Advisent',
    linkedin: 'https://www.linkedin.com/in/maxwell-zeisler123',
  },
]

export function getPublishedTestimonials() {
  return TESTIMONIALS.filter((item) => item.published === true)
}

export const TESTIMONIALS_WEBPAGE_FILE = 'testimonials.webpage'
export const TESTIMONIAL_TXT_FILE = 'testimonial.txt'
export const TESTIMONIAL_LINKEDIN_FILE = 'linkedin.link'

export function getTestimonialPersonSlug(name) {
  if (!name || typeof name !== 'string') {
    return ''
  }

  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getTestimonialPersonSlugs() {
  return TESTIMONIALS.filter((item) => item?.name).map((item) =>
    getTestimonialPersonSlug(item.name),
  )
}

export function getTestimonialByPersonSlug(slug) {
  return TESTIMONIALS.find((item) => getTestimonialPersonSlug(item.name) === slug) ?? null
}

export function getTestimonialsRootLsLines() {
  return [...getTestimonialPersonSlugs(), TESTIMONIALS_WEBPAGE_FILE]
}

export function getTestimonialPersonFolderFiles(item) {
  if (!item) {
    return []
  }

  const files = [TESTIMONIAL_TXT_FILE]

  if (item.linkedin) {
    files.push(TESTIMONIAL_LINKEDIN_FILE)
  }

  return files
}

export function getTestimonialsRootUnknownCommandHint() {
  const cdExamples = getTestimonialPersonSlugs()
    .map((slug) => `cd ${slug}`)
    .join(', ')

  return `Command not found in testimonials. Try: ls, ${cdExamples}, open ${TESTIMONIALS_WEBPAGE_FILE}, cd .., or clear.`
}

export function getTestimonialPersonUnknownCommandHint(personSlug) {
  const item = getTestimonialByPersonSlug(personSlug)
  const openExamples = [`open ${TESTIMONIALS_WEBPAGE_FILE}`]

  if (item?.linkedin) {
    openExamples.unshift(`open ${TESTIMONIAL_LINKEDIN_FILE}`)
  }

  return `Command not found. Try: ls, cat ${TESTIMONIAL_TXT_FILE}, ${openExamples.join(', ')}, cd .., or clear.`
}

export function getTestimonialsRootHelpCommands() {
  const commands = [{ command: 'ls' }]

  for (const slug of getTestimonialPersonSlugs()) {
    commands.push({ command: `cd ${slug}`, description: 'open testimonial folder' })
  }

  commands.push({
    command: `open ${TESTIMONIALS_WEBPAGE_FILE}`,
    description: 'open testimonials page',
  })
  commands.push({ command: 'cd ..' })
  commands.push({ command: 'clear' })

  return commands
}

export function getTestimonialPersonHelpCommands(personSlug) {
  const item = getTestimonialByPersonSlug(personSlug)
  const commands = [
    { command: 'ls' },
    { command: `cat ${TESTIMONIAL_TXT_FILE}`, description: 'read testimonial' },
  ]

  if (item?.linkedin) {
    commands.push({
      command: `open ${TESTIMONIAL_LINKEDIN_FILE}`,
      description: 'open LinkedIn profile',
    })
  }

  commands.push({
    command: `open ${TESTIMONIALS_WEBPAGE_FILE}`,
    description: 'open testimonials page',
  })
  commands.push({ command: 'cd ..' })
  commands.push({ command: 'clear' })

  return commands
}

export function getTestimonialPersonEnterLines(slug) {
  return [`Opening ${slug}...`, 'Type ls to view testimonial files.']
}

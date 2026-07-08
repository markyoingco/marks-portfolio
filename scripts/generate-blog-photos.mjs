import fs from 'fs'
import path from 'path'

const dir = path.join('public', 'images', 'blog-optimized')
const files = fs.readdirSync(dir)

function parseFile(name) {
  const match = name.match(/^(\d+(?:\.\d+)?)\s+(.+)\.([A-Za-z0-9]+)$/)
  if (!match) return null

  const extension = match[3].toLowerCase()
  if (!['jpg', 'jpeg', 'png'].includes(extension)) return null

  return {
    order: Number.parseFloat(match[1]),
    location: match[2],
    src: `/images/blog-optimized/${name}`,
    filename: name,
  }
}

const photos = files
  .map(parseFile)
  .filter(Boolean)
  .sort((a, b) => b.order - a.order)

const missing = []
for (let i = 1; i <= 54; i += 1) {
  if (Number.isInteger(i) && !photos.some((photo) => photo.order === i)) {
    missing.push(i)
  }
}

const lines = photos.map(
  (photo) =>
    `  { order: ${photo.order}, location: ${JSON.stringify(photo.location)}, src: ${JSON.stringify(photo.src)} },`,
)

const output = `const BLOG_PHOTOS = [\n${lines.join('\n')}\n]\n`
fs.writeFileSync('src/blogPhotos.generated.js', output)

console.log(`Generated ${photos.length} blog photos`)
if (missing.length) {
  console.log(`Missing integer numbers: ${missing.join(', ')}`)
}

import fs from 'fs'

const app = fs.readFileSync('src/App.jsx', 'utf8')
const block = app.match(/const BLOG_PHOTOS = \[([\s\S]*?)\]/)?.[0] ?? ''
const srcMatches = [...block.matchAll(/src: "([^"]+)"/g)]

let ok = 0
const bad = []

for (const match of srcMatches) {
  const src = match[1]
  const filePath = pathFromSrc(src)
  if (fs.existsSync(filePath)) ok += 1
  else bad.push({ src, filePath })
}

console.log(`Verified ${ok}/${srcMatches.length} blog image paths`)
bad.forEach((item) => console.log(`MISSING: ${item.filePath}`))

function pathFromSrc(src) {
  return `public${src}`
}

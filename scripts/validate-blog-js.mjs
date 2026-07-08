import fs from 'fs'

const app = fs.readFileSync('src/App.jsx', 'utf8')

if (!app.includes('const BLOG_PHOTOS_BATCH = 6')) {
  console.error('ERROR: BLOG_PHOTOS_BATCH is missing')
  process.exit(1)
}

const block = app.match(/const BLOG_PHOTOS = \[([\s\S]*?)\]/)?.[0] ?? ''
const photos = [...block.matchAll(/\{ order: ([^,]+), location: "([^"]*)", src: "([^"]+)" \}/g)].map(
  (match) => ({
    order: match[1],
    location: match[2],
    src: match[3],
  }),
)

const orderSet = new Set()
const srcSet = new Set()
const dupOrders = []
const dupSrcs = []
const missingFiles = []

for (const photo of photos) {
  if (orderSet.has(photo.order)) dupOrders.push(photo.order)
  orderSet.add(photo.order)

  if (srcSet.has(photo.src)) dupSrcs.push(photo.src)
  srcSet.add(photo.src)

  const filePath = `public${photo.src}`
  if (!fs.existsSync(filePath)) missingFiles.push(photo.src)
}

console.log(`Photos in array: ${photos.length}`)
console.log(`Duplicate orders: ${dupOrders.length ? dupOrders.join(', ') : 'none'}`)
console.log(`Duplicate src keys: ${dupSrcs.length ? dupSrcs.join(', ') : 'none'}`)
console.log(`Missing files: ${missingFiles.length ? missingFiles.join(', ') : 'none'}`)

if (dupOrders.length || dupSrcs.length || missingFiles.length) process.exit(1)

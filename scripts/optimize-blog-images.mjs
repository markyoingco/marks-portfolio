import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const sourceDir = path.join('public', 'images', 'blog')
const outputDir = path.join('public', 'images', 'blog-optimized')

fs.mkdirSync(outputDir, { recursive: true })

const files = fs.readdirSync(sourceDir).filter((file) => {
  const extension = path.extname(file).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
})

let optimizedCount = 0
let totalSourceBytes = 0
let totalOutputBytes = 0

for (const file of files) {
  const sourcePath = path.join(sourceDir, file)
  const baseName = path.basename(file, path.extname(file))
  const outputName = `${baseName}.jpg`
  const outputPath = path.join(outputDir, outputName)

  const sourceStats = fs.statSync(sourcePath)
  totalSourceBytes += sourceStats.size

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: 1600,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 80,
      mozjpeg: true,
    })
    .toFile(outputPath)

  totalOutputBytes += fs.statSync(outputPath).size
  optimizedCount += 1
  console.log(`Optimized: ${file} -> ${outputName}`)
}

console.log(`\nOptimized ${optimizedCount} images`)
console.log(
  `Source total: ${(totalSourceBytes / (1024 * 1024)).toFixed(1)} MB`,
)
console.log(
  `Output total: ${(totalOutputBytes / (1024 * 1024)).toFixed(1)} MB`,
)

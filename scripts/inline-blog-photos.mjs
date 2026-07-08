import fs from 'fs'

const appPath = 'src/App.jsx'
const photosPath = 'src/blogPhotos.generated.js'
const app = fs.readFileSync(appPath, 'utf8')
const photosBlock = fs.readFileSync(photosPath, 'utf8').trim()

const blogPhotoFn = `const BlogPhoto = memo(function BlogPhoto({ src, location }) {
  const [hasImage, setHasImage] = useState(true)

  const handleImageError = useCallback(() => {
    console.warn(\`Blog image failed to load: \${src}\`)
    setHasImage(false)
  }, [src])

  return (
    <article className="blog-photo">
      <div className="blog-photo__media">
        {hasImage ? (
          <img
            src={src}
            alt={location}
            width={800}
            height={1000}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={handleImageError}
          />
        ) : (
          <div className="blog-photo__fallback">
            <span>Photo Coming Soon</span>
          </div>
        )}
      </div>
      <p className="blog-photo__location">{location}</p>
    </article>
  )
})

const BLOG_PHOTOS_BATCH = 6`

const start = app.indexOf('const BlogPhoto = memo')
const end = app.indexOf('const TESTIMONIALS')
if (start === -1 || end === -1) {
  throw new Error('Could not locate BlogPhoto block in App.jsx')
}

const next = `${app.slice(0, start)}${blogPhotoFn}\n\n${photosBlock}\n\n${app.slice(end)}`
fs.writeFileSync(appPath, next)
fs.unlinkSync(photosPath)
console.log('Updated App.jsx with blog gallery data')

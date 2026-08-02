/**
 * Direct unit checks for SPA hash destinations (no browser, no network).
 * Mirrors src/appNavigation.js parseNavFromHash / buildPathFromSnapshot.
 */
import assert from 'node:assert/strict'

const WEBPAGE_SCREENS = [
  'home',
  'about',
  'portfolio',
  'testimonials',
  'travel',
  'contact',
]

function parseNavFromHash(hashRaw) {
  const hash = String(hashRaw || '')
    .replace(/^#/, '')
    .trim()
    .toLowerCase()

  if (!hash) {
    return { route: 'terminal', screen: 'home' }
  }

  if (hash === 'webpage' || hash === 'webpage/home') {
    return { route: 'webpage', screen: 'home' }
  }

  if (hash.startsWith('webpage/')) {
    const screen = hash.slice('webpage/'.length).split(/[/?#]/)[0] || 'home'
    if (WEBPAGE_SCREENS.includes(screen)) {
      return { route: 'webpage', screen }
    }
    return { route: 'webpage', screen: 'home' }
  }

  if (WEBPAGE_SCREENS.includes(hash)) {
    return { route: 'webpage', screen: hash }
  }

  return { route: 'terminal', screen: 'home' }
}

function buildPathFromSnapshot(snapshot) {
  if (snapshot.route === 'webpage') {
    const screen = snapshot.webpage?.screen || 'home'
    const fragment = screen === 'home' ? 'webpage' : screen
    return `/#${fragment}`
  }
  return '/'
}

const cases = [
  ['', { route: 'terminal', screen: 'home' }],
  ['#webpage', { route: 'webpage', screen: 'home' }],
  ['#webpage/home', { route: 'webpage', screen: 'home' }],
  ['#portfolio', { route: 'webpage', screen: 'portfolio' }],
  ['#testimonials', { route: 'webpage', screen: 'testimonials' }],
  ['#travel', { route: 'webpage', screen: 'travel' }],
  ['#contact', { route: 'webpage', screen: 'contact' }],
  ['#about', { route: 'webpage', screen: 'about' }],
  ['#webpage/portfolio', { route: 'webpage', screen: 'portfolio' }],
  ['#PORTFOLIO', { route: 'webpage', screen: 'portfolio' }],
  ['#markai', { route: 'terminal', screen: 'home' }],
  ['#skills', { route: 'terminal', screen: 'home' }],
]

for (const [hash, expected] of cases) {
  const actual = parseNavFromHash(hash)
  assert.deepEqual(actual, expected, `parseNavFromHash(${hash})`)
}

assert.equal(
  buildPathFromSnapshot({ route: 'webpage', webpage: { screen: 'home' } }),
  '/#webpage',
)
assert.equal(
  buildPathFromSnapshot({ route: 'webpage', webpage: { screen: 'travel' } }),
  '/#travel',
)
assert.equal(buildPathFromSnapshot({ route: 'terminal', webpage: { screen: 'home' } }), '/')

console.log('All app navigation deep-link tests passed.')
console.log(`screens=${WEBPAGE_SCREENS.join(',')}`)
console.log('live_network_requests=0')

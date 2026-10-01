import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const photoDir = join(root, 'public', 'assets', 'photos')
mkdirSync(photoDir, { recursive: true })

const cities = [
  ['tokyo', 'Tokyo', 'Japan', 35.6762, 139.6503, 'Pacific rim megacity glow', 'Neon river valleys', 'Late-night rail hum'],
  ['nyc', 'New York', 'United States', 40.7128, -74.006, 'Grid of amber windows', 'Steam and sodium vapor', '24-hour avenue pulse'],
  ['paris', 'Paris', 'France', 48.8566, 2.3522, 'Warm stone under cool moon', 'Cafe awnings after rain', 'River mirror light'],
  ['sydney', 'Sydney', 'Australia', -33.8688, 151.2093, 'Harbor ring of light', 'Southern hemisphere summer nights', 'Coastal salt haze'],
  ['cairo', 'Cairo', 'Egypt', 30.0444, 31.2357, 'Desert air, dense core', 'Minaret silhouettes', 'Dry heat radiating'],
  ['reykjavik', 'Reykjavik', 'Iceland', 64.1466, -21.9426, 'Low sun never truly sets in season', 'Geothermal steam plumes', 'North Atlantic wind'],
  ['singapore', 'Singapore', 'Singapore', 1.3521, 103.8198, 'Tropical humidity sheen', 'Port container glow', 'Equatorial night warmth'],
  ['cape-town', 'Cape Town', 'South Africa', -33.9249, 18.4241, 'Table-shaped shadow', 'Two-ocean breeze', 'Southern cross sky'],
  ['mumbai', 'Mumbai', 'India', 19.076, 72.8777, 'Monsoon-washed asphalt shine', 'Dense coastal strip', 'Arabian Sea edge'],
  ['buenos-aires', 'Buenos Aires', 'Argentina', -34.6037, -58.3816, 'Wide boulevard geometry', 'Tango district lamps', 'Rio de la Plata mist'],
  ['london', 'London', 'United Kingdom', 51.5074, -0.1278, 'Brick and fog diffusion', 'River bend bridges', 'Temperate marine air'],
  ['hong-kong', 'Hong Kong', 'China', 22.3193, 114.1694, 'Vertical light canyon', 'Harbor ferry trails', 'Subtropical humidity'],
  ['dubai', 'Dubai', 'United Arab Emirates', 25.2048, 55.2708, 'Glass tower reflections', 'Desert edge heat', 'Gulf coast calm'],
  ['seoul', 'Seoul', 'South Korea', 37.5665, 126.978, 'Mountain bowl metropolis', 'River-side LED paths', 'Continental season snap'],
  ['mexico-city', 'Mexico City', 'Mexico', 19.4326, -99.1332, 'High-altitude basin glow', 'Volcanic silhouette ring', 'Thin cool air'],
  ['stockholm', 'Stockholm', 'Sweden', 59.3293, 18.0686, 'Archipelago dark water', 'Warm window islands', 'Baltic summer dusk'],
  ['nairobi', 'Nairobi', 'Kenya', -1.2921, 36.8219, 'High plateau cool night', 'Savanna edge city', 'Equatorial altitude'],
  ['anchorage', 'Anchorage', 'United States', 61.2181, -149.9003, 'Long twilight linger', 'Snow-capped backdrop', 'Subarctic quiet'],
  ['wellington', 'Wellington', 'New Zealand', -41.2865, 174.7762, 'Windy harbor crescent', 'Southern capital glow', 'Cook Strait air'],
  ['honolulu', 'Honolulu', 'United States', 21.3069, -157.8583, 'Pacific trade winds', 'Volcanic ridge dark', 'Tropical ocean night'],
  ['oslo', 'Oslo', 'Norway', 59.9139, 10.7522, 'Fjord inlet mirror', 'Forest ridge backdrop', 'High-latitude blue hour'],
  ['lima', 'Lima', 'Peru', -12.0464, -77.0428, 'Coastal garua mist', 'Pacific cliff drop', 'Desert city paradox'],
  ['istanbul', 'Istanbul', 'Turkey', 41.0082, 28.9784, 'Strait bridge necklaces', 'Continental crossroads', 'Sea of Marmara breeze'],
  ['vancouver', 'Vancouver', 'Canada', 49.2827, -123.1207, 'Rain-slick reflections', 'Mountain fjord backdrop', 'Pacific northwest cool'],
  ['marrakech', 'Marrakech', 'Morocco', 31.6295, -7.9811, 'Medina warm lantern tone', 'Atlas foothill air', 'Desert-adjacent night'],
]

function svgForCity(id, city, hue) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Demo night scene for ${city}">
  <defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 45%, 8%)"/>
      <stop offset="100%" stop-color="hsl(${hue}, 35%, 18%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sky-${id})"/>
  <circle cx="620" cy="90" r="40" fill="hsl(${hue}, 30%, 75%)" opacity="0.85"/>
  <rect y="320" width="800" height="180" fill="hsl(${hue}, 25%, 12%)"/>
  ${Array.from({ length: 12 }, (_, i) => {
    const x = 40 + i * 62
    const h = 80 + (i % 5) * 35
    return `<rect x="${x}" y="${320 - h}" width="36" height="${h}" fill="hsl(${hue}, 20%, 22%)" rx="2"/>
    <rect x="${x + 6}" y="${320 - h + 12}" width="8" height="10" fill="hsl(45, 90%, 65%)" opacity="0.9"/>
    <rect x="${x + 20}" y="${320 - h + 28}" width="8" height="10" fill="hsl(45, 90%, 65%)" opacity="0.7"/>`
  }).join('')}
  <text x="24" y="480" fill="hsl(${hue}, 15%, 55%)" font-family="system-ui,sans-serif" font-size="14">Demo fixture — not a photograph</text>
</svg>`
}

const challenges = cities.map(([slug, city, country, lat, lng, c1, c2, c3], i) => {
  const id = `aad-${String(i + 1).padStart(2, '0')}`
  const hue = (i * 37) % 360
  const file = `${id}.svg`
  writeFileSync(join(photoDir, file), svgForCity(slug, city, hue), 'utf8')
  return {
    id,
    imagePath: `/assets/photos/${file}`,
    title: `Night signal ${i + 1}`,
    city,
    country,
    lat,
    lng,
    hintTexts: [
      `Hemisphere: ${lat >= 0 ? 'Northern' : 'Southern'} half of the globe.`,
      `Climate band: ${Math.abs(lat) > 45 ? 'High-latitude' : Math.abs(lat) < 23.5 ? 'Tropical/subtropical' : 'Mid-latitude'} feel.`,
      `Environment: ${c1}.`,
    ],
    clueTexts: [c1, c2, c3],
    source: 'demo-fixture/original-svg',
    license: 'MIT (game repo) — replace with photo license before production',
    attribution: 'Original SVG demo fixture generated for Atlas After Dark',
  }
})

const secretPath = join(root, 'server', 'data', 'challenges.secret.json')
const fixtureDir = join(root, 'src', 'data')
mkdirSync(dirname(secretPath), { recursive: true })
mkdirSync(fixtureDir, { recursive: true })
writeFileSync(secretPath, JSON.stringify(challenges, null, 2), 'utf8')

const publicChallenges = challenges.map(
  ({ id, imagePath, title, hintTexts, clueTexts }) => ({
    id,
    imagePath,
    title,
    hintTexts,
    clueTexts,
  }),
)
writeFileSync(
  join(root, 'src', 'data', 'challenges.fixture.json'),
  JSON.stringify(publicChallenges, null, 2),
  'utf8',
)

const offlineAnswers = Object.fromEntries(
  challenges.map((c) => [
    c.id,
    { lat: c.lat, lng: c.lng, city: c.city, country: c.country },
  ]),
)
writeFileSync(
  join(root, 'src', 'data', 'challenges.offline-answers.json'),
  JSON.stringify(offlineAnswers, null, 2),
  'utf8',
)

console.log(`Generated ${challenges.length} challenges and SVG fixtures.`)

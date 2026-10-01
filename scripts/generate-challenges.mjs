import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const photoDir = join(root, 'public', 'assets', 'photos')
mkdirSync(photoDir, { recursive: true })

/** @typedef {'dense'|'vertical'|'low'|'spread'} SkylineKind */
/** @typedef {'none'|'harbor'|'river'|'ocean'} WaterKind */
/** @typedef {'warm'|'cool'|'mixed'} LightTemp */

/**
 * slug, city, country, lat, lng, clue1, clue2, clue3, scene
 * @type {Array<[string,string,string,number,number,string,string,string,{skyline:SkylineKind,water:WaterKind,mountains:boolean,light:LightTemp,extra?:string}]>}
 */
const cities = [
  ['tokyo', 'Tokyo', 'Japan', 35.6762, 139.6503, 'Pacific rim megacity glow', 'Neon river valleys', 'Late-night rail hum', { skyline: 'vertical', water: 'harbor', mountains: true, light: 'mixed' }],
  ['nyc', 'New York', 'United States', 40.7128, -74.006, 'Grid of amber windows', 'Steam and sodium vapor', '24-hour avenue pulse', { skyline: 'dense', water: 'harbor', mountains: false, light: 'warm' }],
  ['paris', 'Paris', 'France', 48.8566, 2.3522, 'Warm stone under cool moon', 'Cafe awnings after rain', 'River mirror light', { skyline: 'spread', water: 'river', mountains: false, light: 'warm' }],
  ['sydney', 'Sydney', 'Australia', -33.8688, 151.2093, 'Harbor ring of light', 'Southern hemisphere summer nights', 'Coastal salt haze', { skyline: 'spread', water: 'ocean', mountains: false, light: 'cool' }],
  ['cairo', 'Cairo', 'Egypt', 30.0444, 31.2357, 'Desert air, dense core', 'Minaret silhouettes', 'Dry heat radiating', { skyline: 'low', water: 'river', mountains: false, light: 'warm' }],
  ['reykjavik', 'Reykjavik', 'Iceland', 64.1466, -21.9426, 'Low sun never truly sets in season', 'Geothermal steam plumes', 'North Atlantic wind', { skyline: 'low', water: 'harbor', mountains: true, light: 'cool', extra: 'aurora' }],
  ['singapore', 'Singapore', 'Singapore', 1.3521, 103.8198, 'Tropical humidity sheen', 'Port container glow', 'Equatorial night warmth', { skyline: 'vertical', water: 'ocean', mountains: false, light: 'mixed' }],
  ['cape-town', 'Cape Town', 'South Africa', -33.9249, 18.4241, 'Table-shaped shadow', 'Two-ocean breeze', 'Southern cross sky', { skyline: 'spread', water: 'ocean', mountains: true, light: 'cool' }],
  ['mumbai', 'Mumbai', 'India', 19.076, 72.8777, 'Monsoon-washed asphalt shine', 'Dense coastal strip', 'Arabian Sea edge', { skyline: 'dense', water: 'ocean', mountains: false, light: 'warm' }],
  ['buenos-aires', 'Buenos Aires', 'Argentina', -34.6037, -58.3816, 'Wide boulevard geometry', 'Tango district lamps', 'Rio de la Plata mist', { skyline: 'spread', water: 'river', mountains: false, light: 'warm' }],
  ['london', 'London', 'United Kingdom', 51.5074, -0.1278, 'Brick and fog diffusion', 'River bend bridges', 'Temperate marine air', { skyline: 'dense', water: 'river', mountains: false, light: 'warm' }],
  ['hong-kong', 'Hong Kong', 'China', 22.3193, 114.1694, 'Vertical light canyon', 'Harbor ferry trails', 'Subtropical humidity', { skyline: 'vertical', water: 'harbor', mountains: true, light: 'mixed' }],
  ['dubai', 'Dubai', 'United Arab Emirates', 25.2048, 55.2708, 'Glass tower reflections', 'Desert edge heat', 'Gulf coast calm', { skyline: 'vertical', water: 'ocean', mountains: false, light: 'cool' }],
  ['seoul', 'Seoul', 'South Korea', 37.5665, 126.978, 'Mountain bowl metropolis', 'River-side LED paths', 'Continental season snap', { skyline: 'dense', water: 'river', mountains: true, light: 'mixed' }],
  ['mexico-city', 'Mexico City', 'Mexico', 19.4326, -99.1332, 'High-altitude basin glow', 'Volcanic silhouette ring', 'Thin cool air', { skyline: 'spread', water: 'none', mountains: true, light: 'warm' }],
  ['stockholm', 'Stockholm', 'Sweden', 59.3293, 18.0686, 'Archipelago dark water', 'Warm window islands', 'Baltic summer dusk', { skyline: 'low', water: 'harbor', mountains: false, light: 'warm' }],
  ['nairobi', 'Nairobi', 'Kenya', -1.2921, 36.8219, 'High plateau cool night', 'Savanna edge city', 'Equatorial altitude', { skyline: 'spread', water: 'none', mountains: true, light: 'warm' }],
  ['anchorage', 'Anchorage', 'United States', 61.2181, -149.9003, 'Long twilight linger', 'Snow-capped backdrop', 'Subarctic quiet', { skyline: 'low', water: 'harbor', mountains: true, light: 'cool', extra: 'snow' }],
  ['wellington', 'Wellington', 'New Zealand', -41.2865, 174.7762, 'Windy harbor crescent', 'Southern capital glow', 'Cook Strait air', { skyline: 'low', water: 'ocean', mountains: true, light: 'cool' }],
  ['honolulu', 'Honolulu', 'United States', 21.3069, -157.8583, 'Pacific trade winds', 'Volcanic ridge dark', 'Tropical ocean night', { skyline: 'spread', water: 'ocean', mountains: true, light: 'warm' }],
  ['oslo', 'Oslo', 'Norway', 59.9139, 10.7522, 'Fjord inlet mirror', 'Forest ridge backdrop', 'High-latitude blue hour', { skyline: 'low', water: 'harbor', mountains: true, light: 'cool' }],
  ['lima', 'Lima', 'Peru', -12.0464, -77.0428, 'Coastal garua mist', 'Pacific cliff drop', 'Desert city paradox', { skyline: 'spread', water: 'ocean', mountains: false, light: 'cool' }],
  ['istanbul', 'Istanbul', 'Turkey', 41.0082, 28.9784, 'Strait bridge necklaces', 'Continental crossroads', 'Sea of Marmara breeze', { skyline: 'dense', water: 'harbor', mountains: false, light: 'warm' }],
  ['vancouver', 'Vancouver', 'Canada', 49.2827, -123.1207, 'Rain-slick reflections', 'Mountain fjord backdrop', 'Pacific northwest cool', { skyline: 'vertical', water: 'ocean', mountains: true, light: 'cool' }],
  ['marrakech', 'Marrakech', 'Morocco', 31.6295, -7.9811, 'Medina warm lantern tone', 'Atlas foothill air', 'Desert-adjacent night', { skyline: 'low', water: 'none', mountains: true, light: 'warm' }],
]

function regionHint(lat, lng) {
  const absLat = Math.abs(lat)
  if (lng >= 95 && lng <= 145 && lat >= -10 && lat <= 45) {
    return 'Regional context: East and Southeast Asian rim.'
  }
  if (lng >= -130 && lng <= -60 && lat >= 15 && lat <= 72) {
    return 'Regional context: Americas (north and tropical band).'
  }
  if (lng >= -25 && lng <= 45 && lat >= 35 && lat <= 72) {
    return 'Regional context: Europe and North Atlantic adjacency.'
  }
  if (lng >= -20 && lng <= 55 && lat >= -35 && lat <= 35) {
    return 'Regional context: Africa and Middle East belt.'
  }
  if (lat <= -20 && lng >= 110 && lng <= 180) {
    return 'Regional context: Australasia and southwest Pacific.'
  }
  if (absLat >= 55) {
    return 'Regional context: High-latitude North Atlantic or Arctic fringe.'
  }
  return 'Regional context: Mid-latitude continental or coastal mix.'
}

function skyStops(hue, lat) {
  const absLat = Math.abs(lat)
  const topL = absLat > 55 ? 6 : absLat > 35 ? 8 : 10
  const botL = absLat > 55 ? 14 : absLat > 35 ? 16 : 18
  return { topL, botL }
}

function windowFill(light, i) {
  if (light === 'warm') return `hsl(38, 92%, ${58 + (i % 3) * 6}%)`
  if (light === 'cool') return `hsl(195, 75%, ${62 + (i % 3) * 5}%)`
  return i % 2 === 0 ? 'hsl(38, 90%, 62%)' : 'hsl(195, 70%, 65%)'
}

function mountainLayer(hue) {
  return `<path d="M0 340 L120 220 L240 300 L360 180 L480 260 L600 200 L720 280 L800 240 L800 500 L0 500 Z" fill="hsl(${hue}, 18%, 10%)" opacity="0.85"/>
  <path d="M0 360 L200 260 L400 320 L560 240 L800 300 L800 500 L0 500 Z" fill="hsl(${hue}, 15%, 14%)" opacity="0.6"/>`
}

function waterLayer(hue, water, groundY) {
  if (water === 'none') return ''
  const fill = water === 'river' ? `hsl(${hue}, 35%, 14%)` : `hsl(${hue}, 40%, 12%)`
  const y = water === 'river' ? groundY + 40 : groundY - 20
  const h = water === 'river' ? 55 : 120
  let extra = ''
  if (water === 'harbor' || water === 'ocean') {
    extra = `<path d="M0 ${groundY + 30} Q200 ${groundY - 10} 400 ${groundY + 20} T800 ${groundY + 10} L800 500 L0 500 Z" fill="${fill}" opacity="0.75"/>`
  }
  return `${extra}<rect y="${y}" width="800" height="${h}" fill="${fill}" opacity="0.9"/>
  ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${80 + i * 95}" cy="${y + h / 2}" rx="40" ry="6" fill="hsl(${hue}, 25%, 22%)" opacity="0.35"/>`).join('')}`
}

function buildings(hue, skyline, groundY, light) {
  const counts = { dense: 16, vertical: 14, spread: 11, low: 9 }
  const n = counts[skyline] ?? 12
  const gap = 800 / n
  const parts = []
  for (let i = 0; i < n; i++) {
    const x = 24 + i * gap
    let w = 28 + (i % 4) * 8
    let h =
      skyline === 'vertical'
        ? 120 + (i % 6) * 45
        : skyline === 'low'
          ? 45 + (i % 4) * 22
          : skyline === 'spread'
            ? 70 + (i % 5) * 30
            : 85 + (i % 5) * 38
    if (skyline === 'vertical' && i % 5 === 0) {
      w = 22
      h += 60
    }
    const y = groundY - h
    parts.push(
      `<rect x="${x.toFixed(0)}" y="${y}" width="${w}" height="${h}" fill="hsl(${hue}, 22%, ${18 + (i % 3) * 2}%)" rx="2"/>`,
    )
    for (let r = 0; r < Math.floor(h / 28); r++) {
      if ((i + r) % 2 === 0) {
        parts.push(
          `<rect x="${x + 6}" y="${y + 10 + r * 24}" width="7" height="9" fill="${windowFill(light, i + r)}" opacity="0.85"/>`,
        )
      }
    }
  }
  return parts.join('\n  ')
}

function aurora(hue) {
  return `<path d="M80 40 Q200 120 320 50 T560 90 T720 45" fill="none" stroke="hsl(${hue}, 70%, 55%)" stroke-width="18" opacity="0.25"/>
  <path d="M120 60 Q260 140 400 70 T640 100" fill="none" stroke="hsl(${(hue + 80) % 360}, 65%, 60%)" stroke-width="12" opacity="0.2"/>`
}

function svgForChallenge(challengeId, hue, lat, scene) {
  const groundY = 320
  const { topL, botL } = skyStops(hue, lat)
  const moonY = lat >= 0 ? 85 : 95
  let layers = ''
  if (scene.mountains) {
    layers += `\n  ${mountainLayer(hue)}`
  }
  layers += `\n  ${waterLayer(hue, scene.water, groundY)}`
  if (scene.extra === 'aurora') {
    layers += `\n  ${aurora(hue)}`
  }
  if (scene.extra === 'snow') {
    layers += `\n  <rect y="250" width="800" height="90" fill="hsl(${hue}, 15%, 88%)" opacity="0.08"/>`
  }
  const bldg = buildings(hue, scene.skyline, groundY, scene.light)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" role="img" aria-label="Demo night scene">
  <defs>
    <linearGradient id="sky-${challengeId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 45%, ${topL}%)"/>
      <stop offset="100%" stop-color="hsl(${hue}, 35%, ${botL}%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sky-${challengeId})"/>
  <circle cx="620" cy="${moonY}" r="36" fill="hsl(${hue}, 28%, 78%)" opacity="0.82"/>${layers}
  <rect y="${groundY}" width="800" height="${500 - groundY}" fill="hsl(${hue}, 25%, 11%)"/>
  ${bldg}
  <text x="24" y="488" fill="hsl(${hue}, 12%, 48%)" font-family="system-ui,sans-serif" font-size="13">Demo fixture — stylized night scene</text>
</svg>`
}

const challenges = cities.map(
  ([_slug, city, country, lat, lng, c1, c2, c3, scene], i) => {
    const id = `aad-${String(i + 1).padStart(2, '0')}`
    const hue = (i * 37) % 360
    const file = `${id}.svg`
    writeFileSync(
      join(photoDir, file),
      svgForChallenge(id, hue, lat, scene),
      'utf8',
    )
    const hintTexts = [
      `Hemisphere: ${lat >= 0 ? 'Northern' : 'Southern'} half of the globe.`,
      `Climate band: ${Math.abs(lat) > 45 ? 'High-latitude' : Math.abs(lat) < 23.5 ? 'Tropical/subtropical' : 'Mid-latitude'} feel.`,
      regionHint(lat, lng),
    ]
    return {
      id,
      imagePath: `/assets/photos/${file}`,
      title: `Night signal ${i + 1}`,
      city,
      country,
      lat,
      lng,
      hintTexts,
      clueTexts: [c1, c2, c3],
      source: 'demo-fixture/original-svg',
      license: 'MIT (game repo) — replace with photo license before production',
      attribution: 'Original SVG demo fixture generated for Atlas After Dark',
    }
  },
)

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

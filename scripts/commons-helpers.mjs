const ALLOWED_LICENSE = [
  /^public domain/i,
  /^cc0/i,
  /^cc by 2\.0/i,
  /^cc by 3\.0/i,
  /^cc by 4\.0/i,
  /^cc by-sa 2\.0/i,
  /^cc by-sa 3\.0/i,
  /^cc by-sa 4\.0/i,
]

const REJECT_TITLE = [
  /\beiffel\b/i,
  /\bburj\b/i,
  /\btower bridge\b/i,
  /\bsydney opera\b/i,
  /\bopera house\b/i,
  /\bbig ben\b/i,
  /\bstatue of liberty\b/i,
  /\bcolosseum\b/i,
  /\bbrandenburg\b/i,
  /\bgolden gate\b/i,
  /\bwatermark\b/i,
]

export function parseExtMetadata(meta) {
  const pick = (key) => meta?.[key]?.value?.replace(/<[^>]+>/g, '').trim() ?? ''
  return {
    licenseShortName: pick('LicenseShortName'),
    licenseUrl: pick('LicenseUrl'),
    artist: pick('Artist') || pick('Credit'),
    attributionRequired: pick('AttributionRequired'),
  }
}

export function licenseAllowed(shortName) {
  if (!shortName || shortName.toLowerCase() === 'unknown') return false
  return ALLOWED_LICENSE.some((re) => re.test(shortName.trim()))
}

export function titleRejected(title, city, country) {
  const t = title.toLowerCase()
  if (REJECT_TITLE.some((re) => re.test(t))) return 'iconic landmark or watermark hint'
  if (city && t.includes(city.toLowerCase())) return 'title names city'
  if (country && t.includes(country.toLowerCase())) return 'title names country'
  return null
}

export const USER_AGENT =
  'AtlasAfterDark/1.0 (https://github.com/mizcausevic-dev/atlas-after-dark; night-game photo fetch)'

export async function commonsApi(params) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  return res.json()
}

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

const LANDMARK_BLOCKLIST = [
  /\bopera house\b/i,
  /\bharbour bridge\b/i,
  /\bsydney harbour bridge\b/i,
  /\beiffel\b/i,
  /\bblue mosque\b/i,
  /\bsultan ahmed\b/i,
  /\bmi6\b/i,
  /\bburj\b/i,
  /\btower bridge\b/i,
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
    gpsLatitudeRaw: pick('GPSLatitude'),
    gpsLongitudeRaw: pick('GPSLongitude'),
    dateTimeOriginal: pick('DateTimeOriginal'),
  }
}

export function licenseAllowed(shortName) {
  if (!shortName || shortName.toLowerCase() === 'unknown') return false
  return ALLOWED_LICENSE.some((re) => re.test(shortName.trim()))
}

export function titleRejected(title, city, country) {
  const t = title.toLowerCase()
  const cityStr = city != null ? String(city) : ''
  const countryStr = country != null ? String(country) : ''
  if (LANDMARK_BLOCKLIST.some((re) => re.test(t))) {
    return 'iconic landmark blocklist (title)'
  }
  if (/\belection\b|\bparty\b/i.test(t)) return 'election/party (title)'
  if (/\bportrait\b/i.test(t)) return 'portrait (title)'
  if (cityStr && t.includes(cityStr.toLowerCase())) return 'title names city'
  if (countryStr && t.includes(countryStr.toLowerCase())) return 'title names country'
  const yearInTitle = t.match(/\b(18\d{2}|19[0-8]\d)\b/)
  if (yearInTitle) return `pre-1990 hint in title (${yearInTitle[1]})`
  return null
}

/**
 * @param {string[]} categories
 * @param {string} title
 */
export function categoriesRejected(categories, title) {
  const blob = `${categories.join(' ')} ${title}`.toLowerCase()
  if (LANDMARK_BLOCKLIST.some((re) => re.test(blob))) {
    return 'iconic landmark blocklist (categories/title)'
  }
  if (/\belection\b|\bparty\b/.test(blob)) return 'election/party (categories)'
  if (/\bportrait\b|\bpeople\b/.test(blob)) return 'people/portrait category'
  if (/\bblack-and-white\b|\bblack and white\b/.test(blob)) {
    return 'black and white'
  }
  const yearCat = blob.match(/\b(18\d{2}|19[0-8]\d)\b/)
  if (yearCat) return `pre-1990 (${yearCat[1]})`
  const hasNight = /\bnight\b|\bblue hour\b|\btwilight\b|\bevening photography\b/.test(
    blob,
  )
  const hasDay =
    /\bgolden hour\b|\bdaytime\b|\bdaylight\b|\bday time\b/.test(blob)
  if (hasDay && !hasNight) return 'daylight/golden-hour without night category'
  return null
}

/** @param {string} raw */
function parseDms(raw) {
  if (!raw) return null
  const m = raw.match(
    /([+-]?\d+(?:\.\d+)?)\s*°?\s*(\d+(?:\.\d+)?)?['′]?\s*(\d+(?:\.\d+)?)?["″]?\s*([NSEW])?/i,
  )
  if (!m) {
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : null
  }
  const deg = Number.parseFloat(m[1])
  const min = m[2] ? Number.parseFloat(m[2]) : 0
  const sec = m[3] ? Number.parseFloat(m[3]) : 0
  let dec = Math.abs(deg) + min / 60 + sec / 3600
  if (deg < 0) dec = -dec
  const hemi = m[4]?.toUpperCase()
  if (hemi === 'S' || hemi === 'W') dec = -Math.abs(dec)
  if (hemi === 'N' || hemi === 'E') dec = Math.abs(dec)
  return dec
}

/**
 * @param {object} page
 * @param {ReturnType<typeof parseExtMetadata>} meta
 */
export function photoCoordinates(page, meta) {
  const coords = page?.coordinates?.[0]
  if (coords && coords.lat != null && coords.lon != null) {
    return { lat: coords.lat, lng: coords.lon, source: 'coordinates' }
  }
  const lat = parseDms(meta.gpsLatitudeRaw)
  const lng = parseDms(meta.gpsLongitudeRaw)
  if (lat != null && lng != null) {
    return { lat, lng, source: 'exif-gps' }
  }
  return null
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

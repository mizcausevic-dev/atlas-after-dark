import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  createWriteStream,
  appendFileSync,
  unlinkSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'
import {
  commonsApi,
  licenseAllowed,
  parseExtMetadata,
  titleRejected,
  categoriesRejected,
  photoCoordinates,
  haversineKm,
  USER_AGENT,
} from './commons-helpers.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, '.cache', 'commons-originals')
const outDir = join(root, 'public', 'assets', 'photos')
const manifestPath = join(root, 'data', 'photo-sources.json')
const picksPath = join(root, 'data', 'photo-commons-picks.json')
const rejectLogPath = join(root, 'data', 'photo-fetch-rejections.jsonl')

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outDir, { recursive: true })
mkdirSync(join(root, 'data'), { recursive: true })

/** @type {Array<[string,string,string,number,number]>} */
const CHALLENGES = [
  ['aad-01', 'Tokyo', 'Japan', 35.6762, 139.6503],
  ['aad-02', 'New York', 'United States', 40.7128, -74.006],
  ['aad-03', 'Paris', 'France', 48.8566, 2.3522],
  ['aad-04', 'Sydney', 'Australia', -33.8688, 151.2093],
  ['aad-05', 'Cairo', 'Egypt', 30.0444, 31.2357],
  ['aad-06', 'Reykjavik', 'Iceland', 64.1466, -21.9426],
  ['aad-07', 'Singapore', 'Singapore', 1.3521, 103.8198],
  ['aad-08', 'Cape Town', 'South Africa', -33.9249, 18.4241],
  ['aad-09', 'Mumbai', 'India', 19.076, 72.8777],
  ['aad-10', 'Buenos Aires', 'Argentina', -34.6037, -58.3816],
  ['aad-11', 'London', 'United Kingdom', 51.5074, -0.1278],
  ['aad-12', 'Hong Kong', 'China', 22.3193, 114.1694],
  ['aad-13', 'Dubai', 'United Arab Emirates', 25.2048, 55.2708],
  ['aad-14', 'Seoul', 'South Korea', 37.5665, 126.978],
  ['aad-15', 'Mexico City', 'Mexico', 19.4326, -99.1332],
  ['aad-16', 'Stockholm', 'Sweden', 59.3293, 18.0686],
  ['aad-17', 'Nairobi', 'Kenya', -1.2921, 36.8219],
  ['aad-18', 'Anchorage', 'United States', 61.2181, -149.9003],
  ['aad-19', 'Wellington', 'New Zealand', -41.2865, 174.7762],
  ['aad-20', 'Honolulu', 'United States', 21.3069, -157.8583],
  ['aad-21', 'Oslo', 'Norway', 59.9139, 10.7522],
  ['aad-22', 'Lima', 'Peru', -12.0464, -77.0428],
  ['aad-23', 'Istanbul', 'Turkey', 41.0082, 28.9784],
  ['aad-24', 'Vancouver', 'Canada', 49.2827, -123.1207],
  ['aad-25', 'Marrakech', 'Morocco', 31.6295, -7.9811],
]

const KEEP_AS_IS = new Set([
  'aad-01',
  'aad-03',
  'aad-07',
  'aad-12',
  'aad-14',
  'aad-16',
  'aad-20',
  'aad-24',
  'aad-25',
])

const MAX_DISTANCE_KM = 25
const MODIFICATIONS =
  'resized to 1200px, cropped, re-encoded WebP, metadata stripped'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** @type {Record<string, string> | null} */
const picks = existsSync(picksPath)
  ? JSON.parse(readFileSync(picksPath, 'utf8'))
  : {}

/** @type {Record<string, object>} */
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {}

function logReject(id, title, reason) {
  const line = JSON.stringify({
    challengeId: id,
    fileTitle: title,
    reason,
    at: new Date().toISOString(),
  })
  appendFileSync(rejectLogPath, `${line}\n`)
  console.log(`  reject: ${title} — ${reason}`)
}

async function fileInfoForTitle(fileTitle) {
  await sleep(1000)
  const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`
  const data = await commonsApi({
    action: 'query',
    titles: title,
    prop: 'imageinfo|categories|coordinates',
    cllimit: 'max',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: 1200,
    coprop: 'type|name|dim|country|region|globe',
  })
  const pages = data.query?.pages ?? {}
  const page = Object.values(pages)[0]
  if (!page || page.missing) return null
  const info = page.imageinfo?.[0]
  if (!info?.url) return null
  const meta = parseExtMetadata(info.extmetadata ?? {})
  /** @type {string[]} */
  const categories = []
  if (page.categories) {
    for (const c of page.categories) {
      if (c.title) categories.push(c.title.replace(/^Category:/, ''))
    }
  }
  return {
    title: page.title,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    url: info.url,
    width: info.width,
    height: info.height,
    mime: info.mime,
    categories,
    page,
    ...meta,
  }
}

function evaluateFile(id, info, city, country, targetLat, targetLng) {
  const plainTitle = info.title.replace(/^File:/, '')
  const tReject = titleRejected(plainTitle, city, country)
  if (tReject) return tReject
  const cReject = categoriesRejected(info.categories ?? [], plainTitle)
  if (cReject) return cReject
  if (!/^image\//.test(info.mime ?? '')) return 'not an image'
  if (!licenseAllowed(info.licenseShortName)) {
    return `license not allowed (${info.licenseShortName})`
  }
  if ((info.width ?? 0) < 640) return 'image too small'
  const coords = photoCoordinates(info.page, info)
  if (!coords) return 'missing Commons coordinates / GPS'
  const distanceKm = haversineKm(targetLat, targetLng, coords.lat, coords.lng)
  if (distanceKm > MAX_DISTANCE_KM) {
    return `location gate: ${distanceKm.toFixed(1)} km from ${city} (> ${MAX_DISTANCE_KM})`
  }
  return { ok: true, coords, distanceKm, plainTitle }
}

async function searchCandidates(city, country) {
  const queries = [
    `${city} night street`,
    `${city} blue hour cityscape`,
    `night street ${country}`,
  ]
  /** @type {Array<{ title: string }>} */
  const hits = []
  for (const q of queries) {
    await sleep(1000)
    const data = await commonsApi({
      action: 'query',
      generator: 'search',
      gsrsearch: q,
      gsrnamespace: 6,
      gsrlimit: 10,
      prop: 'info',
    })
    const pages = data.query?.pages ?? {}
    for (const p of Object.values(pages)) {
      if (p.title && !hits.some((h) => h.title === p.title)) {
        hits.push({ title: p.title })
      }
    }
  }
  return hits
}

async function pickFromCategory(categoryTitle, id, city, country, targetLat, targetLng) {
  await sleep(1000)
  const data = await commonsApi({
    action: 'query',
    generator: 'categorymembers',
    gcmtitle: categoryTitle,
    gcmtype: 'file',
    gcmlimit: 25,
    prop: 'imageinfo|categories|coordinates',
    cllimit: 'max',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: 1200,
  })
  const pages = Object.values(data.query?.pages ?? {})
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info?.url) continue
    const meta = parseExtMetadata(info.extmetadata ?? {})
    const categories = (page.categories ?? []).map((c) =>
      c.title.replace(/^Category:/, ''),
    )
    const wrapped = {
      title: page.title,
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      url: info.url,
      width: info.width,
      height: info.height,
      mime: info.mime,
      categories,
      page,
      ...meta,
    }
    const verdict = evaluateFile(id, wrapped, city, country, targetLat, targetLng)
    if (typeof verdict === 'string') {
      logReject(id, page.title, `category ${categoryTitle}: ${verdict}`)
      continue
    }
    return { info: wrapped, ...verdict }
  }
  return null
}

async function pickFile(id, city, country, targetLat, targetLng) {
  if (picks[id]) {
    const info = await fileInfoForTitle(picks[id])
    if (info) {
      const verdict = evaluateFile(id, info, city, country, targetLat, targetLng)
      if (typeof verdict === 'string') {
        logReject(id, info.title, `manual pick: ${verdict}`)
      } else {
        return { info, ...verdict }
      }
    }
    console.warn(`${id}: manual pick failed gates, searching…`)
  }
  const candidates = await searchCandidates(city, country)
  for (const c of candidates) {
    const info = await fileInfoForTitle(c.title)
    if (!info) continue
    const verdict = evaluateFile(id, info, city, country, targetLat, targetLng)
    if (typeof verdict === 'string') {
      logReject(id, c.title, verdict)
      continue
    }
    return { info, ...verdict }
  }
  return null
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`download ${res.status}`)
  await pipeline(res.body, createWriteStream(dest))
}

async function processToWebp(id, srcPath) {
  const base = sharp(srcPath).rotate().resize(1200, null, {
    fit: 'cover',
    withoutEnlargement: false,
  })
  const webpPath = join(outDir, `${id}.webp`)
  const webp600Path = join(outDir, `${id}-600.webp`)
  await base.clone().webp({ quality: 75 }).toFile(webpPath)
  await base
    .clone()
    .resize(600, null, { fit: 'cover' })
    .webp({ quality: 75 })
    .toFile(webp600Path)
  return webpPath
}

function commonsTitleFromManifestEntry(entry) {
  const url = entry.commonsPageUrl
  if (!url) return null
  const part = url.split('/wiki/')[1]
  if (!part) return null
  let title = decodeURIComponent(part)
  if (!title.startsWith('File:')) title = `File:${title}`
  return title.replace(/ /g, '_')
}

async function adoptPhoto(id, picked) {
  const { info, coords, distanceKm } = picked
  const ext = info.mime?.includes('png') ? 'png' : 'jpg'
  const cachePath = join(cacheDir, `${id}.${ext}`)
  if (!existsSync(cachePath)) {
    await download(info.url, cachePath)
  }
  await processToWebp(id, cachePath)
  manifest[id] = {
    status: 'photo',
    commonsPageUrl: info.pageUrl,
    originalFileUrl: info.url,
    author: info.artist || 'See Commons file page',
    license: info.licenseShortName,
    licenseUrl: info.licenseUrl || info.pageUrl,
    modifications: MODIFICATIONS,
    retrievedAt: new Date().toISOString().slice(0, 10),
    photoLat: coords.lat,
    photoLng: coords.lng,
    distanceKm: Number(distanceKm.toFixed(2)),
  }
  console.log(
    `  ${id}: verified photo (${info.licenseShortName}, ${manifest[id].distanceKm} km)`,
  )
}

async function backfillKeptPhoto(id, city, country, targetLat, targetLng) {
  const entry = manifest[id]
  if (!entry || entry.status !== 'photo') return
  const fileTitle = commonsTitleFromManifestEntry(entry)
  if (!fileTitle) {
    console.warn(`${id}: cannot parse Commons title for backfill`)
    return
  }
  const info = await fileInfoForTitle(fileTitle)
  if (!info) {
    console.warn(`${id}: backfill API miss`)
    return
  }
  const verdict = evaluateFile(id, info, city, country, targetLat, targetLng)
  if (typeof verdict === 'string') {
    console.warn(`${id}: kept asset fails gate (${verdict}); searching replacement…`)
    let picked = await pickFile(id, city, country, targetLat, targetLng)
    if (!picked) {
      const cat = `Category:Night_in_${city.replace(/ /g, '_')}`
      picked = await pickFromCategory(cat, id, city, country, targetLat, targetLng)
    }
    if (!picked) {
      manifest[id] = {
        status: 'svg',
        keepSvgReason: `Kept photo failed location/metadata gate (${verdict}) and no replacement found. See data/photo-fetch-rejections.jsonl.`,
      }
      for (const suffix of ['', '-600']) {
        const p = join(outDir, `${id}${suffix}.webp`)
        if (existsSync(p)) unlinkSync(p)
      }
      return
    }
    await adoptPhoto(id, picked)
    return
  }
  entry.photoLat = verdict.coords.lat
  entry.photoLng = verdict.coords.lng
  entry.distanceKm = Number(verdict.distanceKm.toFixed(2))
  console.log(`  kept ${id}: distance ${entry.distanceKm} km`)
}

writeFileSync(rejectLogPath, '', 'utf8')

for (const [id, city, country, lat, lng] of CHALLENGES) {
  console.log(`\n— ${id} (${city})`)
  if (KEEP_AS_IS.has(id)) {
    await backfillKeptPhoto(id, city, country, lat, lng)
    continue
  }

  if (manifest[id]?.status === 'svg' && !picks[id]) {
    console.log('  unchanged SVG')
    continue
  }

  try {
    const picked = await pickFile(id, city, country, lat, lng)
    if (!picked) {
      manifest[id] = {
        status: 'svg',
        keepSvgReason: `No Commons candidate passed license, content, and location gates for ${city}. See data/photo-fetch-rejections.jsonl.`,
      }
      for (const suffix of ['', '-600']) {
        const p = join(outDir, `${id}${suffix}.webp`)
        if (existsSync(p)) unlinkSync(p)
      }
      console.log('  kept SVG')
      continue
    }
    const { info, coords, distanceKm } = picked
    const ext = info.mime?.includes('png') ? 'png' : 'jpg'
    const cachePath = join(cacheDir, `${id}.${ext}`)
    if (!existsSync(cachePath)) {
      await download(info.url, cachePath)
    }
    await processToWebp(id, cachePath)
    manifest[id] = {
      status: 'photo',
      commonsPageUrl: info.pageUrl,
      originalFileUrl: info.url,
      author: info.artist || 'See Commons file page',
      license: info.licenseShortName,
      licenseUrl: info.licenseUrl || info.pageUrl,
      modifications: MODIFICATIONS,
      retrievedAt: new Date().toISOString().slice(0, 10),
      photoLat: coords.lat,
      photoLng: coords.lng,
      distanceKm: Number(distanceKm.toFixed(2)),
    }
    console.log(`  photo OK (${info.licenseShortName}, ${manifest[id].distanceKm} km)`)
  } catch (e) {
    console.error(`  error: ${e instanceof Error ? e.message : e}`)
    manifest[id] = {
      status: 'svg',
      keepSvgReason: `Fetch failed: ${e instanceof Error ? e.message : 'unknown'}`,
    }
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log(`\nWrote ${manifestPath}`)
console.log(`Rejections: ${rejectLogPath}`)

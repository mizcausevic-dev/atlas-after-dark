import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  createWriteStream,
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
  USER_AGENT,
} from './commons-helpers.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, '.cache', 'commons-originals')
const outDir = join(root, 'public', 'assets', 'photos')
const manifestPath = join(root, 'data', 'photo-sources.json')
const picksPath = join(root, 'data', 'photo-commons-picks.json')

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outDir, { recursive: true })
mkdirSync(join(root, 'data'), { recursive: true })

/** @type {Array<[string,string,string]>} */
const CHALLENGES = [
  ['aad-01', 'Tokyo', 'Japan'],
  ['aad-02', 'New York', 'United States'],
  ['aad-03', 'Paris', 'France'],
  ['aad-04', 'Sydney', 'Australia'],
  ['aad-05', 'Cairo', 'Egypt'],
  ['aad-06', 'Reykjavik', 'Iceland'],
  ['aad-07', 'Singapore', 'Singapore'],
  ['aad-08', 'Cape Town', 'South Africa'],
  ['aad-09', 'Mumbai', 'India'],
  ['aad-10', 'Buenos Aires', 'Argentina'],
  ['aad-11', 'London', 'United Kingdom'],
  ['aad-12', 'Hong Kong', 'China'],
  ['aad-13', 'Dubai', 'United Arab Emirates'],
  ['aad-14', 'Seoul', 'South Korea'],
  ['aad-15', 'Mexico City', 'Mexico'],
  ['aad-16', 'Stockholm', 'Sweden'],
  ['aad-17', 'Nairobi', 'Kenya'],
  ['aad-18', 'Anchorage', 'United States'],
  ['aad-19', 'Wellington', 'New Zealand'],
  ['aad-20', 'Honolulu', 'United States'],
  ['aad-21', 'Oslo', 'Norway'],
  ['aad-22', 'Lima', 'Peru'],
  ['aad-23', 'Istanbul', 'Turkey'],
  ['aad-24', 'Vancouver', 'Canada'],
  ['aad-25', 'Marrakech', 'Morocco'],
]

const MODIFICATIONS =
  'resized to 1200px, cropped, re-encoded WebP, metadata stripped'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** @type {Record<string, string> | null} */
const picks = existsSync(picksPath)
  ? JSON.parse(readFileSync(picksPath, 'utf8'))
  : null

/** @type {Record<string, object>} */
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {}

async function searchCandidates(city, country) {
  const queries = [
    `${city} night street`,
    `${city} blue hour cityscape`,
    `night street ${country}`,
  ]
  /** @type {Array<{ title: string, pageid: number }>} */
  const hits = []
  for (const q of queries) {
    await sleep(1000)
    const data = await commonsApi({
      action: 'query',
      generator: 'search',
      gsrsearch: q,
      gsrnamespace: 6,
      gsrlimit: 8,
      prop: 'info',
      inprop: 'url',
    })
    const pages = data.query?.pages ?? {}
    for (const p of Object.values(pages)) {
      if (p.title && !hits.some((h) => h.title === p.title)) {
        hits.push({ title: p.title, pageid: p.pageid })
      }
    }
  }
  return hits
}

async function fileInfoForTitle(fileTitle) {
  await sleep(1000)
  const data = await commonsApi({
    action: 'query',
    titles: fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: 1200,
  })
  const pages = data.query?.pages ?? {}
  const page = Object.values(pages)[0]
  if (!page || page.missing) return null
  const info = page.imageinfo?.[0]
  if (!info?.url) return null
  const meta = parseExtMetadata(info.extmetadata ?? {})
  return {
    title: page.title,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    url: info.url,
    width: info.width,
    height: info.height,
    mime: info.mime,
    ...meta,
  }
}

async function pickFile(id, city, country) {
  if (picks?.[id]) {
    const info = await fileInfoForTitle(picks[id])
    if (info) return info
    console.warn(`${id}: manual pick failed, searching…`)
  }
  const candidates = await searchCandidates(city, country)
  for (const c of candidates) {
    const reject = titleRejected(c.title.replace(/^File:/, ''), city, country)
    if (reject) continue
    const info = await fileInfoForTitle(c.title)
    if (!info) continue
    if (!/^image\//.test(info.mime ?? '')) continue
    if (!licenseAllowed(info.licenseShortName)) {
      console.warn(`${id}: reject license "${info.licenseShortName}" for ${c.title}`)
      continue
    }
    if ((info.width ?? 0) < 640) continue
    return info
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

for (const [id, city, country] of CHALLENGES) {
  console.log(`\n— ${id} (${city})`)
  try {
    const file = await pickFile(id, city, country)
    if (!file) {
      manifest[id] = {
        status: 'svg',
        keepSvgReason: `No Wikimedia Commons photo passed license and anti-leak rules for ${city}.`,
      }
      console.log(`  kept SVG`)
      continue
    }
    const ext = file.mime?.includes('png') ? 'png' : 'jpg'
    const cachePath = join(cacheDir, `${id}.${ext}`)
    if (!existsSync(cachePath)) {
      await download(file.url, cachePath)
    }
    await processToWebp(id, cachePath)
    manifest[id] = {
      status: 'photo',
      commonsPageUrl: file.pageUrl,
      originalFileUrl: file.url,
      author: file.artist || 'See Commons file page',
      license: file.licenseShortName,
      licenseUrl: file.licenseUrl || file.pageUrl,
      modifications: MODIFICATIONS,
      retrievedAt: new Date().toISOString().slice(0, 10),
    }
    console.log(`  photo OK (${file.licenseShortName})`)
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

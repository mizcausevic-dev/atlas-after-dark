import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'data', 'photo-sources.json')

const REQUIRED_PHOTO = [
  'commonsPageUrl',
  'originalFileUrl',
  'author',
  'license',
  'licenseUrl',
  'modifications',
  'retrievedAt',
]

const IDS = Array.from({ length: 25 }, (_, i) => `aad-${String(i + 1).padStart(2, '0')}`)

function fail(msg) {
  console.error(`photo-manifest: ${msg}`)
  process.exit(1)
}

if (!existsSync(manifestPath)) {
  fail('missing data/photo-sources.json')
}

/** @type {Record<string, unknown>} */
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

for (const id of IDS) {
  const entry = manifest[id]
  if (!entry || typeof entry !== 'object') {
    fail(`missing entry for ${id}`)
  }
  const status = entry.status
  if (status === 'svg') {
    if (typeof entry.keepSvgReason !== 'string' || !entry.keepSvgReason.trim()) {
      fail(`${id}: svg fallback requires keepSvgReason`)
    }
    continue
  }
  if (status !== 'photo') {
    fail(`${id}: status must be "photo" or "svg"`)
  }
  for (const key of REQUIRED_PHOTO) {
    if (typeof entry[key] !== 'string' || !entry[key].trim()) {
      fail(`${id}: missing or empty "${key}"`)
    }
  }
  const webp = join(root, 'public', 'assets', 'photos', `${id}.webp`)
  if (!existsSync(webp)) {
    fail(`${id}: expected ${webp}`)
  }
}

console.log(`photo-manifest: OK (${IDS.length} entries)`)

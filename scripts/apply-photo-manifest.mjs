import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'data', 'photo-sources.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const secretPath = join(root, 'server', 'data', 'challenges.secret.json')
const fixturePath = join(root, 'src', 'data', 'challenges.fixture.json')
const attributionPath = join(root, 'src', 'data', 'photo-attribution.json')

/** @type {import('../server/data/challenges.secret.json')} */
const secret = JSON.parse(readFileSync(secretPath, 'utf8'))
/** @type {Array<{ id: string, imagePath: string }>} */
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))

/** @type {Record<string, object>} */
const attribution = {}

for (const row of secret) {
  const entry = manifest[row.id]
  if (!entry) continue
  if (entry.status === 'photo') {
    row.imagePath = `/assets/photos/${row.id}.webp`
    row.source = entry.commonsPageUrl
    row.license = entry.license
    row.attribution = `${entry.author}; ${entry.license}; via Wikimedia Commons; modified (${entry.modifications})`
    attribution[row.id] = {
      author: entry.author,
      license: entry.license,
      licenseUrl: entry.licenseUrl,
      commonsPageUrl: entry.commonsPageUrl,
      modified: true,
      modifications: entry.modifications,
    }
  } else {
    row.imagePath = `/assets/photos/${row.id}.svg`
  }
}

for (const row of fixture) {
  const entry = manifest[row.id]
  if (entry?.status === 'photo') {
    row.imagePath = `/assets/photos/${row.id}.webp`
  } else if (entry?.status === 'svg') {
    row.imagePath = `/assets/photos/${row.id}.svg`
  }
}

writeFileSync(secretPath, JSON.stringify(secret, null, 2), 'utf8')
writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), 'utf8')
writeFileSync(attributionPath, JSON.stringify(attribution, null, 2), 'utf8')
console.log('apply-photo-manifest: updated challenge paths and photo-attribution.json')

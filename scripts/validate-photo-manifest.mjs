import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { haversineKm } from './commons-helpers.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'data', 'photo-sources.json')
const secretPath = join(root, 'server', 'data', 'challenges.secret.json')

const REQUIRED_PHOTO = [
  'commonsPageUrl',
  'originalFileUrl',
  'author',
  'license',
  'licenseUrl',
  'modifications',
  'retrievedAt',
  'photoLat',
  'photoLng',
  'distanceKm',
]

export const MAX_DISTANCE_KM = 25
export const DISTANCE_TOLERANCE_KM = 0.5

const IDS = Array.from({ length: 25 }, (_, i) => `aad-${String(i + 1).padStart(2, '0')}`)

/** @param {Record<string, { lat: number, lng: number }>} challengeCoords */
export function validatePhotoManifest(manifest, challengeCoords) {
  const errors = []
  for (const id of IDS) {
    const entry = manifest[id]
    if (!entry || typeof entry !== 'object') {
      errors.push(`missing entry for ${id}`)
      continue
    }
    const status = entry.status
    if (status === 'svg') {
      if (typeof entry.keepSvgReason !== 'string' || !entry.keepSvgReason.trim()) {
        errors.push(`${id}: svg fallback requires keepSvgReason`)
      }
      continue
    }
    if (status !== 'photo') {
      errors.push(`${id}: status must be "photo" or "svg"`)
      continue
    }
    for (const key of REQUIRED_PHOTO) {
      if (entry[key] === undefined || entry[key] === null || entry[key] === '') {
        errors.push(`${id}: missing or empty "${key}"`)
      }
    }
    const coords = challengeCoords[id]
    if (!coords) {
      errors.push(`${id}: no challenge lat/lng in secret dataset`)
      continue
    }
    const photoLat = Number(entry.photoLat)
    const photoLng = Number(entry.photoLng)
    const stored = Number(entry.distanceKm)
    if (!Number.isFinite(photoLat) || !Number.isFinite(photoLng)) {
      errors.push(`${id}: photoLat/photoLng must be numbers`)
      continue
    }
    if (!Number.isFinite(stored)) {
      errors.push(`${id}: distanceKm must be a number`)
      continue
    }
    const recomputed = haversineKm(photoLat, photoLng, coords.lat, coords.lng)
    if (recomputed > MAX_DISTANCE_KM) {
      errors.push(
        `${id}: recomputed distance ${recomputed.toFixed(2)} km exceeds ${MAX_DISTANCE_KM} km gate`,
      )
    }
    if (Math.abs(stored - recomputed) > DISTANCE_TOLERANCE_KM) {
      errors.push(
        `${id}: stored distanceKm ${stored} differs from recomputed ${recomputed.toFixed(2)} km by more than ${DISTANCE_TOLERANCE_KM} km`,
      )
    }
    const webp = join(root, 'public', 'assets', 'photos', `${id}.webp`)
    if (!existsSync(webp)) {
      errors.push(`${id}: expected ${webp}`)
    }
  }
  return errors
}

function fail(msg) {
  console.error(`photo-manifest: ${msg}`)
  process.exit(1)
}

function loadChallengeCoords() {
  if (!existsSync(secretPath)) {
    fail('missing server/data/challenges.secret.json')
  }
  /** @type {Array<{ id: string, lat: number, lng: number }>} */
  const rows = JSON.parse(readFileSync(secretPath, 'utf8'))
  /** @type {Record<string, { lat: number, lng: number }>} */
  const map = {}
  for (const row of rows) {
    if (row.id && row.lat != null && row.lng != null) {
      map[row.id] = { lat: row.lat, lng: row.lng }
    }
  }
  return map
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifestArg = process.argv[2]
  const path = manifestArg ?? manifestPath
  if (!existsSync(path)) {
    fail(`missing ${path}`)
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  const challengeCoords = loadChallengeCoords()
  const errors = validatePhotoManifest(manifest, challengeCoords)
  if (errors.length) {
    for (const e of errors) console.error(`photo-manifest: ${e}`)
    process.exit(1)
  }
  console.log(
    `photo-manifest: OK (${IDS.length} entries, recomputed haversine ≤${MAX_DISTANCE_KM} km, ±${DISTANCE_TOLERANCE_KM} km)`,
  )
}

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { haversineKm } from '../shared/haversine'
import {
  DISTANCE_TOLERANCE_KM,
  MAX_DISTANCE_KM,
  validatePhotoManifest,
} from '../scripts/validate-photo-manifest.mjs'

function challengeCoordsFromSecret() {
  const rows = JSON.parse(
    readFileSync(
      join(process.cwd(), 'server', 'data', 'challenges.secret.json'),
      'utf8',
    ),
  ) as Array<{ id: string; lat: number; lng: number }>
  const map: Record<string, { lat: number; lng: number }> = {}
  for (const row of rows) {
    map[row.id] = { lat: row.lat, lng: row.lng }
  }
  return map
}

describe('validatePhotoManifest', () => {
  it('passes the committed photo-sources.json', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'photo-sources.json'), 'utf8'),
    )
    const errors = validatePhotoManifest(manifest, challengeCoordsFromSecret())
    expect(errors).toEqual([])
  })

  it('fails when aad-14 photo coords are Shimla (31.102, 77.177)', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'photo-sources.json'), 'utf8'),
    )
    const coords = challengeCoordsFromSecret()
    const seoul = coords['aad-14']
    const bad = structuredClone(manifest)
    bad['aad-14'] = {
      ...bad['aad-14'],
      photoLat: 31.102,
      photoLng: 77.177,
      distanceKm: bad['aad-14'].distanceKm,
    }
    const recomputed = haversineKm(31.102, 77.177, seoul.lat, seoul.lng)
    expect(recomputed).toBeGreaterThan(MAX_DISTANCE_KM)
    const errors = validatePhotoManifest(bad, coords)
    expect(
      errors.some(
        (e) =>
          e.includes('aad-14') &&
          (e.includes('exceeds') || e.includes('differs from recomputed')),
      ),
    ).toBe(true)
    expect(errors.some((e) => e.includes(String(DISTANCE_TOLERANCE_KM)))).toBe(
      true,
    )
  })
})

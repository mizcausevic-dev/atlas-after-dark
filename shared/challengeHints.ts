export type ClimateBand =
  | 'tropical'
  | 'subtropical'
  | 'mid-latitude'
  | 'high-latitude'

export type LightTemp = 'warm' | 'cool' | 'mixed'

export type LatLngBox = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export type RegionBand = {
  /** Stable id for tests */
  id: string
  hint: string
  boxes: LatLngBox[]
}

/** Order: first matching box wins (boxes are non-overlapping across bands). */
export const REGION_BANDS: RegionBand[] = [
  {
    id: 'north-pacific-rim-americas',
    hint: 'Regional context: North Pacific rim (Americas).',
    boxes: [{ minLat: 48, maxLat: 62.5, minLng: -152, maxLng: -122 }],
  },
  {
    id: 'east-asia-mid',
    hint: 'Regional context: East Asia (mid-latitude).',
    boxes: [{ minLat: 34.5, maxLat: 38.5, minLng: 126, maxLng: 140 }],
  },
  {
    id: 'tropical-asia',
    hint: 'Regional context: Tropical Asia.',
    boxes: [{ minLat: 0, maxLat: 23, minLng: 72, maxLng: 115 }],
  },
  {
    id: 'australia-nz',
    hint: 'Regional context: Australia and New Zealand.',
    boxes: [{ minLat: -42, maxLat: -33, minLng: 150, maxLng: 176 }],
  },
  {
    id: 'sub-saharan-africa',
    hint: 'Regional context: Sub-Saharan Africa.',
    boxes: [
      { minLat: -2.5, maxLat: 0.5, minLng: 35, maxLng: 38 },
      { minLat: -35.5, maxLat: -33, minLng: 17, maxLng: 20 },
    ],
  },
  {
    id: 'north-africa-middle-east',
    hint: 'Regional context: North Africa and Middle East.',
    boxes: [{ minLat: 24, maxLat: 32.5, minLng: -10, maxLng: 56 }],
  },
  {
    id: 'europe-mid',
    hint: 'Regional context: Europe (mid-latitude).',
    boxes: [{ minLat: 40.5, maxLat: 52, minLng: -2, maxLng: 29 }],
  },
  {
    id: 'nordic-north-atlantic',
    hint: 'Regional context: Nordic and North Atlantic.',
    boxes: [{ minLat: 58.5, maxLat: 65, minLng: -22, maxLng: 19 }],
  },
  {
    id: 'americas-atlantic',
    hint: 'Regional context: Americas, Atlantic side.',
    boxes: [
      { minLat: 39.5, maxLat: 41.5, minLng: -75.5, maxLng: -73.5 },
      { minLat: -35.5, maxLat: -34, minLng: -59, maxLng: -57.5 },
    ],
  },
  {
    id: 'tropical-pacific-basin',
    hint: 'Regional context: Tropical Pacific basin.',
    boxes: [{ minLat: -13, maxLat: 22, minLng: -160, maxLng: -77 }],
  },
]

export function pointInBox(lat: number, lng: number, box: LatLngBox): boolean {
  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lng >= box.minLng &&
    lng <= box.maxLng
  )
}

export function regionBandForPoint(lat: number, lng: number): RegionBand | null {
  for (const band of REGION_BANDS) {
    for (const box of band.boxes) {
      if (pointInBox(lat, lng, box)) return band
    }
  }
  return null
}

export function regionHintText(lat: number, lng: number): string {
  const band = regionBandForPoint(lat, lng)
  if (!band) {
    throw new Error(`No region band for (${lat}, ${lng})`)
  }
  return band.hint
}

export function climateBandFromLat(lat: number): ClimateBand {
  const absLat = Math.abs(lat)
  if (absLat < 23.5) return 'tropical'
  if (absLat < 35) return 'subtropical'
  if (absLat < 55) return 'mid-latitude'
  return 'high-latitude'
}

export function climateHintText(lat: number): string {
  const band = climateBandFromLat(lat)
  const label =
    band === 'tropical'
      ? 'Tropical'
      : band === 'subtropical'
        ? 'Subtropical'
        : band === 'mid-latitude'
          ? 'Mid-latitude'
          : 'High-latitude'
  return `Climate band: ${label} feel.`
}

export function regionContradictsClimate(
  regionText: string,
  band: ClimateBand,
): boolean {
  const lower = regionText.toLowerCase()
  if (band === 'tropical' || band === 'subtropical') {
    if (lower.includes('mid-latitude')) return true
    if (band === 'tropical' && lower.includes('high-latitude')) return true
  }
  if (band === 'high-latitude' && lower.includes('tropical')) return true
  if (band === 'mid-latitude' && lower.includes('tropical')) return true
  return false
}

export function paletteHueFromScene(light: LightTemp, band: ClimateBand): number {
  const table: Record<ClimateBand, Record<LightTemp, number>> = {
    tropical: { warm: 28, cool: 172, mixed: 32 },
    subtropical: { warm: 36, cool: 188, mixed: 40 },
    'mid-latitude': { warm: 42, cool: 205, mixed: 48 },
    'high-latitude': { warm: 218, cool: 228, mixed: 222 },
  }
  return table[band][light] ?? 210
}

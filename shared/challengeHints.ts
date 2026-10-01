export type ClimateBand =
  | 'tropical'
  | 'subtropical'
  | 'mid-latitude'
  | 'high-latitude'

export type LightTemp = 'warm' | 'cool' | 'mixed'

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

export function regionHintText(lat: number, lng: number): string {
  const absLat = Math.abs(lat)

  if (lng >= -170 && lng <= -115 && lat >= 45) {
    return 'Regional context: North Pacific rim (Americas).'
  }

  if (absLat >= 55 && lng >= -25 && lng <= 35) {
    return 'Regional context: High-latitude North Atlantic Europe.'
  }

  if (
    absLat >= 35 &&
    absLat < 55 &&
    ((lng >= 120 && lng <= 145) || (lng >= 160 && lng <= 180))
  ) {
    return 'Regional context: East Asia and Southwest Pacific (mid-latitude).'
  }

  if (lng >= -85 && lng <= -35 && absLat >= 30) {
    return 'Regional context: Americas Atlantic coast (north and south).'
  }

  if (absLat >= 35 && absLat < 55 && lng >= -10 && lng <= 45) {
    return 'Regional context: Europe (mid-latitude).'
  }

  if (lat >= 0 && absLat >= 20 && absLat < 35 && lng >= -12 && lng <= 60) {
    return 'Regional context: North Africa and Middle East (subtropical).'
  }

  if (
    absLat >= 23.5 &&
    absLat < 40 &&
    ((lng >= -65 && lng <= -45) ||
      (lng >= 15 && lng <= 35) ||
      (lng >= 145 && lng <= 155))
  ) {
    return 'Regional context: Southern subtropical coasts (Atlantic, Indian, and Pacific).'
  }

  if (absLat < 25 && lng >= 35 && lng <= 125) {
    return 'Regional context: South and Southeast Asia (tropical).'
  }

  if (absLat < 25 && lng >= -170 && lng <= -70) {
    return 'Regional context: Pacific Americas (tropical).'
  }

  return 'Regional context: Broad continental belt (check hemisphere and coast).'
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

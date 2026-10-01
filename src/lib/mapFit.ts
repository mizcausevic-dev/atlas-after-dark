export type LatLng = { lat: number; lng: number }

/** Shift guess longitude by ±360° so the segment to target crosses the dateline the short way. */
export function shiftGuessLngForDisplay(guess: LatLng, target: LatLng): LatLng {
  let glng = guess.lng
  const tlng = target.lng
  const gap = Math.abs(glng - tlng)
  if (gap > 180) {
    glng += glng > tlng ? -360 : 360
  }
  return { lat: guess.lat, lng: glng }
}

const SAFETY = 1.35

/**
 * Lowest minZoom (most zoomed-out floor) so fitBounds can frame the bounds in a narrow container.
 * Leaflet world width at zoom z is 256·2^z px (360° longitude).
 */
export function computeResultMinZoom(
  mapWidthPx: number,
  mapHeightPx: number,
  north: number,
  south: number,
  east: number,
  west: number,
  paddingPx: number,
): number {
  const w = Math.max(mapWidthPx - paddingPx * 2, 48)
  const h = Math.max(mapHeightPx - paddingPx * 2, 48)
  const latSpan = Math.max(Math.abs(north - south) * SAFETY, 0.25)
  let lngSpan = Math.abs(east - west)
  if (lngSpan > 180) lngSpan = 360 - lngSpan
  lngSpan = Math.max(lngSpan * SAFETY, 0.25)

  const zLng = Math.log2((w * 360) / (256 * lngSpan))
  const zLat = Math.log2((h * 170) / (256 * latSpan))
  const zMax = Math.min(zLng, zLat)
  if (!Number.isFinite(zMax)) return 0
  const minZ = Math.floor(zMax)
  return Math.max(0, Math.min(2, minZ))
}

import { describe, expect, it } from 'vitest'
import { computeResultMinZoom, shiftGuessLngForDisplay } from './mapFit'

describe('shiftGuessLngForDisplay', () => {
  it('shifts east guess when target is Honolulu and guess is ~150°E', () => {
    const guess = { lat: 20, lng: 150 }
    const target = { lat: 21.3069, lng: -157.8583 }
    const d = shiftGuessLngForDisplay(guess, target)
    expect(Math.abs(d.lng - target.lng)).toBeLessThan(180)
    expect(d.lng).toBe(-210)
  })

  it('leaves nearby longitudes unchanged', () => {
    const guess = { lat: 20, lng: 10 }
    const target = { lat: 40, lng: -74 }
    expect(shiftGuessLngForDisplay(guess, target)).toEqual(guess)
  })
})

describe('computeResultMinZoom', () => {
  it('returns 0 or 1 for a narrow phone-width map and wide longitude span', () => {
    const z = computeResultMinZoom(293, 280, 40, 20, -74, 10, 24)
    expect(z).toBeLessThanOrEqual(1)
  })
})

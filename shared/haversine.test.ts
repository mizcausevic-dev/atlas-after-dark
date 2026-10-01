import { describe, expect, it } from 'vitest'
import { haversineKm } from './haversine'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(40, -74, 40, -74)).toBe(0)
  })

  it('handles antipodal-adjacent dateline crossing', () => {
    const km = haversineKm(0, 179, 0, -179)
    expect(km).toBeGreaterThan(200)
    expect(km).toBeLessThan(250)
  })

  it('handles near-pole points without NaN', () => {
    const km = haversineKm(89.9, 0, 89.9, 90)
    expect(Number.isFinite(km)).toBe(true)
    expect(km).toBeGreaterThan(0)
    expect(km).toBeLessThan(120)
  })

  it('matches known NYC to London ballpark', () => {
    const km = haversineKm(40.7128, -74.006, 51.5074, -0.1278)
    expect(km).toBeGreaterThan(5500)
    expect(km).toBeLessThan(5600)
  })
})

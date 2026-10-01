import { describe, expect, it } from 'vitest'
import {
  MAX_SCORE,
  computeScore,
  DISTANCE_DECAY_D,
} from './scoring'

describe('computeScore', () => {
  it('a 10,000 km guess with fast time scores under 100', () => {
    const { breakdown } = computeScore(0, 0, 0, 90, 0, 5_000, 'daily')
    expect(breakdown.finalScore).toBeLessThan(100)
  })

  it('1,000 km on Daily scores meaningfully (over 2,000)', () => {
    const { breakdown } = computeScore(0, 0, 9, 0, 0, 120_000, 'daily')
    expect(breakdown.distanceScore).toBeGreaterThan(2_000)
  })

  it('Night Owl is stricter than Daily at the same distance', () => {
    const daily = computeScore(0, 0, 5, 0, 0, 120_000, 'daily')
    const owl = computeScore(0, 0, 5, 0, 0, 120_000, 'night-owl')
    expect(owl.breakdown.distanceScore).toBeLessThan(
      daily.breakdown.distanceScore,
    )
  })

  it('perfect fast guess equals MAX_SCORE', () => {
    const { breakdown } = computeScore(35, 139, 35, 139, 0, 0, 'daily')
    expect(breakdown.distanceScore).toBe(5000)
    expect(breakdown.timeBonus).toBe(MAX_SCORE - 5000 - 500)
    expect(breakdown.bullseyeBonus).toBe(500)
    expect(breakdown.finalScore).toBe(MAX_SCORE)
  })

  it('time bonus scales with accuracy', () => {
    const accurate = computeScore(0, 0, 0.1, 0, 0, 10_000, 'daily')
    const wild = computeScore(0, 0, 40, 0, 0, 10_000, 'daily')
    expect(accurate.breakdown.timeBonus).toBeGreaterThan(
      wild.breakdown.timeBonus,
    )
  })

  it('exports decay constants per mode', () => {
    expect(DISTANCE_DECAY_D.daily).toBe(1500)
    expect(DISTANCE_DECAY_D['night-owl']).toBeLessThan(DISTANCE_DECAY_D.rookie)
  })
})

import { describe, expect, it } from 'vitest'
import { computeScore } from './scoring'

describe('computeScore', () => {
  it('applies hint penalty and time bonus', () => {
    const { breakdown } = computeScore(0, 0, 0, 1, 2, 30_000, 'daily')
    expect(breakdown.hintPenalty).toBe(1300)
    expect(breakdown.timeBonus).toBeGreaterThan(0)
    expect(breakdown.finalScore).toBeLessThanOrEqual(10_000)
  })

  it('awards bullseye bonus within 50 meters', () => {
    const { breakdown, distanceKm } = computeScore(35, 139, 35.0003, 139.0003, 0, 60_000, 'daily')
    expect(distanceKm).toBeLessThan(0.05)
    expect(breakdown.bullseyeBonus).toBe(500)
  })

  it('uses stricter multiplier in night-owl mode', () => {
    const daily = computeScore(0, 0, 1, 0, 0, 120_000, 'daily')
    const owl = computeScore(0, 0, 1, 0, 0, 120_000, 'night-owl')
    expect(owl.breakdown.distanceScore).toBeLessThan(daily.breakdown.distanceScore)
  })
})

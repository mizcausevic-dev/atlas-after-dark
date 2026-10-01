import { describe, expect, it } from 'vitest'
import { dailyChallengeIndex, hashString } from './dailySeed'

describe('dailyChallengeIndex', () => {
  it('is stable for the same date and mode', () => {
    const a = dailyChallengeIndex('2026-10-01', 'daily', 25)
    const b = dailyChallengeIndex('2026-10-01', 'daily', 25)
    expect(a).toBe(b)
  })

  it('changes when mode changes', () => {
    const daily = dailyChallengeIndex('2026-10-01', 'daily', 25)
    const rookie = dailyChallengeIndex('2026-10-01', 'rookie', 25)
    expect(daily).not.toBe(rookie)
  })

  it('hashString is deterministic', () => {
    expect(hashString('atlas-after-dark')).toBe(hashString('atlas-after-dark'))
  })
})

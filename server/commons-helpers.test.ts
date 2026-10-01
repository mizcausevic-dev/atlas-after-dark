import { describe, expect, it } from 'vitest'
import {
  categoriesRejected,
  titleRejected,
} from '../scripts/commons-helpers.mjs'

describe('titleRejected', () => {
  it('blocks iconic landmark titles', () => {
    expect(titleRejected('Sydney Harbour Bridge at night', 'Sydney', 'Australia')).toMatch(
      /landmark/i,
    )
  })

  it('blocks election and party wording', () => {
    expect(titleRejected('Election night rally downtown', 'Paris', 'France')).toMatch(
      /election/i,
    )
  })

  it('allows a neutral night street title', () => {
    expect(titleRejected('Neon alley after rain', 'Tokyo', 'Japan')).toBeNull()
  })
})

describe('categoriesRejected', () => {
  it('blocks black and white categories', () => {
    expect(
      categoriesRejected(['Category:Black-and-white photographs'], 'Street at night'),
    ).toMatch(/black and white/i)
  })

  it('blocks pre-1990 year hints in categories', () => {
    expect(
      categoriesRejected(['Category:Night in Paris'], 'Night view 1984'),
    ).toMatch(/pre-1990/i)
  })

  it('blocks daylight-only categories without night', () => {
    expect(
      categoriesRejected(['Category:Daytime in Singapore'], 'Downtown scene'),
    ).toMatch(/daylight/i)
  })
})

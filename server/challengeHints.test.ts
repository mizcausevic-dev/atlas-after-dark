// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  climateHintText,
  regionContradictsClimate,
  climateBandFromLat,
} from '../shared/challengeHints.ts'

const secretPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'data',
  'challenges.secret.json',
)

type Challenge = {
  id: string
  lat: number
  lng: number
  hintTexts: [string, string, string]
  clueTexts: [string, string, string]
}

describe('challenge hint/clue separation', () => {
  it('no hint text appears verbatim in that challenge clueTexts', () => {
    const pool = JSON.parse(readFileSync(secretPath, 'utf8')) as Challenge[]
    for (const c of pool) {
      for (const hint of c.hintTexts) {
        const normalized = hint.trim().toLowerCase()
        for (const clue of c.clueTexts) {
          expect(clue.trim().toLowerCase()).not.toBe(normalized)
          expect(clue.toLowerCase().includes(normalized)).toBe(false)
        }
      }
      expect(c.hintTexts[2]).toMatch(/^Regional context:/)
    }
  })
})

describe('challenge hint latitude rules', () => {
  it('hint 2 matches climate band from latitude for all 25', () => {
    const pool = JSON.parse(readFileSync(secretPath, 'utf8')) as Challenge[]
    for (const c of pool) {
      expect(c.hintTexts[1]).toBe(climateHintText(c.lat))
      const band = climateBandFromLat(c.lat)
      expect(regionContradictsClimate(c.hintTexts[2], band)).toBe(false)
    }
  })

  it('each hint-3 region band covers at least two cities', () => {
    const pool = JSON.parse(readFileSync(secretPath, 'utf8')) as Challenge[]
    const counts = new Map<string, number>()
    for (const c of pool) {
      const key = c.hintTexts[2]
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const [region, n] of counts) {
      expect(n, region).toBeGreaterThanOrEqual(2)
    }
    for (const c of pool) {
      expect(c.hintTexts[2]).not.toMatch(/Broad continental belt/)
    }
  })
})

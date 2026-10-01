// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const secretPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'data',
  'challenges.secret.json',
)

type Challenge = {
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

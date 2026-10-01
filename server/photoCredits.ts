import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PhotoCredit } from '../shared/types.ts'

const manifestPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'photo-sources.json',
)

let cache: Record<string, PhotoCredit> | null = null

function loadManifest(): Record<string, unknown> {
  if (!existsSync(manifestPath)) return {}
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

export function photoCreditForChallenge(challengeId: string): PhotoCredit | null {
  if (!cache) {
    cache = {}
    const manifest = loadManifest()
    for (const [id, entry] of Object.entries(manifest)) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, string>
      if (e.status !== 'photo') continue
      cache[id] = {
        author: e.author,
        license: e.license,
        licenseUrl: e.licenseUrl,
        commonsPageUrl: e.commonsPageUrl,
        modified: true,
        modifications: e.modifications,
      }
    }
  }
  return cache[challengeId] ?? null
}

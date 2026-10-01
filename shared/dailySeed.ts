import type { DifficultyMode } from './types.ts'

/** FNV-1a 32-bit hash for stable daily index. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function dailyChallengeIndex(
  dateIso: string,
  mode: DifficultyMode,
  poolSize: number,
): number {
  if (poolSize <= 0) {
    return 0
  }
  const key = `${dateIso}|${mode}|atlas-after-dark-v1`
  return hashString(key) % poolSize
}

export function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

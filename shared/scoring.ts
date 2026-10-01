import type { DifficultyMode } from './types.ts'
import { haversineKm } from './haversine.ts'

const MULTIPLIER: Record<DifficultyMode, number> = {
  rookie: 18,
  daily: 25,
  'night-owl': 32,
}

export type ScoreBreakdown = {
  distanceScore: number
  timeBonus: number
  hintPenalty: number
  bullseyeBonus: number
  finalScore: number
}

export function distanceMultiplier(mode: DifficultyMode): number {
  return MULTIPLIER[mode]
}

export function computeScore(
  guessLat: number,
  guessLng: number,
  targetLat: number,
  targetLng: number,
  hintsUsed: number,
  elapsedMs: number,
  mode: DifficultyMode,
): { distanceKm: number; breakdown: ScoreBreakdown } {
  const distanceKm = haversineKm(guessLat, guessLng, targetLat, targetLng)
  const M = MULTIPLIER[mode]

  const distanceScore = Math.max(0, Math.round(5000 - distanceKm * M))
  const timeBonus = Math.max(
    0,
    Math.min(800, Math.floor((120_000 - elapsedMs) / 150)),
  )
  const hintPenalty = Math.min(3, Math.max(0, hintsUsed)) * 650
  const bullseyeBonus = distanceKm <= 0.05 ? 500 : 0

  const raw = distanceScore + timeBonus - hintPenalty + bullseyeBonus
  const finalScore = Math.max(0, Math.min(10_000, raw))

  return {
    distanceKm,
    breakdown: {
      distanceScore,
      timeBonus,
      hintPenalty,
      bullseyeBonus,
      finalScore,
    },
  }
}

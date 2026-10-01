import type { DifficultyMode } from './types.ts'
import { haversineKm } from './haversine.ts'

/** Exponential decay scale D (km) per mode for distanceScore = 5000 * exp(-km / D). */
export const DISTANCE_DECAY_D: Record<DifficultyMode, number> = {
  rookie: 2000,
  daily: 1500,
  'night-owl': 1000,
}

export const MAX_TIME_BONUS = 800
export const MAX_DISTANCE_SCORE = 5000
export const MAX_BULLSEYE_BONUS = 500
export const MAX_SCORE =
  MAX_DISTANCE_SCORE + MAX_TIME_BONUS + MAX_BULLSEYE_BONUS

export type ScoreBreakdown = {
  distanceScore: number
  timeBonus: number
  hintPenalty: number
  bullseyeBonus: number
  finalScore: number
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
  const D = DISTANCE_DECAY_D[mode]

  const distanceScore = Math.max(
    0,
    Math.round(MAX_DISTANCE_SCORE * Math.exp(-distanceKm / D)),
  )
  const timeBonusRaw = Math.max(
    0,
    Math.min(MAX_TIME_BONUS, Math.floor((120_000 - elapsedMs) / 150)),
  )
  const timeBonus = Math.floor(
    timeBonusRaw * (distanceScore / MAX_DISTANCE_SCORE),
  )
  const hintPenalty = Math.min(3, Math.max(0, hintsUsed)) * 650
  const bullseyeBonus = distanceKm <= 0.05 ? MAX_BULLSEYE_BONUS : 0

  const raw = distanceScore + timeBonus - hintPenalty + bullseyeBonus
  const finalScore = Math.max(0, Math.min(MAX_SCORE, raw))

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

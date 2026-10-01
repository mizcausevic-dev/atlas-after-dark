import fixture from '../data/challenges.fixture.json'
import {
  dailyChallengeIndex,
  utcDateString,
} from '../../shared/dailySeed'
import type { ChallengePublic, DifficultyMode } from '../../shared/types'
import type { GuessRequest, GuessResponse } from '../../shared/types'
import { computeScore } from '../../shared/scoring'

/** Offline solo path when API unreachable — uses public fixture only; scoring needs target coords from bundled answer map (demo trust-on-client). */
import answerMap from '../data/challenges.offline-answers.json'

type AnswerEntry = { lat: number; lng: number; city: string; country: string }

export function getOfflineDaily(
  mode: DifficultyMode,
  date = utcDateString(),
): { date: string; mode: DifficultyMode; index: number; challenge: ChallengePublic } {
  const pool = fixture as ChallengePublic[]
  const index = dailyChallengeIndex(date, mode, pool.length)
  const challenge = pool[index]
  if (!challenge) {
    throw new Error('Empty offline challenge pool')
  }
  return { date, mode, index, challenge }
}

export function scoreOfflineGuess(payload: GuessRequest): GuessResponse {
  const answers = answerMap as Record<string, AnswerEntry>
  const target = answers[payload.challengeId]
  if (!target) {
    throw new Error('Unknown challenge')
  }
  const publicPool = fixture as ChallengePublic[]
  const pub = publicPool.find((c) => c.id === payload.challengeId)
  const { distanceKm, breakdown } = computeScore(
    payload.lat,
    payload.lng,
    target.lat,
    target.lng,
    payload.hintsUsed,
    payload.elapsedMs,
    payload.mode,
  )
  return {
    city: target.city,
    country: target.country,
    target: { lat: target.lat, lng: target.lng },
    guess: { lat: payload.lat, lng: payload.lng },
    distanceKm,
    score: breakdown.finalScore,
    scoreBreakdown: breakdown,
    clueTexts: pub?.clueTexts ?? ['—', '—', '—'],
  }
}

export type DifficultyMode = 'rookie' | 'daily' | 'night-owl'

export type ChallengePublic = {
  id: string
  imagePath: string
  title: string
  hintTexts: [string, string, string]
  clueTexts: [string, string, string]
}

/** Server /api/daily challenge payload (no spoilers). */
export type ChallengeDailyPublic = {
  id: string
  imagePath: string
  title: string
  hintCount: number
}

export type DailyStartResponse = {
  date: string
  mode: DifficultyMode
  index: number
  token: string
  challenge: ChallengeDailyPublic
}

export type ServerGuessRequest = {
  token: string
  lat: number
  lng: number
}

export type HintRequest = {
  token: string
  index: number
}

export type HintResponse = {
  index: number
  text: string
  hintsUsed: number
}

export type ChallengeSecret = ChallengePublic & {
  city: string
  country: string
  lat: number
  lng: number
  source: string
  license: string
  attribution: string
}

export type GuessRequest = {
  challengeId: string
  lat: number
  lng: number
  hintsUsed: number
  elapsedMs: number
  mode: DifficultyMode
}

export type GuessResponse = {
  city: string
  country: string
  target: { lat: number; lng: number }
  guess: { lat: number; lng: number }
  distanceKm: number
  score: number
  scoreBreakdown: {
    distanceScore: number
    timeBonus: number
    hintPenalty: number
    bullseyeBonus: number
    finalScore: number
  }
  clueTexts: [string, string, string]
}

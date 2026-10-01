export type DifficultyMode = 'rookie' | 'daily' | 'night-owl'

export type ChallengePublic = {
  id: string
  imagePath: string
  title: string
  hintTexts: [string, string, string]
  clueTexts: [string, string, string]
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

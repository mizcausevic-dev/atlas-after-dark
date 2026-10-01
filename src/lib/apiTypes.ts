import type { ChallengePublic, DifficultyMode } from '../../shared/types.ts'

export type DailyPayload = {
  date: string
  mode: DifficultyMode
  index: number
  challenge: ChallengePublic
}

import type {
  ChallengeDailyPublic,
  ChallengePublic,
  DifficultyMode,
} from '../../shared/types.ts'

export type DailyPayload = {
  date: string
  mode: DifficultyMode
  index: number
  token?: string
  challenge: ChallengePublic | ChallengeDailyPublic
}

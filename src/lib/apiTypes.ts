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
  practice?: boolean
  challenge: ChallengePublic | ChallengeDailyPublic
}

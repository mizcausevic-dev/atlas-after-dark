import type { DifficultyMode, GuessRequest, GuessResponse } from '../../shared/types.ts'
import { fetchDailyOnline, submitGuessOnline } from './apiOnline.ts'
import type { DailyPayload } from './apiTypes.ts'
import { getOfflineDaily, scoreOfflineGuess } from './offlineDaily.ts'

export type { DailyPayload } from './apiTypes.ts'

export function isOfflineClient(): boolean {
  return __AAD_OFFLINE__
}

export async function fetchDaily(
  mode: DifficultyMode,
  date: string,
): Promise<DailyPayload> {
  if (__AAD_OFFLINE__) {
    return getOfflineDaily(mode, date)
  }
  return fetchDailyOnline(mode, date)
}

export async function submitGuess(body: GuessRequest): Promise<GuessResponse> {
  if (__AAD_OFFLINE__) {
    return scoreOfflineGuess(body)
  }
  return submitGuessOnline(body)
}

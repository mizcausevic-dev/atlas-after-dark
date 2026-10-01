import type { GuessResponse, ServerGuessRequest } from '../../shared/types.ts'
import type { DifficultyMode } from '../../shared/types.ts'
import {
  fetchDailyOnline,
  revealHintOnline,
  submitGuessOnline,
} from './apiOnline.ts'
import type { DailyPayload } from './apiTypes.ts'
import { getOfflineDaily, scoreOfflineGuess } from './offlineDaily.ts'
import type { GuessRequest } from '../../shared/types.ts'

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

export async function revealHint(
  token: string,
  index: number,
): Promise<{ text: string; hintsUsed: number }> {
  if (__AAD_OFFLINE__) {
    throw new Error('revealHint token API is server-only')
  }
  const res = await revealHintOnline(token, index)
  return { text: res.text, hintsUsed: res.hintsUsed }
}

export async function submitGuess(
  body: GuessRequest | ServerGuessRequest,
): Promise<GuessResponse> {
  if (__AAD_OFFLINE__) {
    return scoreOfflineGuess(body as GuessRequest)
  }
  return submitGuessOnline(body as ServerGuessRequest)
}

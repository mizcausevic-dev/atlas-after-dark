import type {
  DifficultyMode,
  GuessRequest,
  GuessResponse,
} from '../../shared/types.ts'
import type { DailyPayload } from './apiTypes.ts'

export async function fetchDailyOnline(
  mode: DifficultyMode,
  date: string,
): Promise<DailyPayload> {
  const res = await fetch(
    `/api/daily?mode=${encodeURIComponent(mode)}&date=${encodeURIComponent(date)}`,
  )
  if (!res.ok) {
    throw new Error(`Daily fetch failed (${res.status})`)
  }
  return res.json() as Promise<DailyPayload>
}

export async function submitGuessOnline(
  body: GuessRequest,
): Promise<GuessResponse> {
  const res = await fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Guess failed (${res.status})`)
  }
  return res.json() as Promise<GuessResponse>
}

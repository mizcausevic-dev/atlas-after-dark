import type {
  DailyStartResponse,
  GuessResponse,
  HintResponse,
  ServerGuessRequest,
} from '../../shared/types.ts'
import type { DifficultyMode } from '../../shared/types.ts'
import type { DailyPayload } from './apiTypes.ts'

export async function fetchDailyOnline(
  mode: DifficultyMode,
  date: string,
): Promise<DailyPayload> {
  const res = await fetch(
    `/api/daily?mode=${encodeURIComponent(mode)}&date=${encodeURIComponent(date)}`,
  )
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Daily fetch failed (${res.status})`)
  }
  const data = (await res.json()) as DailyStartResponse
  return {
    date: data.date,
    mode: data.mode,
    index: data.index,
    token: data.token,
    challenge: data.challenge,
  }
}

export async function revealHintOnline(
  token: string,
  index: number,
): Promise<HintResponse> {
  const res = await fetch('/api/hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, index }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Hint failed (${res.status})`)
  }
  return res.json() as Promise<HintResponse>
}

export async function submitGuessOnline(
  body: ServerGuessRequest,
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

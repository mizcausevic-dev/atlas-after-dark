import type { DifficultyMode, GuessResponse } from '../../shared/types'

export type UserSettings = {
  mode: DifficultyMode
  highContrast: boolean
  reducedMotion: boolean
}

export type LocalProgress = {
  lastPlayedDate: string | null
  streak: number
  bestByMode: Partial<Record<DifficultyMode, number>>
}

export type ScoredAttempt = {
  date: string
  mode: DifficultyMode
  challengeId: string
  result: GuessResponse
}

const SETTINGS_KEY = 'aad_settings_v1'
const PROGRESS_KEY = 'aad_progress_v1'
const ATTEMPTS_KEY = 'aad_scored_attempts_v1'

function prefersReducedMotionDefault(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const defaultSettings: UserSettings = {
  mode: 'daily',
  highContrast: false,
  reducedMotion: prefersReducedMotionDefault(),
}

const defaultProgress: LocalProgress = {
  lastPlayedDate: null,
  streak: 0,
  bestByMode: {},
}

export function attemptKey(date: string, mode: DifficultyMode): string {
  return `${date}|${mode}`
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaultSettings }
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: UserSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* private mode / quota */
  }
}

export function loadProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { ...defaultProgress, bestByMode: {} }
    return { ...defaultProgress, ...JSON.parse(raw) }
  } catch {
    return { ...defaultProgress, bestByMode: {} }
  }
}

export function saveProgress(progress: LocalProgress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* private mode / quota */
  }
}

export function loadScoredAttempt(
  date: string,
  mode: DifficultyMode,
): ScoredAttempt | null {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, ScoredAttempt>
    return map[attemptKey(date, mode)] ?? null
  } catch {
    return null
  }
}

export function saveScoredAttempt(record: ScoredAttempt) {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, ScoredAttempt>) : {}
    map[attemptKey(record.date, record.mode)] = record
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(map))
  } catch {
    /* private mode / quota */
  }
}

export function recordScore(
  progress: LocalProgress,
  date: string,
  mode: DifficultyMode,
  score: number,
): LocalProgress {
  const next = { ...progress, bestByMode: { ...progress.bestByMode } }
  const prevBest = next.bestByMode[mode] ?? 0
  if (score > prevBest) {
    next.bestByMode[mode] = score
  }
  if (next.lastPlayedDate === date) {
    return next
  }
  const yesterday = new Date(date)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const y = yesterday.toISOString().slice(0, 10)
  next.streak = next.lastPlayedDate === y ? next.streak + 1 : 1
  next.lastPlayedDate = date
  return next
}

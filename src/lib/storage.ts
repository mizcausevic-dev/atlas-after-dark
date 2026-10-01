import type { DifficultyMode } from '../../shared/types'

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

const SETTINGS_KEY = 'aad_settings_v1'
const PROGRESS_KEY = 'aad_progress_v1'

const defaultSettings: UserSettings = {
  mode: 'daily',
  highContrast: false,
  reducedMotion: false,
}

const defaultProgress: LocalProgress = {
  lastPlayedDate: null,
  streak: 0,
  bestByMode: {},
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
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
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
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DifficultyMode, GuessResponse } from '../../shared/types'
import { utcDateString } from '../../shared/dailySeed'
import { fetchDaily, isOfflineClient, submitGuess } from '../lib/api'
import type { ChallengePublic } from '../../shared/types'
import {
  loadProgress,
  loadSettings,
  recordScore,
  saveProgress,
  saveSettings,
  type UserSettings,
} from '../lib/storage'

export type GamePhase = 'title' | 'playing' | 'result'

export function useGameSession() {
  const offline = isOfflineClient()
  const [phase, setPhase] = useState<GamePhase>('title')
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings())
  const [progress, setProgress] = useState(() => loadProgress())
  const [challenge, setChallenge] = useState<ChallengePublic | null>(null)
  const [dailyMeta, setDailyMeta] = useState<{
    date: string
    mode: DifficultyMode
  } | null>(null)
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [revealedHints, setRevealedHints] = useState<boolean[]>([
    false,
    false,
    false,
  ])
  const [result, setResult] = useState<GuessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const startMs = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    if (phase !== 'playing' || startMs.current == null) return
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - (startMs.current ?? Date.now()))
    }, 250)
    return () => window.clearInterval(id)
  }, [phase])

  const startGame = useCallback(async (mode?: DifficultyMode) => {
    setError(null)
    setLoading(true)
    const playMode = mode ?? settings.mode
    const date = utcDateString()
    try {
      const payload = await fetchDaily(playMode, date)
      setChallenge(payload.challenge)
      setDailyMeta({ date, mode: playMode })
      setGuess(null)
      setHintsUsed(0)
      setRevealedHints([false, false, false])
      setResult(null)
      startMs.current = Date.now()
      setElapsedMs(0)
      setPhase('playing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily case')
    } finally {
      setLoading(false)
    }
  }, [settings.mode])

  const revealHint = useCallback(
    (index: number) => {
      if (!challenge || phase !== 'playing') return
      if (revealedHints[index]) return
      setRevealedHints((prev) => {
        const next = [...prev]
        next[index] = true
        return next
      })
      setHintsUsed((h) => Math.min(3, h + 1))
    },
    [challenge, phase, revealedHints],
  )

  const confirmGuess = useCallback(async () => {
    if (!challenge || !guess || !dailyMeta) return
    setLoading(true)
    setError(null)
    try {
      const response = await submitGuess({
        challengeId: challenge.id,
        lat: guess.lat,
        lng: guess.lng,
        hintsUsed,
        elapsedMs,
        mode: dailyMeta.mode,
      })
      setResult(response)
      setPhase('result')
      const nextProgress = recordScore(
        progress,
        dailyMeta.date,
        dailyMeta.mode,
        response.score,
      )
      setProgress(nextProgress)
      saveProgress(nextProgress)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not score guess')
    } finally {
      setLoading(false)
    }
  }, [challenge, guess, dailyMeta, hintsUsed, elapsedMs, progress])

  const restart = useCallback(() => {
    setPhase('title')
    setChallenge(null)
    setResult(null)
    setGuess(null)
    setError(null)
  }, [])

  const timerLabel = useMemo(() => {
    const s = Math.floor(elapsedMs / 1000)
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
  }, [elapsedMs])

  return {
    phase,
    settings,
    setSettings,
    progress,
    challenge,
    dailyMeta,
    guess,
    setGuess,
    hintsUsed,
    revealedHints,
    revealHint,
    result,
    error,
    loading,
    offline,
    startGame,
    confirmGuess,
    restart,
    timerLabel,
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChallengeDailyPublic,
  ChallengePublic,
  DifficultyMode,
  GuessResponse,
} from '../../shared/types'
import { utcDateString } from '../../shared/dailySeed'
import { fetchDaily, isOfflineClient, revealHint, submitGuess } from '../lib/api'
import {
  loadProgress,
  loadScoredAttempt,
  loadSettings,
  recordScore,
  saveProgress,
  saveScoredAttempt,
  saveSettings,
  type UserSettings,
} from '../lib/storage'

export type GamePhase = 'title' | 'playing' | 'result' | 'daily-locked'

const HINT_SLOTS = 3

function isOfflineChallenge(
  c: ChallengePublic | ChallengeDailyPublic,
): c is ChallengePublic {
  return 'hintTexts' in c
}

export function useGameSession() {
  const offline = isOfflineClient()
  const [phase, setPhase] = useState<GamePhase>('title')
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings())
  const [progress, setProgress] = useState(() => loadProgress())
  const [challenge, setChallenge] = useState<
    ChallengePublic | ChallengeDailyPublic | null
  >(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [dailyMeta, setDailyMeta] = useState<{
    date: string
    mode: DifficultyMode
  } | null>(null)
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintTexts, setHintTexts] = useState<(string | null)[]>([
    null,
    null,
    null,
  ])
  const [revealedHints, setRevealedHints] = useState<boolean[]>([
    false,
    false,
    false,
  ])
  const [result, setResult] = useState<GuessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPractice, setIsPractice] = useState(false)
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

  const resetRoundState = useCallback(() => {
    setGuess(null)
    setHintsUsed(0)
    setRevealedHints([false, false, false])
    setHintTexts([null, null, null])
    setResult(null)
    startMs.current = Date.now()
    setElapsedMs(0)
  }, [])

  const applyDailyPayload = useCallback(
    (
      payload: Awaited<ReturnType<typeof fetchDaily>>,
      playMode: DifficultyMode,
      date: string,
    ) => {
      setChallenge(payload.challenge)
      setSessionToken(payload.token ?? null)
      setDailyMeta({ date, mode: playMode })
      resetRoundState()
      if (isOfflineChallenge(payload.challenge)) {
        setHintTexts([...payload.challenge.hintTexts])
      }
    },
    [resetRoundState],
  )

  const startGame = useCallback(async (mode?: DifficultyMode) => {
    setError(null)
    setLoading(true)
    setIsPractice(false)
    const playMode = mode ?? settings.mode
    const date = utcDateString()
    const prior = loadScoredAttempt(date, playMode)
    try {
      const payload = await fetchDaily(playMode, date)
      if (prior) {
        applyDailyPayload(payload, playMode, date)
        setResult(prior.result)
        setPhase('daily-locked')
        return
      }
      applyDailyPayload(payload, playMode, date)
      setPhase('playing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily case')
    } finally {
      setLoading(false)
    }
  }, [settings.mode, applyDailyPayload])

  const startPractice = useCallback(async () => {
    if (!dailyMeta) return
    setError(null)
    setLoading(true)
    setIsPractice(true)
    try {
      const payload = await fetchDaily(dailyMeta.mode, dailyMeta.date)
      applyDailyPayload(payload, dailyMeta.mode, dailyMeta.date)
      setPhase('playing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load practice case')
    } finally {
      setLoading(false)
    }
  }, [dailyMeta, applyDailyPayload])

  const revealHintAt = useCallback(
    async (index: number) => {
      if (!challenge || phase !== 'playing') return
      if (revealedHints[index]) return
      setError(null)
      if (offline) {
        if (!isOfflineChallenge(challenge)) return
        setRevealedHints((prev) => {
          const next = [...prev]
          next[index] = true
          return next
        })
        setHintsUsed((h) => Math.min(HINT_SLOTS, h + 1))
        return
      }
      if (!sessionToken) {
        setError('Missing session token')
        return
      }
      setLoading(true)
      try {
        const res = await revealHint(sessionToken, index)
        setHintTexts((prev) => {
          const next = [...prev]
          next[index] = res.text
          return next
        })
        setRevealedHints((prev) => {
          const next = [...prev]
          next[index] = true
          return next
        })
        setHintsUsed(res.hintsUsed)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reveal hint')
      } finally {
        setLoading(false)
      }
    },
    [challenge, phase, revealedHints, offline, sessionToken],
  )

  const confirmGuess = useCallback(async () => {
    if (!challenge || !guess || !dailyMeta) return
    setLoading(true)
    setError(null)
    try {
      const response = offline
        ? await submitGuess({
            challengeId: challenge.id,
            lat: guess.lat,
            lng: guess.lng,
            hintsUsed,
            elapsedMs,
            mode: dailyMeta.mode,
          })
        : await submitGuess({
            token: sessionToken ?? '',
            lat: guess.lat,
            lng: guess.lng,
          })
      setResult(response)
      setPhase('result')
      if (!isPractice) {
        saveScoredAttempt({
          date: dailyMeta.date,
          mode: dailyMeta.mode,
          challengeId: challenge.id,
          result: response,
        })
        const nextProgress = recordScore(
          progress,
          dailyMeta.date,
          dailyMeta.mode,
          response.score,
        )
        setProgress(nextProgress)
        saveProgress(nextProgress)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not score guess')
    } finally {
      setLoading(false)
    }
  }, [
    challenge,
    guess,
    dailyMeta,
    hintsUsed,
    elapsedMs,
    progress,
    offline,
    sessionToken,
    isPractice,
  ])

  const restart = useCallback(() => {
    setPhase('title')
    setChallenge(null)
    setSessionToken(null)
    setResult(null)
    setGuess(null)
    setError(null)
    setIsPractice(false)
    setDailyMeta(null)
  }, [])

  const timerLabel = useMemo(() => {
    const s = Math.floor(elapsedMs / 1000)
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
  }, [elapsedMs])

  const bestForSelectedMode =
    progress.bestByMode[settings.mode] ?? null

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
    hintTexts,
    hintSlotCount: HINT_SLOTS,
    revealedHints,
    revealHint: revealHintAt,
    result,
    error,
    loading,
    offline,
    isPractice,
    bestForSelectedMode,
    startGame,
    startPractice,
    confirmGuess,
    restart,
    timerLabel,
  }
}

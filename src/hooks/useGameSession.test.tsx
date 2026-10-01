import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameSession } from './useGameSession'
import fixture from '../data/challenges.fixture.json'

vi.mock('../lib/api', () => ({
  isOfflineClient: vi.fn(() => true),
  revealHint: vi.fn(),
  fetchDaily: vi.fn(async (mode: string, date: string) => ({
    date,
    mode,
    index: 0,
    challenge: fixture[0],
  })),
  submitGuess: vi.fn(async () => ({
    city: 'Tokyo',
    country: 'Japan',
    target: { lat: 35.6762, lng: 139.6503 },
    guess: { lat: 35, lng: 139 },
    distanceKm: 75,
    score: 3200,
    scoreBreakdown: {
      distanceScore: 3125,
      timeBonus: 75,
      hintPenalty: 0,
      bullseyeBonus: 0,
      finalScore: 3200,
    },
    clueTexts: ['a', 'b', 'c'],
  })),
}))

describe('useGameSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('transitions title → playing → result and advances timer', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGameSession())

    expect(result.current.phase).toBe('title')

    await act(async () => {
      await result.current.startGame('daily')
    })

    expect(result.current.phase).toBe('playing')

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.timerLabel).toBe('0:01')

    act(() => {
      result.current.setGuess({ lat: 35, lng: 139 })
    })

    await act(async () => {
      await result.current.confirmGuess()
    })

    expect(result.current.phase).toBe('result')
    expect(result.current.result?.score).toBe(3200)
    vi.useRealTimers()
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  PLAYER_COOKIE_NAME,
  resolvePlayerIdFromRequest,
  signPlayerCookie,
  verifyPlayerCookie,
} from './playerCookie.ts'

const secret = 'player-cookie-test-secret'

describe('playerCookie', () => {
  it('rejects tampered cookie value', () => {
    const signed = signPlayerCookie(
      { id: 'abc123456789', issuedAt: Date.now() },
      secret,
    )
    const bad = `${signed.slice(0, -2)}xx`
    expect(verifyPlayerCookie(bad, secret)).toBeNull()
  })

  it('issues new player id when cookie missing', () => {
    const a = resolvePlayerIdFromRequest(undefined, secret, Date.now())
    const b = resolvePlayerIdFromRequest(undefined, secret, Date.now())
    expect(a.isNew).toBe(true)
    expect(b.isNew).toBe(true)
    expect(a.playerId).not.toBe(b.playerId)
  })

  it('reuses id when cookie valid', () => {
    const first = resolvePlayerIdFromRequest(undefined, secret, Date.now())
    const header = `${PLAYER_COOKIE_NAME}=${first.cookieValue}`
    const second = resolvePlayerIdFromRequest(header, secret, Date.now())
    expect(second.isNew).toBe(false)
    expect(second.playerId).toBe(first.playerId)
  })

  it('issues new id when cookie invalid', () => {
    const header = `${PLAYER_COOKIE_NAME}=not.valid`
    const resolved = resolvePlayerIdFromRequest(header, secret, Date.now())
    expect(resolved.isNew).toBe(true)
    expect(verifyPlayerCookie(resolved.cookieValue, secret)).not.toBeNull()
  })
})

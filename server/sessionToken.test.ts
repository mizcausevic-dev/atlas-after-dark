// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createNonce,
  signSession,
  verifySession,
  type SessionPayload,
} from './sessionToken.ts'
import { SESSION_TTL_MS } from './sessionStore.ts'

const secret = 'test-secret-key-for-hmac'

function samplePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    challengeId: 'aad-01',
    mode: 'daily',
    date: '2026-10-01',
    issuedAt: Date.now(),
    nonce: createNonce(),
    playerId: 'player-test-id',
    practice: false,
    ...overrides,
  }
}

describe('sessionToken', () => {
  it('sign/verify round trip', () => {
    const payload = samplePayload()
    const token = signSession(payload, secret)
    const verified = verifySession(token, secret, SESSION_TTL_MS)
    expect(verified?.nonce).toBe(payload.nonce)
    expect(verified?.mode).toBe('daily')
  })

  it('rejects tampered signature', () => {
    const token = signSession(samplePayload(), secret)
    const bad = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(verifySession(bad, secret, SESSION_TTL_MS)).toBeNull()
  })

  it('rejects expired token', () => {
    const payload = samplePayload({ issuedAt: Date.now() - SESSION_TTL_MS - 1 })
    const token = signSession(payload, secret)
    expect(verifySession(token, secret, SESSION_TTL_MS)).toBeNull()
  })

  it('rejects replay with wrong secret', () => {
    const token = signSession(samplePayload(), secret)
    expect(verifySession(token, 'other-secret', SESSION_TTL_MS)).toBeNull()
  })
})

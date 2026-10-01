import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { DifficultyMode } from '../shared/types.ts'

export type SessionPayload = {
  challengeId: string
  mode: DifficultyMode
  date: string
  issuedAt: number
  nonce: string
  playerId: string
  practice: boolean
}

export function createNonce(): string {
  return randomBytes(16).toString('base64url')
}

export function signSession(
  payload: SessionPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(
  token: string,
  secret: string,
  maxAgeMs: number,
  now = Date.now(),
): SessionPayload | null {
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }
  let payload: SessionPayload
  try {
    payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as SessionPayload
  } catch {
    return null
  }
  if (
    typeof payload.challengeId !== 'string' ||
    typeof payload.mode !== 'string' ||
    typeof payload.date !== 'string' ||
    typeof payload.issuedAt !== 'number' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.playerId !== 'string' ||
    typeof payload.practice !== 'boolean' ||
    !Number.isFinite(payload.issuedAt)
  ) {
    return null
  }
  if (now - payload.issuedAt > maxAgeMs || now < payload.issuedAt - 60_000) {
    return null
  }
  return payload
}

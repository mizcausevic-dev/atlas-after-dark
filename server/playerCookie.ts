import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const PLAYER_COOKIE_NAME = 'aad_pid'
/** ~400 days */
export const PLAYER_COOKIE_MAX_AGE_SEC = 34_560_000

export type PlayerCookiePayload = {
  id: string
  issuedAt: number
}

export function createPlayerId(): string {
  return randomBytes(16).toString('base64url')
}

export function signPlayerCookie(
  payload: PlayerCookiePayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyPlayerCookie(
  value: string,
  secret: string,
  maxAgeMs = PLAYER_COOKIE_MAX_AGE_SEC * 1000,
  now = Date.now(),
): PlayerCookiePayload | null {
  const dot = value.indexOf('.')
  if (dot <= 0) return null
  const body = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }
  let payload: PlayerCookiePayload
  try {
    payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as PlayerCookiePayload
  } catch {
    return null
  }
  if (
    typeof payload.id !== 'string' ||
    typeof payload.issuedAt !== 'number' ||
    !Number.isFinite(payload.issuedAt) ||
    payload.id.length < 8
  ) {
    return null
  }
  if (now - payload.issuedAt > maxAgeMs || now < payload.issuedAt - 60_000) {
    return null
  }
  return payload
}

export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const name = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (name) out[name] = value
  }
  return out
}

export function buildPlayerSetCookieHeader(
  value: string,
  secure: boolean,
): string {
  const parts = [
    `${PLAYER_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${PLAYER_COOKIE_MAX_AGE_SEC}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function requestIsSecure(req: {
  headers: IncomingMessageLikeHeaders
  socket?: unknown
}): boolean {
  const proto = req.headers['x-forwarded-proto']
  if (typeof proto === 'string' && proto.split(',')[0]?.trim() === 'https') {
    return true
  }
  const sock = req.socket as { encrypted?: boolean } | undefined
  return Boolean(sock?.encrypted)
}

type IncomingMessageLikeHeaders = {
  cookie?: string
  'x-forwarded-proto'?: string
}

export function resolvePlayerIdFromRequest(
  cookieHeader: string | undefined,
  secret: string,
  now: number,
): { playerId: string; cookieValue: string; isNew: boolean } {
  const cookies = parseCookieHeader(cookieHeader)
  const raw = cookies[PLAYER_COOKIE_NAME]
  if (raw) {
    const verified = verifyPlayerCookie(raw, secret, undefined, now)
    if (verified) {
      const refreshed: PlayerCookiePayload = {
        id: verified.id,
        issuedAt: now,
      }
      return {
        playerId: verified.id,
        cookieValue: signPlayerCookie(refreshed, secret),
        isNew: false,
      }
    }
  }
  const fresh: PlayerCookiePayload = { id: createPlayerId(), issuedAt: now }
  return {
    playerId: fresh.id,
    cookieValue: signPlayerCookie(fresh, secret),
    isNew: true,
  }
}

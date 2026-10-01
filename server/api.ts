import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  dailyChallengeIndex,
} from '../shared/dailySeed.ts'
import { computeScore } from '../shared/scoring.ts'
import type {
  ChallengeSecret,
  DifficultyMode,
  GuessResponse,
} from '../shared/types.ts'
import { photoCreditForChallenge } from './photoCredits.ts'
import { resolveDailyDateParam } from './datePolicy.ts'
import { TokenBucketRateLimit } from './rateLimit.ts'
import {
  SESSION_TTL_MS,
  SessionStore,
  type SessionRecord,
} from './sessionStore.ts'
import {
  buildPlayerSetCookieHeader,
  requestIsSecure,
  resolvePlayerIdFromRequest,
} from './playerCookie.ts'
import { PlayerScoreStore } from './playerScoreStore.ts'
import {
  createNonce,
  signSession,
  verifySession,
  type SessionPayload,
} from './sessionToken.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const secretPath = join(__dirname, 'data', 'challenges.secret.json')

const MODES: DifficultyMode[] = ['rookie', 'daily', 'night-owl']
const MAX_BODY_BYTES = 4096

let challengeCache: ChallengeSecret[] | null = null

export type ApiDeps = {
  sessionSecret: string
  sessionStore: SessionStore
  playerScoreStore: PlayerScoreStore
  rateLimit: TokenBucketRateLimit
  now: () => number
}

export function createDefaultApiDeps(sessionSecret: string): ApiDeps {
  return {
    sessionSecret,
    sessionStore: new SessionStore(SESSION_TTL_MS),
    playerScoreStore: new PlayerScoreStore(),
    rateLimit: new TokenBucketRateLimit(30, 60_000),
    now: () => Date.now(),
  }
}

function loadChallenges(): ChallengeSecret[] {
  if (!challengeCache) {
    challengeCache = JSON.parse(readFileSync(secretPath, 'utf8')) as ChallengeSecret[]
  }
  return challengeCache
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body_too_large'))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseMode(value: string | null): DifficultyMode | null {
  if (value && MODES.includes(value as DifficultyMode)) {
    return value as DifficultyMode
  }
  return null
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  )
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown
    return isPlainObject(v) ? v : null
  } catch {
    return null
  }
}

function requireStringField(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const v = obj[key]
  return typeof v === 'string' ? v : null
}

function requireIntHintIndex(obj: Record<string, unknown>): number | null {
  const v = obj.index
  if (typeof v !== 'number' || !Number.isInteger(v)) return null
  if (v < 0 || v > 2) return null
  return v
}

function requireFiniteNumber(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? '127.0.0.1'
  }
  return req.socket.remoteAddress ?? '127.0.0.1'
}

function loadSessionFromToken(
  token: string,
  deps: ApiDeps,
): { payload: SessionPayload; record: SessionRecord } | null {
  const payload = verifySession(
    token,
    deps.sessionSecret,
    SESSION_TTL_MS,
    deps.now(),
  )
  if (!payload) return null
  const record = deps.sessionStore.get(payload.nonce, deps.now())
  if (!record) return null
  return { payload, record }
}

function scoreFromSession(
  record: SessionRecord,
  target: ChallengeSecret,
  lat: number,
  lng: number,
  deps: ApiDeps,
): GuessResponse | null {
  const elapsedMs = Math.max(0, deps.now() - record.payload.issuedAt)
  const hintsUsed = deps.sessionStore.hintsUsedCount(record)
  const { distanceKm, breakdown } = computeScore(
    lat,
    lng,
    target.lat,
    target.lng,
    hintsUsed,
    elapsedMs,
    record.payload.mode,
  )
  if (!Number.isFinite(breakdown.finalScore)) {
    return null
  }
  const priorScored = deps.playerScoreStore.hasScored(
    record.payload.playerId,
    record.payload.mode,
    record.payload.date,
  )
  const practice = record.payload.practice || priorScored
  return {
    city: target.city,
    country: target.country,
    target: { lat: target.lat, lng: target.lng },
    guess: { lat, lng },
    distanceKm,
    score: breakdown.finalScore,
    scoreBreakdown: breakdown,
    clueTexts: target.clueTexts,
    practice,
    scored: !practice,
    photoCredit: photoCreditForChallenge(target.id),
  }
}

export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  clientIp: string,
  deps: ApiDeps,
): Promise<void> {
  if (pathname.startsWith('/api/')) {
    if (!deps.rateLimit.consume(clientIp, deps.now())) {
      const retry = deps.rateLimit.retryAfterSeconds(clientIp, deps.now())
      res.setHeader('Retry-After', String(retry))
      sendJson(res, 429, { error: 'Too many requests' })
      return
    }
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (!deps.sessionSecret) {
    sendJson(res, 503, { error: 'Server misconfigured: missing AAD_SESSION_SECRET' })
    return
  }

  if (req.method === 'GET' && pathname === '/api/daily') {
    const url = new URL(req.url ?? '', 'http://local')
    const mode = parseMode(url.searchParams.get('mode'))
    if (!mode) {
      sendJson(res, 400, { error: 'Invalid mode' })
      return
    }
    const dateResult = resolveDailyDateParam(
      url.searchParams.get('date')?.slice(0, 10) ?? null,
      new Date(deps.now()),
    )
    if (!dateResult.ok) {
      sendJson(res, 400, { error: dateResult.error })
      return
    }
    const { date } = dateResult
    const pool = loadChallenges()
    const index = dailyChallengeIndex(date, mode, pool.length)
    const challenge = pool[index]
    if (!challenge) {
      sendJson(res, 404, { error: 'No challenge for pool index' })
      return
    }
    const issuedAt = deps.now()
    const { playerId, cookieValue } = resolvePlayerIdFromRequest(
      req.headers.cookie,
      deps.sessionSecret,
      issuedAt,
    )
    const practice = deps.playerScoreStore.hasScored(playerId, mode, date)
    const payload: SessionPayload = {
      challengeId: challenge.id,
      mode,
      date,
      issuedAt,
      nonce: createNonce(),
      playerId,
      practice,
    }
    deps.sessionStore.create(payload, issuedAt)
    const token = signSession(payload, deps.sessionSecret)
    res.setHeader(
      'Set-Cookie',
      buildPlayerSetCookieHeader(cookieValue, requestIsSecure(req)),
    )
    sendJson(res, 200, {
      date,
      mode,
      index,
      token,
      practice,
      challenge: {
        id: challenge.id,
        imagePath: challenge.imagePath,
        title: challenge.title,
        hintCount: 3,
      },
    })
    return
  }

  if (req.method === 'POST' && pathname === '/api/hint') {
    let body: Record<string, unknown>
    try {
      const raw = await readBody(req)
      const parsed = parseJsonObject(raw)
      if (!parsed) {
        sendJson(res, 400, { error: 'Invalid JSON body' })
        return
      }
      body = parsed
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'body_too_large'
          ? 'Request body too large'
          : 'Invalid JSON body'
      sendJson(res, 400, { error: msg })
      return
    }

    const token = requireStringField(body, 'token')
    const index = requireIntHintIndex(body)
    if (!token || index === null) {
      sendJson(res, 400, { error: 'token (string) and index (0-2) required' })
      return
    }

    const session = loadSessionFromToken(token, deps)
    if (!session) {
      sendJson(res, 401, { error: 'Invalid or expired session token' })
      return
    }
    if (session.record.guessConsumed) {
      sendJson(res, 409, { error: 'Session already used for guess' })
      return
    }

    const target = loadChallenges().find(
      (c) => c.id === session.payload.challengeId,
    )
    if (!target) {
      sendJson(res, 404, { error: 'Unknown challenge' })
      return
    }

    session.record.hintsRevealed[index] = true
    sendJson(res, 200, {
      index,
      text: target.hintTexts[index],
      hintsUsed: deps.sessionStore.hintsUsedCount(session.record),
    })
    return
  }

  if (req.method === 'POST' && pathname === '/api/guess') {
    let body: Record<string, unknown>
    try {
      const raw = await readBody(req)
      const parsed = parseJsonObject(raw)
      if (!parsed) {
        sendJson(res, 400, { error: 'Invalid JSON body' })
        return
      }
      body = parsed
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'body_too_large'
          ? 'Request body too large'
          : 'Invalid JSON body'
      sendJson(res, 400, { error: msg })
      return
    }

    const token = requireStringField(body, 'token')
    const lat = requireFiniteNumber(body, 'lat')
    const lng = requireFiniteNumber(body, 'lng')
    if (!token || lat === null || lng === null || !isValidLatLng(lat, lng)) {
      sendJson(res, 400, { error: 'token, lat and lng required' })
      return
    }

    const session = loadSessionFromToken(token, deps)
    if (!session) {
      sendJson(res, 401, { error: 'Invalid or expired session token' })
      return
    }
    if (session.record.guessConsumed) {
      sendJson(res, 409, { error: 'Session already used for guess' })
      return
    }

    const target = loadChallenges().find(
      (c) => c.id === session.payload.challengeId,
    )
    if (!target) {
      sendJson(res, 404, { error: 'Unknown challenge' })
      return
    }

    session.record.guessConsumed = true
    const response = scoreFromSession(session.record, target, lat, lng, deps)
    if (!response) {
      sendJson(res, 500, { error: 'Score computation failed' })
      return
    }
    const priorScored = deps.playerScoreStore.hasScored(
      session.record.payload.playerId,
      session.record.payload.mode,
      session.record.payload.date,
    )
    const countsAsScored =
      !session.record.payload.practice && !priorScored
    if (countsAsScored) {
      deps.playerScoreStore.markScored(
        session.record.payload.playerId,
        session.record.payload.mode,
        session.record.payload.date,
      )
    }
    sendJson(res, 200, response)
    return
  }

  sendJson(res, 404, { error: 'Not found' })
}

/** @internal Test helper to reset challenge cache */
export function resetChallengeCacheForTests() {
  challengeCache = null
}

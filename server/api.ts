import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  dailyChallengeIndex,
  utcDateString,
} from '../shared/dailySeed.ts'
import { computeScore } from '../shared/scoring.ts'
import type {
  ChallengePublic,
  ChallengeSecret,
  DifficultyMode,
  GuessRequest,
  GuessResponse,
} from '../shared/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const secretPath = join(__dirname, 'data', 'challenges.secret.json')

let cache: ChallengeSecret[] | null = null

function loadChallenges(): ChallengeSecret[] {
  if (!cache) {
    cache = JSON.parse(readFileSync(secretPath, 'utf8')) as ChallengeSecret[]
  }
  return cache
}

const MAX_BODY_BYTES = 4096

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

function toPublic(c: ChallengeSecret): ChallengePublic {
  return {
    id: c.id,
    imagePath: c.imagePath,
    title: c.title,
    hintTexts: c.hintTexts,
    clueTexts: c.clueTexts,
  }
}

const MODES: DifficultyMode[] = ['rookie', 'daily', 'night-owl']

function parseMode(value: string | null): DifficultyMode {
  if (value && MODES.includes(value as DifficultyMode)) {
    return value as DifficultyMode
  }
  return 'daily'
}

const CHALLENGE_ID = /^aad-\d{2}$/

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const t = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(t)
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

export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && pathname === '/api/daily') {
    const url = new URL(req.url ?? '', 'http://local')
    const mode = parseMode(url.searchParams.get('mode'))
    const dateParam = url.searchParams.get('date')?.slice(0, 10)
    const date =
      dateParam && isValidDate(dateParam) ? dateParam : utcDateString()
    const pool = loadChallenges()
    const index = dailyChallengeIndex(date, mode, pool.length)
    const challenge = pool[index]
    if (!challenge) {
      sendJson(res, 404, { error: 'No challenge for pool index' })
      return
    }
    sendJson(res, 200, {
      date,
      mode,
      index,
      challenge: toPublic(challenge),
    })
    return
  }

  if (req.method === 'POST' && pathname === '/api/guess') {
    let payload: GuessRequest
    try {
      payload = JSON.parse(await readBody(req)) as GuessRequest
    } catch (e) {
      const msg = e instanceof Error && e.message === 'body_too_large'
        ? 'Request body too large'
        : 'Invalid JSON body'
      sendJson(res, 400, { error: msg })
      return
    }

    if (
      typeof payload.challengeId !== 'string' ||
      !CHALLENGE_ID.test(payload.challengeId)
    ) {
      sendJson(res, 400, { error: 'Invalid challengeId' })
      return
    }

    const pool = loadChallenges()
    const target = pool.find((c) => c.id === payload.challengeId)
    if (!target) {
      sendJson(res, 404, { error: 'Unknown challenge' })
      return
    }

    if (
      typeof payload.lat !== 'number' ||
      typeof payload.lng !== 'number' ||
      !isValidLatLng(payload.lat, payload.lng)
    ) {
      sendJson(res, 400, { error: 'lat and lng required' })
      return
    }

    const mode = parseMode(payload.mode)
    const hintsUsed = Math.min(3, Math.max(0, payload.hintsUsed ?? 0))
    const elapsedMs = Math.max(0, payload.elapsedMs ?? 0)

    const { distanceKm, breakdown } = computeScore(
      payload.lat,
      payload.lng,
      target.lat,
      target.lng,
      hintsUsed,
      elapsedMs,
      mode,
    )

    const response: GuessResponse = {
      city: target.city,
      country: target.country,
      target: { lat: target.lat, lng: target.lng },
      guess: { lat: payload.lat, lng: payload.lng },
      distanceKm,
      score: breakdown.finalScore,
      scoreBreakdown: breakdown,
      clueTexts: target.clueTexts,
    }
    sendJson(res, 200, response)
    return
  }

  sendJson(res, 404, { error: 'Not found' })
}

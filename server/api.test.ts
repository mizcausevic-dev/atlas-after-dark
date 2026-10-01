// @vitest-environment node
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  createDefaultApiDeps,
  handleApi,
  resetChallengeCacheForTests,
  type ApiDeps,
} from './api.ts'
import { PLAYER_COOKIE_NAME } from './playerCookie.ts'
import { TokenBucketRateLimit } from './rateLimit.ts'
import { utcDateString } from '../shared/dailySeed.ts'

const TEST_SECRET = 'api-test-session-secret'

function mockRequest(
  method: string,
  url: string,
  body?: string,
  headers: Record<string, string> = {},
): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage
  req.method = method
  req.url = url
  req.headers = headers
  req.socket = { remoteAddress: '127.0.0.1' } as IncomingMessage['socket']
  queueMicrotask(() => {
    if (body) {
      req.emit('data', Buffer.from(body))
    }
    req.emit('end')
  })
  return req
}

type MockRes = ServerResponse & {
  _status: number
  _headers: Record<string, string | number | string[] | undefined>
  _body: string
}

function mockResponse(): MockRes {
  const res = {
    statusCode: 200,
    _headers: {} as Record<string, string | number | string[] | undefined>,
    _body: '',
    setHeader(name: string, value: string | number | string[]) {
      this._headers[name.toLowerCase()] = value
    },
    end(chunk?: string) {
      this._body = chunk ?? ''
    },
  } as MockRes
  return res
}

function playerCookieFromHeaders(
  headers: Record<string, string | number | string[] | undefined>,
): string | undefined {
  const raw = headers['set-cookie']
  const line = Array.isArray(raw) ? raw[0] : raw
  if (typeof line !== 'string') return undefined
  const match = line.match(new RegExp(`${PLAYER_COOKIE_NAME}=([^;]+)`))
  return match ? `${PLAYER_COOKIE_NAME}=${match[1]}` : undefined
}

async function callApi(
  method: string,
  pathname: string,
  deps: ApiDeps,
  opts?: {
    query?: string
    body?: unknown
    ip?: string
    cookie?: string
  },
) {
  const url = opts?.query ? `${pathname}?${opts.query}` : pathname
  const reqHeaders: Record<string, string> = {}
  if (opts?.cookie) reqHeaders.cookie = opts.cookie
  const req = mockRequest(
    method,
    url,
    opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    reqHeaders,
  )
  const res = mockResponse()
  await handleApi(req, res, pathname, opts?.ip ?? '10.0.0.1', deps)
  let json: unknown = null
  try {
    json = JSON.parse(res._body)
  } catch {
    json = null
  }
  return {
    status: res.statusCode,
    json,
    headers: res._headers,
    raw: res._body,
    playerCookie: playerCookieFromHeaders(res._headers),
  }
}

describe('handleApi sessions', () => {
  let deps: ApiDeps

  beforeEach(() => {
    resetChallengeCacheForTests()
    deps = createDefaultApiDeps(TEST_SECRET)
  })

  it('(c) /api/daily omits clueTexts and hint text', async () => {
    const today = utcDateString()
    const { status, json } = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
    })
    expect(status).toBe(200)
    const data = json as {
      token: string
      practice: boolean
      challenge: Record<string, unknown>
    }
    expect(data.token).toBeTruthy()
    expect(data.practice).toBe(false)
    expect(data.challenge.clueTexts).toBeUndefined()
    expect(data.challenge.hintTexts).toBeUndefined()
    expect(data.challenge.hintCount).toBe(3)
  })

  it('(d) rejects future daily date', async () => {
    const { status, json } = await callApi('GET', '/api/daily', deps, {
      query: 'mode=daily&date=2099-06-01',
    })
    expect(status).toBe(400)
    expect((json as { error: string }).error).toMatch(/today or yesterday/i)
  })

  it('(e) malformed guess body returns 400', async () => {
    const { status, json } = await callApi('POST', '/api/guess', deps, {
      body: { token: 'not-valid', lat: 'x', lng: 0 },
    })
    expect(status).toBe(400)
    expect((json as { error: string }).error).toBeTruthy()
  })

  it('(a) second guess on same token returns 409', async () => {
    const today = utcDateString()
    const daily = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
    })
    const token = (daily.json as { token: string }).token
    const first = await callApi('POST', '/api/guess', deps, {
      body: { token, lat: 10, lng: 10 },
      cookie: daily.playerCookie,
    })
    expect(first.status).toBe(200)
    const second = await callApi('POST', '/api/guess', deps, {
      body: { token, lat: 10, lng: 10 },
      cookie: daily.playerCookie,
    })
    expect(second.status).toBe(409)
  })

  it('(b) uses server session hints, not client hintsUsed on guess', async () => {
    const today = utcDateString()
    const plain = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
    })
    const cookie = plain.playerCookie
    const hinted = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
      cookie,
    })
    expect((hinted.json as { practice: boolean }).practice).toBe(false)
    const plainToken = (plain.json as { token: string }).token
    const hintedToken = (hinted.json as { token: string }).token
    await callApi('POST', '/api/hint', deps, {
      body: { token: hintedToken, index: 0 },
      cookie,
    })
    const cleanGuess = await callApi('POST', '/api/guess', deps, {
      body: {
        token: plainToken,
        lat: 20,
        lng: 20,
        hintsUsed: 3,
        elapsedMs: 0,
        mode: 'night-owl',
      },
      cookie,
    })
    const hintedGuess = await callApi('POST', '/api/guess', deps, {
      body: {
        token: hintedToken,
        lat: 20,
        lng: 20,
        hintsUsed: 0,
        elapsedMs: 999_999,
        mode: 'rookie',
      },
      cookie,
    })
    expect(cleanGuess.status).toBe(200)
    expect(hintedGuess.status).toBe(200)
    const cleanScore = (cleanGuess.json as { score: number }).score
    const hintedScore = (hintedGuess.json as { score: number }).score
    expect(Number.isFinite(cleanScore)).toBe(true)
    expect(Number.isFinite(hintedScore)).toBe(true)
    expect(hintedScore).toBeLessThan(cleanScore)
    expect((hintedGuess.json as { scored: boolean }).scored).toBe(false)
    expect((cleanGuess.json as { scored: boolean }).scored).toBe(true)
  })

  it('(f) rate limit returns 429 with Retry-After', async () => {
    const limitedDeps: ApiDeps = {
      ...createDefaultApiDeps(TEST_SECRET),
      rateLimit: new TokenBucketRateLimit(3, 60_000),
    }
    const ip = '203.0.113.50'
    const today = utcDateString()
    for (let i = 0; i < 3; i++) {
      const ok = await callApi('GET', '/api/daily', limitedDeps, {
        ip,
        query: `mode=daily&date=${today}`,
      })
      expect(ok.status).toBe(200)
    }
    const blocked = await callApi('GET', '/api/daily', limitedDeps, {
      ip,
      query: `mode=daily&date=${today}`,
    })
    expect(blocked.status).toBe(429)
    expect(blocked.headers['retry-after']).toBeTruthy()
  })

  it('second daily token same player same UTC day is practice with unscored guess', async () => {
    const today = utcDateString()
    const firstDaily = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
    })
    const cookie = firstDaily.playerCookie
    expect(cookie).toBeTruthy()
    const tokenA = (firstDaily.json as { token: string }).token
    const guessA = await callApi('POST', '/api/guess', deps, {
      body: { token: tokenA, lat: 0, lng: 0 },
      cookie,
    })
    const target = (guessA.json as { target: { lat: number; lng: number } })
      .target
    expect((guessA.json as { scored: boolean }).scored).toBe(true)

    const secondDaily = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
      cookie,
    })
    expect((secondDaily.json as { practice: boolean }).practice).toBe(true)
    const tokenB = (secondDaily.json as { token: string }).token
    const guessB = await callApi('POST', '/api/guess', deps, {
      body: { token: tokenB, lat: target.lat, lng: target.lng },
      cookie,
    })
    expect(guessB.status).toBe(200)
    const body = guessB.json as {
      practice: boolean
      scored: boolean
      score: number
    }
    expect(body.practice).toBe(true)
    expect(body.scored).toBe(false)
    expect(body.score).toBeGreaterThan(6000)
  })

  it('missing cookie receives Set-Cookie and new player id', async () => {
    const today = utcDateString()
    const a = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
    })
    const b = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
    })
    expect(a.playerCookie).toBeTruthy()
    expect(b.playerCookie).toBeTruthy()
    expect(a.playerCookie).not.toBe(b.playerCookie)
  })

  it('tampered player cookie is rejected and replaced', async () => {
    const today = utcDateString()
    const tampered = await callApi('GET', '/api/daily', deps, {
      query: `mode=daily&date=${today}`,
      cookie: `${PLAYER_COOKIE_NAME}=bad.payload.badsig`,
    })
    expect(tampered.playerCookie).toBeTruthy()
    expect(tampered.playerCookie).not.toContain('bad.payload')
  })
})

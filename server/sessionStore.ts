import type { SessionPayload } from './sessionToken.ts'

export type SessionRecord = {
  payload: SessionPayload
  hintsRevealed: [boolean, boolean, boolean]
  guessConsumed: boolean
  expiresAt: number
}

export class SessionStore {
  private records = new Map<string, SessionRecord>()
  private readonly ttlMs: number

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  create(payload: SessionPayload, now = Date.now()): SessionRecord {
    this.purge(now)
    const record: SessionRecord = {
      payload,
      hintsRevealed: [false, false, false],
      guessConsumed: false,
      expiresAt: now + this.ttlMs,
    }
    this.records.set(payload.nonce, record)
    return record
  }

  get(nonce: string, now = Date.now()): SessionRecord | null {
    this.purge(now)
    const record = this.records.get(nonce)
    if (!record || record.expiresAt <= now) {
      this.records.delete(nonce)
      return null
    }
    return record
  }

  hintsUsedCount(record: SessionRecord): number {
    return record.hintsRevealed.filter(Boolean).length
  }

  private purge(now: number) {
    for (const [key, record] of this.records) {
      if (record.expiresAt <= now) {
        this.records.delete(key)
      }
    }
  }
}

export const SESSION_TTL_MS = 30 * 60 * 1000

export class TokenBucketRateLimit {
  private buckets = new Map<string, { tokens: number; windowStart: number }>()
  private readonly maxPerWindow: number
  private readonly windowMs: number

  constructor(maxPerWindow: number, windowMs: number) {
    this.maxPerWindow = maxPerWindow
    this.windowMs = windowMs
  }

  /** Returns false when rate limited. */
  consume(key: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(key)
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { tokens: this.maxPerWindow - 1, windowStart: now })
      return true
    }
    if (bucket.tokens <= 0) {
      return false
    }
    bucket.tokens -= 1
    return true
  }

  retryAfterSeconds(key: string, now = Date.now()): number {
    const bucket = this.buckets.get(key)
    if (!bucket) return 1
    const elapsed = now - bucket.windowStart
    const remaining = Math.max(0, this.windowMs - elapsed)
    return Math.max(1, Math.ceil(remaining / 1000))
  }
}

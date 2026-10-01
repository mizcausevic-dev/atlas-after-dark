import { utcDateString } from '../shared/dailySeed.ts'

export function yesterdayUtcString(now = new Date()): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function isAllowedDailyDate(
  date: string,
  now = new Date(),
): boolean {
  const today = utcDateString(now)
  const yesterday = yesterdayUtcString(now)
  return date === today || date === yesterday
}

export function resolveDailyDateParam(
  dateParam: string | null | undefined,
  now = new Date(),
): { ok: true; date: string } | { ok: false; error: string } {
  if (dateParam == null || dateParam === '') {
    return { ok: true, date: utcDateString(now) }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return { ok: false, error: 'Invalid date format' }
  }
  const t = Date.parse(`${dateParam}T00:00:00Z`)
  if (!Number.isFinite(t)) {
    return { ok: false, error: 'Invalid date' }
  }
  if (!isAllowedDailyDate(dateParam, now)) {
    return { ok: false, error: 'Date must be today or yesterday (UTC)' }
  }
  return { ok: true, date: dateParam }
}

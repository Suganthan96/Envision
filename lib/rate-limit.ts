const attempts = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 8

export function isRateLimited(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count += 1
  if (entry.count > MAX_ATTEMPTS) {
    return true
  }
  return false
}

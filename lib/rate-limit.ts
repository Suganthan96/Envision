const attempts = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000

function hit(key: string, maxAttempts: number) {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > maxAttempts
}

// Per-account limit: protects a single login ID from brute-force guessing.
const ACCOUNT_MAX_ATTEMPTS = 8

export function isAccountRateLimited(loginId: string) {
  return hit(`account:${loginId}`, ACCOUNT_MAX_ATTEMPTS)
}

// Per-IP limit: a much higher ceiling that only kicks in for real abuse
// (e.g. one client hammering many different accounts). Many legitimate
// users can share an IP behind a campus NAT/proxy, so this must not be
// tight enough to block a normal login rush.
const IP_MAX_ATTEMPTS = 120

export function isIpRateLimited(ip: string) {
  if (ip === "unknown") return false
  return hit(`ip:${ip}`, IP_MAX_ATTEMPTS)
}

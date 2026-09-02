import { cache } from "react"
import { cookies } from "next/headers"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session"

/**
 * Wrapped in React `cache()` because a single render calls this 2–3 times —
 * the page itself, `PortalHeader`/`AdminHeader`, and (on the streamed admin
 * routes) the Suspense section component. Without it each call re-read the
 * cookie store and re-ran the JWT verify. `cache()` dedupes them per request.
 */
export const getSession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
})

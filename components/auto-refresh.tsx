"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Keeps every page's server data fresh on its own.
 *
 * `router.refresh()` re-runs the server components and streams the new markup
 * in — it does NOT remount the tree, so client state (open dialogs, what is
 * typed into a field, which team is selected) survives untouched. That is what
 * makes it safe to run on a timer under the whole app.
 *
 * Three rules keep it from being wasteful or disruptive:
 *   - a hidden tab never polls; it refreshes once when it comes back
 *   - coming back online refreshes immediately
 *   - a refresh is skipped while a request is already in flight
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  const busy = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const refresh = () => {
      if (busy.current) return
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      busy.current = true
      router.refresh()
      // router.refresh() gives us nothing to await, so this is simply a floor
      // on how often we can ask — well under the interval.
      setTimeout(() => {
        busy.current = false
      }, 2_000)
    }

    const start = () => {
      if (timer) return
      timer = setInterval(refresh, intervalMs)
    }
    const stop = () => {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh()
        start()
      } else {
        stop()
      }
    }

    if (typeof document !== "undefined" && document.visibilityState === "visible") start()
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("online", refresh)

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("online", refresh)
    }
  }, [router, intervalMs])

  return null
}

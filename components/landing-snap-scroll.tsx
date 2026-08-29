"use client"

import { useEffect } from "react"

/**
 * Scroll-snap only applies to the landing page's sections, so it's toggled
 * on <html> — the actual scrolling element for the document — for the
 * lifetime of this page rather than baked into globals.css, otherwise every
 * other route (dashboards, admin tables) would inherit section-snapping it
 * was never designed for.
 */
export function LandingSnapScroll() {
  useEffect(() => {
    document.documentElement.classList.add("landing-snap-scroll")
    return () => document.documentElement.classList.remove("landing-snap-scroll")
  }, [])

  return null
}

"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { gsap } from "gsap"
import "./pill-nav.css"

export interface PillNavItem {
  label: string
  /** Either a href (renders a Link) or an onClick (renders a button) — e.g. Sign Out. */
  href?: string
  onClick?: () => void
  ariaLabel?: string
}

interface PillNavProps {
  /** Either an <img> src, or a ready-made node (e.g. a text wordmark) rendered in the logo pill. Omit to skip the logo pill entirely. */
  logo?: string | ReactNode
  logoAlt?: string
  items: PillNavItem[]
  /** Where the logo pill links to. Defaults to "/" rather than items[0].href. */
  homeHref?: string
  activeHref?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  initialLoadAnimation?: boolean
}

const isExternalLink = (href: string) =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("//") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("#")

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  homeHref = "/",
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#fff",
  pillColor = "#120F17",
  hoveredPillTextColor = "#120F17",
  pillTextColor,
  initialLoadAnimation = false,
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? baseColor
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([])
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([])
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([])
  const logoImgRef = useRef<HTMLImageElement | null>(null)
  const logoTweenRef = useRef<gsap.core.Tween | null>(null)
  const navItemsRef = useRef<HTMLDivElement | null>(null)
  const logoRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return

        const pill = circle.parentElement
        const rect = pill.getBoundingClientRect()
        const { width: w, height: h } = rect
        if (w === 0 || h === 0) return
        const R = ((w * w) / 4 + h * h) / (2 * h)
        const D = Math.ceil(2 * R) + 2
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1
        const originY = D - delta

        circle.style.width = `${D}px`
        circle.style.height = `${D}px`
        circle.style.bottom = `-${delta}px`

        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` })

        const label = pill.querySelector<HTMLElement>(".pill-label")
        const white = pill.querySelector<HTMLElement>(".pill-label-hover")

        if (label) gsap.set(label, { y: 0 })
        if (white) gsap.set(white, { y: h + 12, opacity: 0 })

        const index = circleRefs.current.indexOf(circle)
        if (index === -1) return

        tlRefs.current[index]?.kill()
        const tl = gsap.timeline({ paused: true })

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" }, 0)
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0)
        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 })
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0)
        }

        tlRefs.current[index] = tl
      })
    }

    layout()

    const onResize = () => layout()
    window.addEventListener("resize", onResize)

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {})
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current
      const navItems = navItemsRef.current

      if (logoEl) {
        gsap.set(logoEl, { scale: 0 })
        gsap.to(logoEl, { scale: 1, duration: 0.6, ease })
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: "hidden" })
        gsap.to(navItems, { width: "auto", duration: 0.6, ease })
      }
    }

    return () => window.removeEventListener("resize", onResize)
  }, [items, ease, initialLoadAnimation])

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: "auto" })
  }

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: "auto" })
  }

  const handleLogoEnter = () => {
    const img = logoImgRef.current
    if (!img) return
    logoTweenRef.current?.kill()
    gsap.set(img, { rotate: 0 })
    logoTweenRef.current = gsap.to(img, { rotate: 360, duration: 0.4, ease, overwrite: "auto" })
  }

  const cssVars = {
    ["--base" as string]: baseColor,
    ["--pill-bg" as string]: pillColor,
    ["--hover-text" as string]: hoveredPillTextColor,
    ["--pill-text" as string]: resolvedPillTextColor,
  } as React.CSSProperties

  return (
    <div className="pill-nav-container">
      <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
        {logo != null &&
          (isExternalLink(homeHref) ? (
            <a className="pill-logo" href={homeHref} aria-label="Home" onMouseEnter={handleLogoEnter}>
              {typeof logo === "string" ? <img src={logo} alt={logoAlt} ref={logoImgRef} /> : logo}
            </a>
          ) : (
            <Link
              className="pill-logo"
              href={homeHref}
              aria-label="Home"
              onMouseEnter={handleLogoEnter}
              ref={logoRef}
            >
              {typeof logo === "string" ? <img src={logo} alt={logoAlt} ref={logoImgRef} /> : logo}
            </Link>
          ))}

        <div className="pill-nav-items" ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => {
              const pillBody = (
                <>
                  <span
                    className="hover-circle"
                    aria-hidden="true"
                    ref={(el) => {
                      circleRefs.current[i] = el
                    }}
                  />
                  <span className="label-stack">
                    <span className="pill-label">{item.label}</span>
                    <span className="pill-label-hover" aria-hidden="true">
                      {item.label}
                    </span>
                  </span>
                </>
              )

              return (
                <li key={item.href ?? `item-${i}`} role="none">
                  {item.href ? (
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={`pill${activeHref === item.href ? " is-active" : ""}`}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                    >
                      {pillBody}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className="pill"
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                      onClick={item.onClick}
                    >
                      {pillBody}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </div>
  )
}

"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import PillNav, { type PillNavItem } from "@/components/pill-nav"
import GlassSurface from "@/components/glass-surface"

/**
 * Floating, centered glass-pill navbar for the public, unauthenticated pages
 * (landing, /showcase, /mentors). A GlassSurface capsule (React Bits) holds
 * a PillNav (React Bits) plus the theme toggle and login/sign-out action,
 * always centered at the top of the viewport so it reads as its own object
 * instead of blending into whatever scrolls underneath.
 *
 * These pages are reachable whether or not the visitor is signed in — a
 * mentor or admin can land on /showcase directly with a live session — so
 * the last pill reflects that: "Sign Out" (with no navigation, just the
 * logout call) when `isAuthenticated`, "Login" otherwise. Callers fetch the
 * session server-side and pass the boolean down, since this is a client
 * component and can't read the session cookie itself.
 */
export function PublicNav({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = useMemo<PillNavItem[]>(() => {
    const items: PillNavItem[] = [
      { label: "Showcase", href: "/showcase" },
      { label: "Mentors", href: "/mentors" },
    ]

    if (isAuthenticated) {
      items.push({
        label: "Sign Out",
        onClick: async () => {
          await fetch("/api/logout", { method: "POST" })
          router.push("/")
          router.refresh()
        },
      })
    } else {
      items.push({ label: "Login", href: "/login" })
    }

    return items
  }, [isAuthenticated, router])

  return (
    <div className="sticky top-0 z-30 flex justify-center px-4 pt-4 pb-2 pointer-events-none">
      <div className="pointer-events-auto">
        <GlassSurface
          width="auto"
          height={60}
          borderRadius={999}
          backgroundOpacity={0.28}
          blur={14}
          displace={4}
          distortionScale={-120}
          redOffset={2}
          greenOffset={8}
          blueOffset={14}
          className="!p-1.5"
        >
          <div className="flex items-center gap-2 px-1">
            <PillNav
              items={navItems}
              homeHref="/"
              activeHref={pathname}
              ease="power3.easeOut"
              baseColor="var(--primary)"
              pillColor="transparent"
              hoveredPillTextColor="var(--pill-hover-text)"
              pillTextColor="var(--pill-idle-text)"
              logo={<span className="block w-2.5 h-2.5 rotate-45 border border-primary/70" aria-hidden="true" />}
              logoAlt="Home"
            />
            <ThemeToggle variant="inline" className="rounded-full border-primary/30 bg-transparent" />
          </div>
        </GlassSurface>
      </div>
    </div>
  )
}

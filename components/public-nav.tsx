"use client"

import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import PillNav from "@/components/pill-nav"
import GlassSurface from "@/components/glass-surface"

const NAV_ITEMS = [
  { label: "Showcase", href: "/showcase" },
  { label: "Mentors", href: "/mentors" },
  { label: "Login", href: "/login" },
]

/**
 * Floating, centered glass-pill navbar for the public, unauthenticated pages
 * (landing, /showcase, /mentors). A GlassSurface capsule (React Bits) holds
 * a PillNav (React Bits) plus the theme toggle and login action, always
 * centered at the top of the viewport so it reads as its own object instead
 * of blending into whatever scrolls underneath.
 */
export function PublicNav() {
  const pathname = usePathname()

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
              items={NAV_ITEMS}
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

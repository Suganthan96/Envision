"use client"

import { useEffect, useState } from "react"

export interface ScrollDotSection {
  id: string
  label: string
}

/**
 * A vertical dot rail pinned to the right-center of the viewport, showing
 * which section of a long single-page layout you're on and that there's
 * more to scroll to. Click a dot to jump there.
 */
export function ScrollDots({ sections }: { sections: ScrollDotSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { threshold: [0.3, 0.5, 0.7], rootMargin: "-10% 0px -10% 0px" },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-4">
      {sections.map((s) => {
        const active = s.id === activeId
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })}
            aria-label={`Scroll to ${s.label}`}
            aria-current={active}
            className="group flex items-center gap-3"
          >
            <span
              className={`text-[10px] uppercase tracking-wider transition-opacity ${
                active ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"
              }`}
            >
              {s.label}
            </span>
            <span
              className={`block rounded-full transition-all ${
                active ? "w-2.5 h-2.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/50 group-hover:bg-primary/70"
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

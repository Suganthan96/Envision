"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { BookOpen, ChevronRight, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MANUAL } from "@/lib/admin-manual"
import { searchManual, SUGGESTED_TOPIC_IDS } from "@/lib/manual-search"
import { ManualTopicBody } from "@/components/manual-topic"

const SUGGESTED = SUGGESTED_TOPIC_IDS.map((id) => MANUAL.find((t) => t.id === id)!).filter(Boolean)

/**
 * "Ask anything" over the admin manual. `variant="bar"` is the compact box on
 * every admin page, whose answers open in a panel underneath; `variant="page"`
 * is the large box on /admin/manual, whose answers render inline. Press / to
 * jump to it from anywhere on the page.
 */
export function ManualSearch({ variant = "bar" }: { variant?: "bar" | "page" }) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120)
    return () => clearTimeout(t)
  }, [query])

  const hits = useMemo(() => (debounced.trim() ? searchManual(debounced) : []), [debounced])

  // The best answer opens by default; picking another one swaps it.
  useEffect(() => {
    setOpenId(hits[0]?.topic.id ?? null)
  }, [hits])

  // "/" focuses the search unless someone is already typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
      // On /admin/manual the big search box takes the shortcut.
      if (variant === "bar" && document.getElementById("manual-search-page")) return
      if (e.key === "/" && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [variant])

  // Clicking elsewhere closes the panel (bar variant only).
  useEffect(() => {
    if (variant !== "bar" || !open) return
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [variant, open])

  const showResults = variant === "page" ? debounced.trim().length > 0 : open && debounced.trim().length > 0
  const close = () => setOpen(false)

  const results = (
    <div className="flex flex-col gap-2">
      {hits.length === 0 ? (
        <div className="flex flex-col gap-3 p-1">
          <p className="text-sm text-foreground">
            Nothing in the manual matches that yet. Try other words, or start from one of these:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setQuery(t.title)
                  setDebounced(t.title)
                  setOpen(true)
                }}
                className="text-xs rounded-full border border-border px-3 py-1 text-muted-foreground hover:border-primary hover:text-primary"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        hits.map(({ topic }) => {
          const expanded = topic.id === openId
          return (
            <div
              key={topic.id}
              className={cn("rounded-lg border", expanded ? "border-primary/50 bg-card" : "border-transparent")}
            >
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : topic.id)}
                aria-expanded={expanded}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
              >
                <ChevronRight
                  className={cn("w-4 h-4 shrink-0 text-primary transition-transform", expanded && "rotate-90")}
                />
                <span className={cn("text-sm", expanded ? "text-primary" : "text-foreground")}>{topic.title}</span>
              </button>
              {expanded && (
                <div className="px-3 pb-3 pl-9">
                  <ManualTopicBody topic={topic} onNavigate={close} />
                  <Link
                    href={`/admin/manual#${topic.id}`}
                    onClick={close}
                    className="inline-block mt-3 text-xs text-muted-foreground hover:text-primary"
                  >
                    Open in the manual
                  </Link>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div ref={boxRef} className={cn("relative", variant === "bar" ? "w-full sm:max-w-md" : "w-full")}>
      <label className="sr-only" htmlFor={`manual-search-${variant}`}>
        Search the admin manual
      </label>
      <div className="relative">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            variant === "page" ? "w-5 h-5" : "w-4 h-4",
          )}
        />
        <input
          ref={inputRef}
          id={`manual-search-${variant}`}
          type="search"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (query) setQuery("")
              else {
                setOpen(false)
                inputRef.current?.blur()
              }
            }
          }}
          placeholder={
            variant === "page"
              ? "Ask anything, in your own words: how do I start next year?"
              : "Ask the manual anything…"
          }
          className={cn(
            "w-full rounded-lg border border-border bg-card/60 text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            variant === "page" ? "h-14 pl-11 pr-11 text-lg" : "h-9 pl-9 pr-9 text-sm",
          )}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
            /
          </kbd>
        )}
      </div>

      {showResults &&
        (variant === "bar" ? (
          <div className="absolute left-0 right-0 sm:right-auto sm:w-[34rem] top-full mt-2 z-50 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-2xl p-3 max-h-[70vh] overflow-y-auto">
            {results}
            <Link
              href="/admin/manual"
              onClick={close}
              className="mt-2 flex items-center gap-2 border-t border-border pt-3 px-1 text-xs text-muted-foreground hover:text-primary"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Browse the whole manual
            </Link>
          </div>
        ) : (
          <div className="mt-4">{results}</div>
        ))}
    </div>
  )
}

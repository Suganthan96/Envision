"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export interface YearOption {
  id: string
  label: string
  isCurrent: boolean
}

async function openYear(edition: string) {
  const res = await fetch("/api/admin/years", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "open", edition }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Could not switch year.")
}

/** The year an admin is working in. Everything on the admin pages follows it. */
export function YearSwitcher({ years, active }: { years: YearOption[]; active: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function choose(id: string) {
    setError("")
    setPending(true)
    try {
      const target = years.find((y) => y.id === id)
      await openYear(target?.isCurrent ? "" : id)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch year.")
    } finally {
      setPending(false)
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      Year
      <select
        value={active}
        disabled={pending}
        onChange={(e) => choose(e.target.value)}
        className={cn(
          "h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.label}
            {y.isCurrent ? " (current)" : ""}
          </option>
        ))}
      </select>
      {error && <span className="text-destructive">{error}</span>}
    </label>
  )
}

/** One-click way back to the year everyone else is in. */
export function BackToCurrentYear({ label }: { label: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          await openYear("")
          router.refresh()
        } finally {
          setPending(false)
        }
      }}
      className="text-primary hover:underline whitespace-nowrap disabled:opacity-60"
    >
      Back to {label}
    </button>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The round's tie-break order. When teams have the same total, the one with
 * more marks in the first criterion ranks higher on the leaderboard; if that
 * is equal too, the next criterion decides, and so on.
 */
export function TiebreakEditor({ presetId, initial }: { presetId: string; initial: string[] }) {
  const router = useRouter()
  const [order, setOrder] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const dirty = order.join("\u0000") !== saved.join("\u0000")

  function move(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= order.length) return
    setOrder((cur) => {
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function save() {
    setError("")
    setSaving(true)
    try {
      const res = await fetch("/api/admin/judging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-tiebreak", id: presetId, tiebreak: order }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
      setSaved(order)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the order.")
    } finally {
      setSaving(false)
    }
  }

  if (order.length === 0) return null

  return (
    <div className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-3">
      <div>
        <p className="text-primary tracking-[0.1em] uppercase text-[10px]">Tie-break order</p>
        <p className="text-muted-foreground text-sm mt-1">
          When teams have the same total, the team with more marks in criterion 1 ranks higher. If
          that is equal too, criterion 2 decides, and so on.
        </p>
      </div>
      <ol className="flex flex-col gap-1.5">
        {order.map((label, i) => (
          <li
            key={label}
            className="flex items-center gap-3 border border-border rounded-md bg-card px-3 py-2"
          >
            <span className="text-primary font-mono text-xs w-5 shrink-0">{i + 1}</span>
            <span className="flex-1 text-sm text-foreground truncate" title={label}>
              {label}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => move(i, -1)}
              disabled={i === 0 || saving}
              aria-label={`Move ${label} up`}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1 || saving}
              aria-label={`Move ${label} down`}
            >
              <ArrowDown />
            </Button>
          </li>
        ))}
      </ol>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className={cn("flex gap-2", !dirty && "hidden")}>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save order"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOrder(saved)} disabled={saving}>
          Reset
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface FeedbackLinkRow {
  entryId: string
  label: string
  title: string
  url: string
}

function FeedbackLinkRowEditor({ row }: { row: FeedbackLinkRow }) {
  const [url, setUrl] = useState(row.url)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [error, setError] = useState("")

  const save = async () => {
    setSaving(true)
    setStatus("idle")
    setError("")

    try {
      const res = await fetch("/api/admin/feedback-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: row.entryId, url }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setError(data.error ?? "Unable to save.")
        return
      }

      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("error")
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 border border-border bg-card/40 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="sm:w-56 shrink-0">
        <p className="text-primary text-xs uppercase tracking-wider">{row.label}</p>
        <p className="text-foreground text-sm">{row.title}</p>
      </div>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://forms.gle/..."
        className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-10"
      />
      <Button
        type="button"
        onClick={save}
        disabled={saving}
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-10 bg-transparent shrink-0"
      >
        {saving ? "Saving..." : status === "saved" ? "Saved" : "Save"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

export function FeedbackLinkEditor({ rows }: { rows: FeedbackLinkRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <FeedbackLinkRowEditor key={row.entryId} row={row} />
      ))}
    </div>
  )
}

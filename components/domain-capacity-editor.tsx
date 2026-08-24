"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface DomainCapacityRow {
  domainId: string
  title: string
  capacity: number
}

function CapacityRowEditor({ row, role }: { row: DomainCapacityRow; role: "mentor" | "member" }) {
  const router = useRouter()
  const [value, setValue] = useState(String(row.capacity))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [error, setError] = useState("")

  const save = async () => {
    const capacity = Number(value)
    if (!Number.isInteger(capacity) || capacity < 0) {
      setStatus("error")
      setError("Enter a whole number ≥ 0.")
      return
    }

    setSaving(true)
    setStatus("idle")
    setError("")

    try {
      const res = await fetch("/api/admin/domain-capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, domainId: row.domainId, capacity }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setError(data.error ?? "Unable to save.")
        return
      }

      setStatus("saved")
      router.refresh()
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("error")
      setError("Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 border border-border bg-card/40 flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="text-foreground text-sm flex-1 min-w-0 truncate">{row.title}</p>
      <div className="flex items-center gap-2 shrink-0">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-card border-border text-foreground h-8 text-sm w-20"
        />
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-wider h-8"
        >
          {saving ? "Saving..." : status === "saved" ? "Saved" : "Save"}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

export function DomainCapacityEditor({ rows, role }: { rows: DomainCapacityRow[]; role: "mentor" | "member" }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {rows.map((row) => (
        <CapacityRowEditor key={row.domainId} row={row} role={role} />
      ))}
    </div>
  )
}

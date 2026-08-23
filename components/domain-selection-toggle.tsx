"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"

export function DomainSelectionToggle({
  role,
  field,
  title,
  initialEnabled,
  activeDescription,
  inactiveDescription,
}: {
  role: "mentor" | "member"
  field: "view" | "select"
  title: string
  initialEnabled: boolean
  activeDescription: string
  inactiveDescription: string
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const toggle = async (next: boolean) => {
    setEnabled(next)
    setPending(true)
    setError("")

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, field, enabled: next }),
      })
      const data = await res.json()

      if (!res.ok) {
        setEnabled(!next)
        setError(data.error ?? "Unable to update setting.")
        return
      }

      router.refresh()
    } catch {
      setEnabled(!next)
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 border border-border bg-card/40 flex-1 sm:max-w-sm">
      <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} />
      <div>
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{enabled ? activeDescription : inactiveDescription}</p>
        {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      </div>
    </div>
  )
}

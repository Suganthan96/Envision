"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"

export function DomainSelectionToggle({
  role,
  title,
  initialOpen,
}: {
  role: "mentor" | "member"
  title: string
  initialOpen: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const toggle = async (next: boolean) => {
    setOpen(next)
    setPending(true)
    setError("")

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, domainSelectionOpen: next }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOpen(!next)
        setError(data.error ?? "Unable to update setting.")
        return
      }

      router.refresh()
    } catch {
      setOpen(!next)
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 border border-border bg-card/40">
      <Switch checked={open} onCheckedChange={toggle} disabled={pending} />
      <div>
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">
          {open
            ? `${role === "mentor" ? "Mentors" : "Students"} can currently choose their domains.`
            : `${role === "mentor" ? "Mentors" : "Students"} currently see the program timeline instead.`}
        </p>
        {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      </div>
    </div>
  )
}

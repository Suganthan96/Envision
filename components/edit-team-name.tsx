"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function EditTeamName({ currentTeamName }: { currentTeamName: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [teamName, setTeamName] = useState(currentTeamName ?? "")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const trimmed = teamName.trim()
    if (!trimmed) {
      setError("Team name is required.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/team-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Unable to update team name.")
        setLoading(false)
        return
      }

      setOpen(false)
      setLoading(false)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setTeamName(currentTeamName ?? "")
          setError("")
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit team name"
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <DialogContent className="bg-card border-border rounded-none">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground">Edit Team Name</DialogTitle>
          <DialogDescription>Update the name your team is known by this cycle.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-team-name" className="text-primary tracking-[0.15em] uppercase text-xs">
              Team Name
            </Label>
            <Input
              id="edit-team-name"
              type="text"
              autoComplete="off"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="bg-background border-border text-foreground focus:border-primary focus:ring-primary h-11"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wider uppercase text-sm"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

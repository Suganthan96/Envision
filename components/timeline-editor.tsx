"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { TimelineEntry, TimelinePhase } from "@/lib/timeline"

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function EntryEditor({
  entry,
  feedbackUrl,
  onChange,
  onFeedbackUrlChange,
  onDelete,
}: {
  entry: TimelineEntry
  feedbackUrl: string
  onChange: (next: TimelineEntry) => void
  onFeedbackUrlChange: (url: string) => void
  onDelete: () => void
}) {
  return (
    <div className="p-4 border border-border bg-background/40 flex flex-col gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Label</Label>
          <Input
            value={entry.label}
            onChange={(e) => onChange({ ...entry, label: e.target.value })}
            placeholder="Day 1 / Week 1"
            className="bg-card border-border text-foreground h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Date</Label>
          <Input
            value={entry.date ?? ""}
            onChange={(e) => onChange({ ...entry, date: e.target.value })}
            placeholder="21.08.2026 (AN)"
            className="bg-card border-border text-foreground h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Title</Label>
        <Textarea
          value={entry.title}
          onChange={(e) => onChange({ ...entry, title: e.target.value })}
          placeholder="Session title"
          className="bg-card border-border text-foreground text-sm min-h-16"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Resource</Label>
          <Input
            value={entry.resource}
            onChange={(e) => onChange({ ...entry, resource: e.target.value })}
            placeholder="IIC Team / External Expert"
            className="bg-card border-border text-foreground h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Venue</Label>
          <Input
            value={entry.venue ?? ""}
            onChange={(e) => onChange({ ...entry, venue: e.target.value })}
            placeholder="G01, C30, F11..."
            className="bg-card border-border text-foreground h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={entry.hasFeedbackForm === true}
            onCheckedChange={(checked) => onChange({ ...entry, hasFeedbackForm: checked === true })}
          />
          Has a feedback form
        </label>

        {entry.hasFeedbackForm === true && (
          <div className="flex flex-col gap-1.5 pl-6">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Feedback Form URL</Label>
            <Input
              value={feedbackUrl}
              onChange={(e) => onFeedbackUrlChange(e.target.value)}
              placeholder="https://forms.gle/..."
              className="bg-card border-border text-foreground h-9 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8 p-0 shrink-0"
          aria-label="Delete entry"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function PhaseEditor({
  phase,
  feedbackLinks,
  onChange,
  onFeedbackUrlChange,
  onDelete,
}: {
  phase: TimelinePhase
  feedbackLinks: Record<string, string>
  onChange: (next: TimelinePhase) => void
  onFeedbackUrlChange: (entryId: string, url: string) => void
  onDelete: () => void
}) {
  const updateEntry = (index: number, next: TimelineEntry) => {
    const entries = phase.entries.slice()
    entries[index] = next
    onChange({ ...phase, entries })
  }

  const deleteEntry = (index: number) => {
    onChange({ ...phase, entries: phase.entries.filter((_, i) => i !== index) })
  }

  const addEntry = () => {
    onChange({
      ...phase,
      entries: [
        ...phase.entries,
        { id: newId("entry"), label: "", date: "", title: "", resource: "", venue: "" },
      ],
    })
  }

  return (
    <div className="border border-border bg-card/40 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Phase Title</Label>
          <Input
            value={phase.title}
            onChange={(e) => onChange({ ...phase, title: e.target.value })}
            placeholder="Phase 1"
            className="bg-background border-border text-foreground h-10 font-serif text-lg"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs uppercase tracking-wider h-10 mt-6"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Delete Phase
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {phase.entries.map((entry, i) => (
          <EntryEditor
            key={entry.id}
            entry={entry}
            feedbackUrl={feedbackLinks[entry.id] ?? ""}
            onChange={(next) => updateEntry(i, next)}
            onFeedbackUrlChange={(url) => onFeedbackUrlChange(entry.id, url)}
            onDelete={() => deleteEntry(i)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase tracking-wider h-9 self-start bg-transparent"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Add Entry
      </Button>
    </div>
  )
}

export function TimelineEditor({
  initialPhases,
  initialFeedbackLinks,
}: {
  initialPhases: TimelinePhase[]
  initialFeedbackLinks: Record<string, string>
}) {
  const router = useRouter()
  const [phases, setPhases] = useState<TimelinePhase[]>(initialPhases)
  const [feedbackLinks, setFeedbackLinks] = useState<Record<string, string>>(initialFeedbackLinks)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [error, setError] = useState("")

  const updatePhase = (index: number, next: TimelinePhase) => {
    const next2 = phases.slice()
    next2[index] = next
    setPhases(next2)
  }

  const deletePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index))
  }

  const addPhase = () => {
    setPhases([...phases, { id: newId("phase"), title: "", entries: [] }])
  }

  const setFeedbackUrl = (entryId: string, url: string) => {
    setFeedbackLinks((prev) => ({ ...prev, [entryId]: url }))
  }

  const save = async () => {
    setSaving(true)
    setStatus("idle")
    setError("")

    try {
      const timelineRes = await fetch("/api/admin/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases }),
      })
      const timelineData = await timelineRes.json()

      if (!timelineRes.ok) {
        setStatus("error")
        setError(timelineData.error ?? "Unable to save the timeline.")
        return
      }

      const feedbackEntries = phases.flatMap((p) => p.entries).filter((e) => e.hasFeedbackForm === true)
      const feedbackResults = await Promise.all(
        feedbackEntries.map((entry) =>
          fetch("/api/admin/feedback-links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId: entry.id, url: feedbackLinks[entry.id] ?? "" }),
          }),
        ),
      )

      if (feedbackResults.some((r) => !r.ok)) {
        setStatus("error")
        setError("Timeline saved, but one or more feedback links failed to save.")
        return
      }

      setStatus("saved")
      router.refresh()
      setTimeout(() => setStatus("idle"), 2500)
    } catch {
      setStatus("error")
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 -my-3">
        <p className="text-muted-foreground text-sm">
          Edit phases, session entries, and feedback form links below, then save. Nothing is applied until you click
          Save.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-xs h-10"
          >
            {saving ? "Saving..." : status === "saved" ? "Saved ✓" : "Save Timeline"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {phases.map((phase, i) => (
          <PhaseEditor
            key={phase.id}
            phase={phase}
            feedbackLinks={feedbackLinks}
            onChange={(next) => updatePhase(i, next)}
            onFeedbackUrlChange={setFeedbackUrl}
            onDelete={() => deletePhase(i)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addPhase}
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase tracking-wider h-10 self-start bg-transparent"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Add Phase
      </Button>
    </div>
  )
}

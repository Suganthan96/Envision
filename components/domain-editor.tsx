"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DomainIcon } from "@/components/domain-icon"
import type { Domain } from "@/lib/domains"

const ICON_OPTIONS: { value: Domain["icon"]; label: string }[] = [
  { value: "water-energy", label: "Water & Energy" },
  { value: "home", label: "Home" },
  { value: "campus", label: "Campus" },
  { value: "city", label: "City" },
  { value: "agriculture", label: "Agriculture" },
  { value: "health", label: "Health" },
  { value: "waste", label: "Waste" },
  { value: "ai-social", label: "AI / Social" },
  { value: "climate", label: "Climate" },
  { value: "inclusive", label: "Inclusive" },
]

function sdgsToText(sdgs: number[]) {
  return sdgs.join(", ")
}

function parseSdgsText(value: string): number[] {
  return value
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 17)
}

function DomainRowEditor({
  domain,
  onDeleted,
}: {
  domain: Domain
  onDeleted: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(domain.title)
  const [description, setDescription] = useState(domain.description)
  const [icon, setIcon] = useState<Domain["icon"]>(domain.icon)
  const [sdgsText, setSdgsText] = useState(sdgsToText(domain.sdgs))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [error, setError] = useState("")

  const save = async () => {
    setSaving(true)
    setStatus("idle")
    setError("")

    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: domain.id,
          title,
          description,
          icon,
          sdgs: parseSdgsText(sdgsText),
        }),
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

  const remove = async () => {
    if (!window.confirm(`Delete "${domain.title}"? This can't be undone.`)) return
    setDeleting(true)
    setError("")

    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id: domain.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Unable to delete.")
        setDeleting(false)
        return
      }

      onDeleted()
      router.refresh()
    } catch {
      setError("Something went wrong.")
      setDeleting(false)
    }
  }

  return (
    <div className="border border-border bg-card/40 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 flex items-center justify-center text-primary border border-border shrink-0">
          <DomainIcon icon={icon} className="w-7 h-7" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border-border text-foreground h-10"
          />
          <p className="text-muted-foreground text-[10px] font-mono">{domain.id}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={remove}
          disabled={deleting}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs uppercase tracking-wider h-10 shrink-0"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-card border-border text-foreground text-sm min-h-20"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Icon</Label>
          <Select value={icon} onValueChange={(v) => setIcon(v as Domain["icon"])}>
            <SelectTrigger className="bg-card border-border text-foreground w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">SDGs (comma-separated)</Label>
          <Input
            value={sdgsText}
            onChange={(e) => setSdgsText(e.target.value)}
            placeholder="6, 7, 9, 12"
            className="bg-card border-border text-foreground h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {error ? <p className="text-destructive text-xs">{error}</p> : <span />}
        <Button
          type="button"
          onClick={save}
          disabled={saving || !title.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-xs h-9"
        >
          {saving ? "Saving..." : status === "saved" ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  )
}

export function DomainEditor({ initialDomains }: { initialDomains: Domain[] }) {
  const router = useRouter()
  const [domains, setDomains] = useState<Domain[]>(initialDomains)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newIcon, setNewIcon] = useState<Domain["icon"]>("water-energy")
  const [newSdgs, setNewSdgs] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  const addDomain = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    setAddError("")

    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          title: newTitle,
          description: newDescription,
          icon: newIcon,
          sdgs: parseSdgsText(newSdgs),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAddError(data.error ?? "Unable to add theme.")
        return
      }

      setDomains((prev) => [
        ...prev,
        {
          id: data.id,
          title: newTitle.trim(),
          description: newDescription.trim(),
          icon: newIcon,
          sdgs: parseSdgsText(newSdgs),
        },
      ])
      setNewTitle("")
      setNewDescription("")
      setNewIcon("water-energy")
      setNewSdgs("")
      router.refresh()
    } catch {
      setAddError("Something went wrong.")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {domains.map((domain) => (
        <DomainRowEditor
          key={domain.id}
          domain={domain}
          onDeleted={() => setDomains((prev) => prev.filter((d) => d.id !== domain.id))}
        />
      ))}

      <div className="border border-dashed border-primary/40 bg-card/20 p-5 flex flex-col gap-4">
        <p className="text-primary text-xs uppercase tracking-wider">Add New Theme</p>

        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Title</Label>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New theme title"
            className="bg-card border-border text-foreground h-10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Description</Label>
          <Textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What this theme covers..."
            className="bg-card border-border text-foreground text-sm min-h-20"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Icon</Label>
            <Select value={newIcon} onValueChange={(v) => setNewIcon(v as Domain["icon"])}>
              <SelectTrigger className="bg-card border-border text-foreground w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">SDGs (comma-separated)</Label>
            <Input
              value={newSdgs}
              onChange={(e) => setNewSdgs(e.target.value)}
              placeholder="6, 7, 9, 12"
              className="bg-card border-border text-foreground h-9 text-sm"
            />
          </div>
        </div>

        {addError && <p className="text-destructive text-xs">{addError}</p>}

        <Button
          type="button"
          onClick={addDomain}
          disabled={adding || !newTitle.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-xs h-9 self-start"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {adding ? "Adding..." : "Add Theme"}
        </Button>
      </div>
    </div>
  )
}

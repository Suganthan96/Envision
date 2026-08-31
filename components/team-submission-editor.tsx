"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, FolderUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TeamSubmission } from "@/lib/team-submission"

export function TeamSubmissionEditor({
  teamNo,
  driveFolderUrl,
  current,
}: {
  teamNo: string
  driveFolderUrl: string
  current: TeamSubmission
}) {
  const router = useRouter()
  const [driveUrl, setDriveUrl] = useState(current.driveUrl ?? "")
  const [canvaUrl, setCanvaUrl] = useState(current.canvaUrl ?? "")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<"save" | "delete" | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaved(false)
    setBusy("save")
    try {
      const res = await fetch("/api/team-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveUrl: driveUrl.trim(), canvaUrl: canvaUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to save your submission.")
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!confirm("Remove your submission (Drive link and Canva link)?")) return
    setError("")
    setSaved(false)
    setBusy("delete")
    try {
      const res = await fetch("/api/team-submission", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to clear your submission.")
        return
      }
      setDriveUrl("")
      setCanvaUrl("")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center gap-3 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 uppercase tracking-wider ${
            current.driveUrl ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          {current.driveUrl ? "Submitted" : "Not submitted yet"}
        </span>
        {current.updatedAt && (
          <span className="text-muted-foreground">
            Updated {new Date(current.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <ol className="text-sm text-muted-foreground flex flex-col gap-2 list-decimal pl-5">
        <li>
          Name your file <span className="text-foreground font-medium">Team {teamNo} …</span> (e.g.
          <span className="text-foreground"> Team {teamNo} Final Deck.pptx</span>) and upload it to the
          shared Drive folder.
        </li>
        <li>
          Right-click it → <span className="text-foreground">Share → General access → Anyone with the
          link</span> → Copy link, and paste it below.
        </li>
        <li>Optionally, also paste a Canva link to your design.</li>
      </ol>

      {/* Always shown so teams can get back to the folder any time. */}
      <a
        href={driveFolderUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 self-start border border-border bg-card/60 hover:border-primary transition-colors px-3 py-2 text-sm text-foreground rounded-lg"
      >
        <FolderUp className="w-4 h-4 text-primary" />
        Open the shared Drive folder
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
      </a>

      <div className="flex flex-col gap-2">
        <Label htmlFor="drive-url" className="text-primary tracking-[0.15em] uppercase text-xs">
          Google Drive Link <span className="text-destructive">*</span>
        </Label>
        <Input
          id="drive-url"
          type="url"
          required
          value={driveUrl}
          onChange={(e) => {
            setDriveUrl(e.target.value)
            setSaved(false)
          }}
          placeholder="https://drive.google.com/file/d/…"
          maxLength={500}
          className="bg-card border-border text-foreground h-11"
        />
        {current.driveUrl && (
          <a
            href={current.driveUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 self-start"
          >
            <ExternalLink className="w-3 h-3" /> Open saved Drive file
          </a>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="canva-url" className="text-primary tracking-[0.15em] uppercase text-xs">
          Canva Link <span className="text-muted-foreground normal-case tracking-normal">(optional)</span>
        </Label>
        <Input
          id="canva-url"
          type="url"
          value={canvaUrl}
          onChange={(e) => {
            setCanvaUrl(e.target.value)
            setSaved(false)
          }}
          placeholder="https://www.canva.com/design/…"
          maxLength={500}
          className="bg-card border-border text-foreground h-11"
        />
        {current.canvaUrl && (
          <a
            href={current.canvaUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 self-start"
          >
            <ExternalLink className="w-3 h-3" /> Open saved Canva link
          </a>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={busy !== null}
          className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm h-11 px-8"
        >
          {busy === "save" ? "Saving…" : saved ? "Saved" : "Save Submission"}
        </Button>
        {current.driveUrl && (
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={handleDelete}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground uppercase tracking-wider text-xs h-11 gap-2 bg-transparent"
          >
            <Trash2 className="w-4 h-4" />
            {busy === "delete" ? "Removing…" : "Delete Submission"}
          </Button>
        )}
      </div>
    </form>
  )
}

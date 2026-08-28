"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TeamProject } from "@/lib/team-project"

const MAX_TITLE_LENGTH = 200
const MAX_PROBLEM_LENGTH = 1000
const MAX_SHORT_LENGTH = 300
const MAX_LONG_LENGTH = 4000

export function TeamProjectEditor({ currentProject }: { currentProject: TeamProject }) {
  const router = useRouter()

  const [projectTitle, setProjectTitle] = useState(currentProject.projectTitle ?? "")
  const [problemStatement, setProblemStatement] = useState(currentProject.problemStatement ?? "")
  const [solutionShort, setSolutionShort] = useState(currentProject.solutionShort ?? "")
  const [solutionLong, setSolutionLong] = useState(currentProject.solutionLong ?? "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaved(false)
    setSaving(true)
    try {
      const res = await fetch("/api/team-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: projectTitle.trim(),
          problemStatement: problemStatement.trim(),
          solutionShort: solutionShort.trim(),
          solutionLong: solutionLong.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to save your project.")
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-2xl">
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-title" className="text-primary tracking-[0.15em] uppercase text-xs">
          Project Title
        </Label>
        <Input
          id="project-title"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="What is your project called?"
          maxLength={MAX_TITLE_LENGTH}
          className="bg-card border-border text-foreground h-11"
        />
        <p className="text-muted-foreground text-xs text-right">
          {projectTitle.length}/{MAX_TITLE_LENGTH}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="problem-statement" className="text-primary tracking-[0.15em] uppercase text-xs">
          Problem Statement
        </Label>
        <Textarea
          id="problem-statement"
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          placeholder="What problem is your team solving?"
          maxLength={MAX_PROBLEM_LENGTH}
          className="bg-card border-border text-foreground min-h-24"
        />
        <p className="text-muted-foreground text-xs text-right">
          {problemStatement.length}/{MAX_PROBLEM_LENGTH}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="solution-short" className="text-primary tracking-[0.15em] uppercase text-xs">
          Solution — In a Few Words
        </Label>
        <Textarea
          id="solution-short"
          value={solutionShort}
          onChange={(e) => setSolutionShort(e.target.value)}
          placeholder="Sum up your solution in a sentence or two."
          maxLength={MAX_SHORT_LENGTH}
          className="bg-card border-border text-foreground min-h-16"
        />
        <p className="text-muted-foreground text-xs text-right">
          {solutionShort.length}/{MAX_SHORT_LENGTH}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="solution-long" className="text-primary tracking-[0.15em] uppercase text-xs">
          Solution — In Detail
        </Label>
        <Textarea
          id="solution-long"
          value={solutionLong}
          onChange={(e) => setSolutionLong(e.target.value)}
          placeholder="Describe your solution and how it works in more depth."
          maxLength={MAX_LONG_LENGTH}
          className="bg-card border-border text-foreground min-h-48"
        />
        <p className="text-muted-foreground text-xs text-right">
          {solutionLong.length}/{MAX_LONG_LENGTH}
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm h-11 self-start px-8"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save Project"}
      </Button>
    </form>
  )
}

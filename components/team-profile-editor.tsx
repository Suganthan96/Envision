"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEPARTMENTS } from "@/lib/department"
import type { TeamMember } from "@/lib/team-members"

const MAX_MEMBERS = 7

type Draft = { name: string; email: string; department: string }

function toDrafts(members: TeamMember[]): Draft[] {
  if (members.length === 0) return [{ name: "", email: "", department: "" }]
  return members.map((m) => ({ name: m.name, email: m.email ?? "", department: m.department ?? "" }))
}

export function TeamProfileEditor({
  currentTeamName,
  teamNameEditOpen,
  currentMembers,
}: {
  currentTeamName: string | null
  teamNameEditOpen: boolean
  currentMembers: TeamMember[]
}) {
  const router = useRouter()

  const [teamName, setTeamName] = useState(currentTeamName ?? "")
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState("")
  const [nameSaved, setNameSaved] = useState(false)

  const [members, setMembers] = useState<Draft[]>(() => toDrafts(currentMembers))
  const [membersSaving, setMembersSaving] = useState(false)
  const [membersError, setMembersError] = useState("")
  const [membersSaved, setMembersSaved] = useState(false)

  const saveTeamName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError("")
    setNameSaved(false)

    const trimmed = teamName.trim()
    if (!trimmed) {
      setNameError("Team name is required.")
      return
    }

    setNameSaving(true)
    try {
      const res = await fetch("/api/team-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNameError(data.error ?? "Unable to update team name.")
        return
      }
      setNameSaved(true)
      router.refresh()
    } catch {
      setNameError("Something went wrong. Please try again.")
    } finally {
      setNameSaving(false)
    }
  }

  const updateMember = (index: number, field: keyof Draft, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const addMember = () => {
    if (members.length >= MAX_MEMBERS) return
    setMembers((prev) => [...prev, { name: "", email: "", department: "" }])
  }

  const removeMember = (index: number) => {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const saveMembers = async (e: React.FormEvent) => {
    e.preventDefault()
    setMembersError("")
    setMembersSaved(false)

    const trimmed = members.map((m) => ({
      name: m.name.trim(),
      email: m.email.trim(),
      department: m.department.trim(),
    }))
    if (trimmed.some((m) => !m.name)) {
      setMembersError("Every team member needs a name.")
      return
    }

    setMembersSaving(true)
    try {
      const res = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMembersError(data.error ?? "Unable to save the team roster.")
        return
      }
      setMembersSaved(true)
      router.refresh()
    } catch {
      setMembersError("Something went wrong. Please try again.")
    } finally {
      setMembersSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="font-serif text-2xl text-foreground mb-2">Team Name</h2>
        <p className="text-muted-foreground text-sm mb-4">
          {teamNameEditOpen
            ? "The name your team is known by this cycle."
            : "Team names are currently locked by the admin."}
        </p>
        <form onSubmit={saveTeamName} className="flex flex-col sm:flex-row gap-3 max-w-md">
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={!teamNameEditOpen}
            required
            className="bg-card border-border text-foreground h-11 flex-1"
          />
          <Button
            type="submit"
            disabled={!teamNameEditOpen || nameSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm h-11 shrink-0"
          >
            {nameSaving ? "Saving..." : nameSaved ? "Saved" : "Save"}
          </Button>
        </form>
        {nameError && <p className="text-destructive text-sm mt-2">{nameError}</p>}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-foreground mb-2">Team Roster</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Add up to {MAX_MEMBERS} members, including your team lead, with each member&apos;s email and department.
          You can come back and edit this anytime.
        </p>
        <form onSubmit={saveMembers} className="flex flex-col gap-4 max-w-2xl">
          <div className="flex flex-col gap-3">
            {members.map((member, index) => (
              <div key={index} className="flex flex-col gap-1.5 border border-border bg-card/40 p-4 relative">
                <Label className="text-primary tracking-[0.15em] uppercase text-[10px]">
                  {index === 0 ? "Team Lead" : `Member ${index + 1}`}
                </Label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input
                    value={member.name}
                    onChange={(e) => updateMember(index, "name", e.target.value)}
                    placeholder="Name"
                    required
                    className="bg-background border-border text-foreground h-10 text-sm"
                  />
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateMember(index, "email", e.target.value)}
                    placeholder="Email address"
                    className="bg-background border-border text-foreground h-10 text-sm"
                  />
                  <Select
                    value={member.department || undefined}
                    onValueChange={(v) => updateMember(index, "department", v)}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground h-10 text-sm w-full">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    aria-label={`Remove member ${index + 1}`}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={addMember}
              disabled={members.length >= MAX_MEMBERS}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-10 bg-transparent"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Member
            </Button>
            <Button
              type="submit"
              disabled={membersSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm h-10"
            >
              {membersSaving ? "Saving..." : membersSaved ? "Saved" : "Save Roster"}
            </Button>
          </div>
          {membersError && <p className="text-destructive text-sm">{membersError}</p>}
        </form>
      </section>
    </div>
  )
}

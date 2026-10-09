"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface YearRow {
  id: string
  label: string
  isCurrent: boolean
  stats: {
    teams: number
    mentors: number
    evaluators: number
    rounds: number
    scored: number
    submitted: number
  } | null
}

async function callYears(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/years", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
  return data
}

/** "2026-27" → "2027-28". */
function nextYearId(id: string | undefined) {
  const start = Number(id?.slice(0, 4))
  if (!Number.isFinite(start) || !start) return ""
  return `${start + 1}-${String((start + 2) % 100).padStart(2, "0")}`
}

const MENTOR_ID = /^3111\d{8}$/

/* ------------------------------------------------------------------ list -- */

export function YearsList({ years, editing }: { years: YearRow[]; editing: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function run(key: string, payload: Record<string, unknown>, then?: string) {
    setError("")
    setBusy(key)
    try {
      await callYears(payload)
      if (then) router.push(then)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const current = years.find((y) => y.isCurrent)

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      {years.map((y) => {
        const s = y.stats
        return (
          <section
            key={y.id}
            className={cn(
              "rounded-xl border bg-card/40 backdrop-blur-sm p-5 sm:p-6 flex flex-col gap-4",
              y.isCurrent ? "border-primary/60" : "border-border",
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl text-foreground">
                {y.label}
                {y.isCurrent && (
                  <span className="ml-3 align-middle text-sm font-sans text-primary">Current year</span>
                )}
                {y.id === editing && !y.isCurrent && (
                  <span className="ml-3 align-middle text-sm font-sans text-muted-foreground">You&apos;re editing this year</span>
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {y.id !== editing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => run(`open-${y.id}`, { action: "open", edition: y.isCurrent ? "" : y.id }, "/admin")}
                  >
                    {busy === `open-${y.id}` ? "Opening…" : `Work in ${y.label}`}
                  </Button>
                )}
                {!y.isCurrent &&
                  (confirming === y.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => run(`current-${y.id}`, { action: "set-current", edition: y.id })}
                      >
                        {busy === `current-${y.id}` ? "Switching…" : `Yes, make ${y.label} current`}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(y.id)}>
                      Make current
                    </Button>
                  ))}
              </div>
            </div>
            {confirming === y.id && (
              <p className="text-sm text-foreground border-l-2 border-primary pl-3">
                Teams, mentors and evaluators will sign in to {y.label} instead of {current?.label}, so{" "}
                {current?.label} logins stop working. Nothing in either year is deleted: you can still open{" "}
                {current?.label} here, its projects stay on the public pages, and you can switch back at any time.
              </p>
            )}
            {s ? (
              <dl className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-sm">
                {(
                  [
                    ["Teams", s.teams],
                    ["Decks in", s.submitted],
                    ["Teams scored", s.scored],
                    ["Mentors", s.mentors],
                    ["Evaluators", s.evaluators],
                    ["Rounds", s.rounds],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-serif text-2xl text-foreground tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- wizard -- */

const COPY_OPTIONS = [
  { key: "themes", label: "Themes and their capacities", hint: "The themes teams pick from, ready to edit." },
  { key: "rounds", label: "Judging round templates", hint: "Each round's criteria and tie-break order. No scores." },
  { key: "rooms", label: "Rooms", hint: "Lab venues and judging and waiting rooms. No room assignments." },
  { key: "timeline", label: "Timeline", hint: "As a draft to update with the new dates." },
  { key: "guidelines", label: "Guidelines", hint: "The guideline slides and file, as a draft." },
] as const

type CopyKey = (typeof COPY_OPTIONS)[number]["key"]

export function StartYearForm({ years }: { years: YearRow[] }) {
  const router = useRouter()
  const current = years.find((y) => y.isCurrent) ?? years[0]
  const latest = years[0]
  const [id, setId] = useState(nextYearId(latest?.id))
  const [from, setFrom] = useState(current?.id ?? "")
  const [copy, setCopy] = useState<Record<CopyKey, boolean>>({
    themes: true,
    rounds: true,
    rooms: true,
    timeline: true,
    guidelines: true,
  })
  const [teamCount, setTeamCount] = useState("")
  const [mentorText, setMentorText] = useState("")
  const [makeCurrent, setMakeCurrent] = useState(false)
  const [review, setReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState<string | null>(null)

  const label = id.replace("-", "–")
  const idValid = /^\d{4}-\d{2}$/.test(id) && !years.some((y) => y.id === id)
  const mentors = useMemo(
    () => [...new Set(mentorText.split(/[\s,;]+/).map((m) => m.trim()).filter(Boolean))],
    [mentorText],
  )
  const badMentors = mentors.filter((m) => !MENTOR_ID.test(m))
  const teams = teamCount === "" ? 0 : Number(teamCount)
  const teamsValid = Number.isInteger(teams) && teams >= 0 && teams <= 500
  const canReview = idValid && teamsValid && badMentors.length === 0
  const fromLabel = years.find((y) => y.id === from)?.label ?? from

  async function start() {
    setError("")
    setBusy(true)
    try {
      await callYears({
        action: "start",
        edition: id,
        label,
        from,
        options: copy,
        teamCount: teams,
        mentorIds: mentors,
        makeCurrent,
      })
      setDone(label)
      setReview(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the year.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-foreground">
          {done} is ready, and the admin pages now show it. Next: check the themes and rounds, update the
          timeline, then open domain selection when you&apos;re ready.
        </p>
        <div>
          <Button type="button" onClick={() => router.push("/admin")}>
            Go to {done}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year-id">New year</Label>
          <Input
            id="year-id"
            value={id}
            onChange={(e) => setId(e.target.value.trim())}
            placeholder="2027-28"
            className="bg-card"
            aria-invalid={!idValid}
          />
          <p className={cn("text-xs", idValid ? "text-muted-foreground" : "text-destructive")}>
            {idValid
              ? `Shown as ${label}.`
              : years.some((y) => y.id === id)
                ? `${label} already exists.`
                : "Write it as 2027-28."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year-from">Start from</Label>
          <select
            id="year-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Only what you tick below is copied. {fromLabel} itself is never changed.
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm text-foreground mb-2">Copy from {fromLabel} as a starting point</legend>
        {COPY_OPTIONS.map((o) => (
          <label key={o.key} className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={copy[o.key]}
              onCheckedChange={(v) => setCopy((c) => ({ ...c, [o.key]: v === true }))}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm text-foreground">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          Never copied: teams, rosters, projects, mentors, allocations, selections, scores and evaluator sheets.
          Admin accounts work in every year.
        </p>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-count">Number of teams</Label>
          <Input
            id="team-count"
            type="number"
            min={0}
            max={500}
            inputMode="numeric"
            value={teamCount}
            onChange={(e) => setTeamCount(e.target.value)}
            placeholder="62"
            className="bg-card"
            aria-invalid={!teamsValid}
          />
          <p className={cn("text-xs", teamsValid ? "text-muted-foreground" : "text-destructive")}>
            {teamsValid
              ? teams > 0
                ? `Creates team logins 1 to ${teams}, each with the password licet@123.`
                : "You can also add teams later under Users."
              : "Enter a number from 0 to 500."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mentor-ids">Mentor registration numbers</Label>
          <Textarea
            id="mentor-ids"
            value={mentorText}
            onChange={(e) => setMentorText(e.target.value)}
            placeholder={"311122104001\n311122104002"}
            rows={5}
            className="bg-card font-mono text-sm"
            aria-invalid={badMentors.length > 0}
          />
          <p className={cn("text-xs", badMentors.length ? "text-destructive" : "text-muted-foreground")}>
            {badMentors.length
              ? `Not a 12-digit number starting 3111: ${badMentors.slice(0, 4).join(", ")}${badMentors.length > 4 ? "…" : ""}`
              : mentors.length
                ? `${mentors.length} mentor login${mentors.length === 1 ? "" : "s"}, each with the password licet@123.`
                : "One per line. You can also add mentors later under Users."}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={makeCurrent} onCheckedChange={(v) => setMakeCurrent(v === true)} className="mt-0.5" />
        <span>
          <span className="block text-sm text-foreground">Make {label || "it"} the current year now</span>
          <span className="block text-xs text-muted-foreground">
            Leave this off to set the year up first. Teams and mentors keep signing in to{" "}
            {years.find((y) => y.isCurrent)?.label} until you make the new year current.
          </span>
        </span>
      </label>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {review ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/60 p-4">
          <p className="text-foreground">
            Create <strong>{label}</strong> from {fromLabel}, copying{" "}
            {COPY_OPTIONS.filter((o) => copy[o.key])
              .map((o) => o.label.toLowerCase())
              .join(", ") || "nothing"}
            , with {teams} team login{teams === 1 ? "" : "s"} and {mentors.length} mentor login
            {mentors.length === 1 ? "" : "s"}.{" "}
            {makeCurrent ? `${label} becomes the current year straight away.` : `${fromLabel} stays the current year.`}
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={start} disabled={busy}>
              {busy ? "Creating…" : `Create ${label}`}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReview(false)} disabled={busy}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" onClick={() => setReview(true)} disabled={!canReview}>
            Review
          </Button>
        </div>
      )}
    </div>
  )
}

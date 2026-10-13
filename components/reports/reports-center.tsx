"use client"

import { useRef, useState, type ReactNode } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SearchableSelect } from "@/components/searchable-select"
import { cn } from "@/lib/utils"
import type { ReportData } from "@/lib/reports/types"

export interface ReportTeamOption {
  loginId: string
  teamName: string
}
export interface ReportRoundOption {
  id: string
  name: string
  live: boolean
  published: boolean
}

/** Fetches the year's records once per page visit; every report reuses them. */
function useReportData() {
  const cache = useRef<Promise<ReportData> | null>(null)
  return () => {
    if (!cache.current) {
      cache.current = fetch("/api/admin/reports", { cache: "no-store" }).then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          cache.current = null
          throw new Error(body.error ?? "Could not gather the records.")
        }
        return body as ReportData
      })
    }
    return cache.current
  }
}

type Format = "pdf" | "xlsx"

function FormatIcon({ format }: { format: Format }) {
  return format === "pdf" ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />
}

/** A download button that shows its own progress and errors. */
function DownloadButton({
  label,
  format,
  run,
  disabled,
  primary,
}: {
  label: string
  format: Format
  run: (setStatus: (s: string) => void) => Promise<void>
  disabled?: boolean
  primary?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant={primary ? "default" : "outline"}
        disabled={busy || disabled}
        onClick={async () => {
          setError("")
          setBusy(true)
          setStatus("Gathering the records…")
          try {
            await run(setStatus)
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.")
          } finally {
            setBusy(false)
            setStatus("")
          }
        }}
        className="gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FormatIcon format={format} />}
        {label}
      </Button>
      {busy && status && <span className="text-xs text-muted-foreground">{status}</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}

function Report({ title, children, description, controls }: { title: string; description: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <div>
        <h3 className="text-foreground font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{description}</p>
      </div>
      {controls}
      <div className="flex flex-wrap items-start gap-2">{children}</div>
    </div>
  )
}

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card/40 backdrop-blur-sm p-5 sm:p-6">
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      {intro && <p className="text-sm text-muted-foreground mt-1">{intro}</p>}
      <div className="mt-5 flex flex-col divide-y divide-border">{children}</div>
    </section>
  )
}

/**
 * Every download the admin can make for the year being worked in: programme
 * statistics, individual and all-team reports, team, student, mentor,
 * evaluator and account records, round results, the leaderboard for any mix
 * of rounds, and one workbook with everything.
 */
export function ReportsCenter({
  yearLabel,
  teams,
  rounds,
}: {
  yearLabel: string
  teams: ReportTeamOption[]
  rounds: ReportRoundOption[]
}) {
  const getData = useReportData()
  const [team, setTeam] = useState(teams[0]?.loginId ?? "")
  const [round, setRound] = useState(rounds.find((r) => r.live)?.id ?? rounds[0]?.id ?? "")
  const published = rounds.filter((r) => r.published).map((r) => r.id)
  const [boardRounds, setBoardRounds] = useState<string[]>(
    published.length ? published : rounds.filter((r) => r.live).map((r) => r.id),
  )

  // The builders are loaded only when a file is made, with jsPDF / SheetJS.
  const pdf = () => import("@/lib/reports/pdf")
  const xlsx = () => import("@/lib/reports/xlsx")

  async function workbook(what: string, build: (x: Awaited<ReturnType<typeof xlsx>>, d: ReportData) => import("@/lib/reports/xlsx").Sheet[]) {
    const [d, x] = await Promise.all([getData(), xlsx()])
    await x.downloadWorkbook(`${x.fileStem(d, what)}.xlsx`, build(x, d))
  }

  const teamOptions = teams.map((t) => ({ value: t.loginId, label: `#${t.loginId} · ${t.teamName}` }))
  const roundOptions = rounds.map((r) => ({ value: r.id, label: `${r.name}${r.live ? " (live)" : ""}` }))
  const chosenRound = (d: ReportData) => {
    const r = d.rounds.find((x) => x.id === round)
    if (!r) throw new Error("Pick a round first.")
    return r
  }
  const chosenBoard = (d: ReportData) => {
    const rs = d.rounds.filter((r) => boardRounds.includes(r.id))
    if (!rs.length) throw new Error("Switch on at least one round.")
    return rs
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Every file is for <span className="text-foreground">{yearLabel}</span>, the year these admin pages are showing.
        Switch the Year above to download another year&apos;s records. Hidden accounts are left out of the team,
        mentor and statistics reports, and passwords are never included.
      </p>

      <Section title="Programme overview" intro="Where the whole programme stands, in numbers and charts.">
        <Report
          title="Programme statistics"
          description="Teams, students by department, team sizes, themes against capacity, mentor coverage, project progress, every judging round (average, median, range, criteria, score distribution, top 10), the leaderboard and the timeline."
        >
          <DownloadButton primary label="PDF report" format="pdf" run={async () => (await pdf()).downloadProgrammeReport(await getData())} />
          <DownloadButton label="Excel workbook" format="xlsx" run={() => workbook("Statistics", (x, d) => x.statisticsSheets(d))} />
        </Report>
        <Report
          title="Everything"
          description="One workbook with every sheet below: statistics, teams, students, mentors, evaluators, each round's results and evaluator sheets, accounts, theme selections, rooms and the timeline."
        >
          <DownloadButton label="Excel workbook" format="xlsx" run={() => workbook("All records", (x, d) => x.everythingSheets(d))} />
        </Report>
      </Section>

      <Section title="Teams" intro="One team, every team, or the full lists.">
        <Report
          title="Team report"
          description="One team on a few pages: logo, theme, mentor, rooms, members with departments, the project write-up, deck links, and every round's marks with its rank and each evaluator's sheet."
          controls={
            <div className="w-full sm:max-w-sm">
              <SearchableSelect value={team} onChange={setTeam} options={teamOptions} allLabel="Pick a team" placeholder="Search teams…" />
            </div>
          }
        >
          <DownloadButton
            primary
            label="Team report (PDF)"
            format="pdf"
            disabled={!team}
            run={async () => {
              const d = await getData()
              const t = d.teams.find((x) => x.loginId === team)
              if (!t) throw new Error("That team isn't in this year's records.")
              await (await pdf()).downloadTeamReport(d, t)
            }}
          />
          <DownloadButton
            label="Every team's report (one PDF)"
            format="pdf"
            run={async (setStatus) => {
              const d = await getData()
              setStatus("Fetching team logos…")
              await (await pdf()).downloadAllTeamReports(d, (done, total) => setStatus(`Writing team ${done} of ${total}…`))
            }}
          />
        </Report>
        <Report
          title="Team list"
          description="One row per team: lead and contact, members, theme, mentor, lab venue, judging and waiting rooms, project title, problem, solution, deck links, and each round's score and rank."
        >
          <DownloadButton label="Excel" format="xlsx" run={() => workbook("Teams", (x, d) => x.teamSheets(d))} />
        </Report>
        <Report title="Student roster" description="Every student: name, email, department, team, theme and mentor.">
          <DownloadButton label="Excel" format="xlsx" run={() => workbook("Students", (x, d) => x.studentSheets(d))} />
        </Report>
      </Section>

      <Section title="Mentors and evaluators">
        <Report
          title="Mentor directory and results"
          description="Every mentor's contact details, themes, lab venue, teams and profile completeness, plus a sheet of each mentor's teams with their scores and overall rank."
        >
          <DownloadButton label="Excel" format="xlsx" run={() => workbook("Mentors", (x, d) => x.mentorSheets(d))} />
        </Report>
        <Report
          title="Evaluator activity"
          description="Every faculty member and juror with their rooms, extra teams, and how many sheets they filed in each round."
        >
          <DownloadButton label="Excel" format="xlsx" run={() => workbook("Evaluators", (x, d) => x.evaluatorSheets(d))} />
        </Report>
      </Section>

      <Section title="Judging and results">
        <Report
          title="Round results"
          description="Every team in one round, ranked with the round's tie-break order: marks per criterion, total and how many evaluators marked it. The spreadsheet adds every individual evaluator sheet."
          controls={
            <div className="w-full sm:max-w-sm">
              <SearchableSelect value={round} onChange={setRound} options={roundOptions} allLabel="Pick a round" placeholder="Search rounds…" />
            </div>
          }
        >
          <DownloadButton primary label="PDF" format="pdf" disabled={!round} run={async () => { const d = await getData(); await (await pdf()).downloadRoundResults(d, chosenRound(d)) }} />
          <DownloadButton label="Excel with evaluator sheets" format="xlsx" disabled={!round} run={() => workbook(`${rounds.find((r) => r.id === round)?.name ?? "Round"} results`, (x, d) => x.roundSheets(d, chosenRound(d)))} />
        </Report>
        <Report
          title="Leaderboard"
          description="Rank teams by one round, or by the average of several. Starts on the rounds teams see; a round a team has no score in counts as 0."
          controls={
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {rounds.map((r) => {
                const on = boardRounds.includes(r.id)
                return (
                  <li key={r.id}>
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked={on} onCheckedChange={() => setBoardRounds((cur) => (on ? cur.filter((x) => x !== r.id) : [...cur, r.id]))} />
                      <span className={cn(on ? "text-foreground" : "text-muted-foreground")}>{r.name}</span>
                      {r.published && <span className="text-xs text-primary">teams see this</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
          }
        >
          <DownloadButton primary label="PDF" format="pdf" disabled={!boardRounds.length} run={async () => { const d = await getData(); await (await pdf()).downloadLeaderboard(d, chosenBoard(d)) }} />
          <DownloadButton label="Excel" format="xlsx" disabled={!boardRounds.length} run={() => workbook("Leaderboard", (x, d) => x.leaderboardSheets(d, chosenBoard(d)))} />
        </Report>
      </Section>

      <Section title="Records">
        <Report
          title="Accounts"
          description="Every login with its role, name, phone, email, whether it's hidden and whether the starting password has been changed. No passwords."
        >
          <DownloadButton label="Excel" format="xlsx" run={() => workbook("Accounts", (x, d) => x.accountSheets(d))} />
        </Report>
        <Report
          title="Selections, rooms and timeline"
          description="Which teams and mentors chose each theme (and who hasn't), every team's lab, judging and waiting room, and the full session timeline."
        >
          <DownloadButton label="Excel" format="xlsx" run={() => workbook("Selections rooms timeline", (x, d) => x.selectionSheets(d))} />
        </Report>
      </Section>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" />
        Files are made in your browser from the live records, so they always match what the admin pages show.
      </p>
    </div>
  )
}

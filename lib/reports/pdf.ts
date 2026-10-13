import type { jsPDF as JsPDF } from "jspdf"
import type { ReportData, ReportRound, ReportTeam } from "@/lib/reports/types"
import { when } from "@/lib/reports/format"
import { defaultLeaderboardRounds, leaderboard, programmeStats, roundStats, teamResults } from "@/lib/reports/compute"

/**
 * The PDF reports, drawn in the browser with jsPDF + autotable (loaded only
 * when a report is downloaded). One look throughout: navy headings with a
 * gold rule, plain tables, a running header and "page n of N" footer.
 *
 * Charts are single-series bars in one ink colour with the value written at
 * the end of each bar, on one axis; a theme's capacity is drawn as a pale
 * track behind its bar. Nothing relies on colour alone.
 */

type RGB = [number, number, number]
const NAVY: RGB = [31, 56, 100]
const GOLD: RGB = [176, 128, 24]
const INK: RGB = [28, 28, 28]
const MUTED: RGB = [105, 105, 105]
const RULE: RGB = [214, 214, 214]
const TRACK: RGB = [228, 232, 240]
const ZEBRA: RGB = [246, 247, 250]

const M = 48 // page margin, pt
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTable = (doc: JsPDF, opts: Record<string, any>) => void

/** jsPDF's built-in fonts are Latin-1: drop anything they can't draw. */
export function safe(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
}

const fmt = (n: number | null | undefined, digits = 2) =>
  n == null ? "-" : Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")

async function newDoc(orientation: "portrait" | "landscape" = "portrait") {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation })
  return { doc, autoTable: autoTableModule.default as unknown as AutoTable }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lastY = (doc: JsPDF) => ((doc as any).lastAutoTable?.finalY as number) ?? M

/** Running header and "page n of N" footer on every page, drawn last. */
function finishPages(doc: JsPDF, data: ReportData, title: string) {
  const n = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const made = when(data.generatedAt)
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    if (i > 1) doc.text(safe(`EnVision ${data.year.label}  \u00b7  ${title}`), M, 28)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.5)
    doc.line(M, h - 34, w - M, h - 34)
    doc.text(safe(`Generated ${made}`), M, h - 22)
    doc.text(`Page ${i} of ${n}`, w - M, h - 22, { align: "right" })
  }
}

class Writer {
  y = M
  constructor(
    public doc: JsPDF,
    public autoTable: AutoTable,
  ) {}
  get w() {
    return this.doc.internal.pageSize.getWidth()
  }
  get h() {
    return this.doc.internal.pageSize.getHeight()
  }
  get inner() {
    return this.w - 2 * M
  }
  /** Starts a new page when fewer than `needed` points are left. */
  room(needed: number) {
    if (this.y + needed > this.h - 54) {
      this.doc.addPage()
      this.y = M
    }
  }
  title(text: string, sub?: string) {
    const d = this.doc
    d.setFont("helvetica", "bold")
    d.setFontSize(9)
    d.setTextColor(...GOLD)
    d.text(safe("ENVISION  \u00b7  INSTITUTION'S INNOVATION COUNCIL, LICET"), M, this.y)
    this.y += 26
    d.setFontSize(24)
    d.setTextColor(...NAVY)
    const lines = d.splitTextToSize(safe(text), this.inner)
    d.text(lines, M, this.y)
    this.y += lines.length * 26
    if (sub) {
      d.setFont("helvetica", "normal")
      d.setFontSize(11)
      d.setTextColor(...MUTED)
      d.text(safe(sub), M, this.y)
      this.y += 10
    }
    d.setDrawColor(...GOLD)
    d.setLineWidth(1.5)
    d.line(M, this.y + 6, this.w - M, this.y + 6)
    this.y += 28
  }
  heading(text: string) {
    this.room(70)
    const d = this.doc
    d.setFont("helvetica", "bold")
    d.setFontSize(14)
    d.setTextColor(...NAVY)
    d.text(safe(text), M, this.y)
    d.setDrawColor(...GOLD)
    d.setLineWidth(0.8)
    d.line(M, this.y + 5, M + 40, this.y + 5)
    this.y += 22
  }
  /** `keep`: room needed for what follows, so a heading never ends a page alone. */
  subheading(text: string, keep = 50) {
    this.room(keep)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(11)
    this.doc.setTextColor(...INK)
    this.doc.text(safe(text), M, this.y)
    this.y += 14
  }
  para(text: string, opts: { size?: number; color?: RGB; gap?: number } = {}) {
    const d = this.doc
    d.setFont("helvetica", "normal")
    d.setFontSize(opts.size ?? 10)
    d.setTextColor(...(opts.color ?? INK))
    const lines = d.splitTextToSize(safe(text), this.inner) as string[]
    const lh = (opts.size ?? 10) * 1.4
    for (const line of lines) {
      this.room(lh)
      d.text(line, M, this.y)
      this.y += lh
    }
    this.y += opts.gap ?? 6
  }
  /** A row of big numbers with small labels. */
  tiles(items: { value: string | number; label: string }[]) {
    const per = Math.min(items.length, 4)
    const gap = 10
    const tw = (this.inner - gap * (per - 1)) / per
    const th = 54
    items.forEach((it, i) => {
      const col = i % per
      if (col === 0 && i > 0) this.y += th + gap
      if (col === 0) this.room(th)
      const x = M + col * (tw + gap)
      this.doc.setFillColor(...ZEBRA)
      this.doc.setDrawColor(...RULE)
      this.doc.roundedRect(x, this.y, tw, th, 4, 4, "FD")
      this.doc.setFont("helvetica", "bold")
      this.doc.setFontSize(18)
      this.doc.setTextColor(...NAVY)
      this.doc.text(safe(item(it.value)), x + 10, this.y + 25)
      this.doc.setFont("helvetica", "normal")
      this.doc.setFontSize(8.5)
      this.doc.setTextColor(...MUTED)
      this.doc.text(this.doc.splitTextToSize(safe(it.label), tw - 20).slice(0, 2), x + 10, this.y + 39)
    })
    this.y += th + 18
    function item(v: string | number) {
      return typeof v === "number" ? String(v) : v
    }
  }
  table(head: string[], body: (string | number)[][], opts: Record<string, unknown> = {}) {
    // Short tables (a team's marks, a summary) are kept on one page.
    this.room(body.length <= 14 ? 30 + body.length * 20 : 60)
    this.autoTable(this.doc, {
      startY: this.y,
      margin: { left: M, right: M, top: 44, bottom: 50 },
      head: [head.map((h) => safe(h))],
      body: body.map((r) => r.map((c) => safe(c))),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: INK, lineColor: RULE, lineWidth: 0.5, overflow: "linebreak" },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: ZEBRA },
      ...opts,
    })
    this.y = lastY(this.doc) + 18
  }
  /** Label / value pairs as a two-column table without a header. */
  facts(rows: [string, string | number | null | undefined][]) {
    this.room(40)
    this.autoTable(this.doc, {
      startY: this.y,
      margin: { left: M, right: M, top: 44, bottom: 50 },
      body: rows.map(([k, v]) => [safe(k), safe(v == null || v === "" ? "-" : v)]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 0, right: 6 }, textColor: INK },
      columnStyles: { 0: { cellWidth: 130, textColor: MUTED } },
    })
    this.y = lastY(this.doc) + 14
  }
  /**
   * Horizontal bars: one per item, value written at the bar's end. `cap`
   * draws a pale track to the item's capacity behind the bar.
   */
  bars(items: { label: string; value: number; cap?: number }[], opts: { labelWidth?: number; caption?: string } = {}) {
    const d = this.doc
    const lw = opts.labelWidth ?? 150
    const rowH = 17
    const barH = 9
    const plotW = this.inner - lw - 40
    const top = Math.max(1, ...items.map((i) => Math.max(i.value, i.cap ?? 0)))
    this.room(items.length * rowH + 30)
    items.forEach((it, i) => {
      const y = this.y + i * rowH
      d.setFont("helvetica", "normal")
      d.setFontSize(8.5)
      d.setTextColor(...INK)
      const label = d.splitTextToSize(safe(it.label), lw - 8)[0] as string
      d.text(label, M, y + barH - 1)
      if (it.cap) {
        d.setFillColor(...TRACK)
        d.roundedRect(M + lw, y, (it.cap / top) * plotW, barH, 2, 2, "F")
      }
      const bw = Math.max(it.value > 0 ? 2 : 0, (it.value / top) * plotW)
      if (bw > 0) {
        d.setFillColor(...NAVY)
        d.roundedRect(M + lw, y, bw, barH, 2, 2, "F")
      }
      d.setTextColor(...INK)
      d.text(it.cap ? `${it.value} / ${it.cap}` : String(it.value), M + lw + Math.max(bw, it.cap ? (it.cap / top) * plotW : 0) + 5, y + barH - 1)
    })
    this.y += items.length * rowH + 4
    if (opts.caption) this.para(opts.caption, { size: 8, color: MUTED, gap: 10 })
    else this.y += 10
  }
  /** Vertical bars for a distribution, count written above each bar. */
  columns(items: { label: string; value: number }[], caption?: string) {
    const d = this.doc
    const chartH = 110
    this.room(chartH + 50)
    const top = Math.max(1, ...items.map((i) => i.value))
    const slot = this.inner / items.length
    const bw = Math.min(34, slot - 6)
    const base = this.y + chartH
    d.setDrawColor(...RULE)
    d.setLineWidth(0.5)
    d.line(M, base, M + this.inner, base)
    items.forEach((it, i) => {
      const x = M + i * slot + (slot - bw) / 2
      const bh = (it.value / top) * (chartH - 14)
      if (bh > 0) {
        d.setFillColor(...NAVY)
        d.roundedRect(x, base - bh, bw, bh, 2, 2, "F")
      }
      d.setFont("helvetica", "normal")
      d.setFontSize(8)
      d.setTextColor(...INK)
      d.text(String(it.value), x + bw / 2, base - bh - 4, { align: "center" })
      d.setTextColor(...MUTED)
      d.text(safe(it.label), x + bw / 2, base + 11, { align: "center" })
    })
    this.y = base + 24
    if (caption) this.para(caption, { size: 8, color: MUTED, gap: 10 })
  }
}

/** Fetches an image URL as a JPEG data URI jsPDF can embed (null if it can't). */
async function imageData(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const bmp = await createImageBitmap(blob)
    const size = 160
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)
    const s = Math.min(size / bmp.width, size / bmp.height)
    ctx.drawImage(bmp, (size - bmp.width * s) / 2, (size - bmp.height * s) / 2, bmp.width * s, bmp.height * s)
    return canvas.toDataURL("image/jpeg", 0.88)
  } catch {
    return null
  }
}

const fileName = (data: ReportData, what: string) => safe(`EnVision ${data.year.id} - ${what}.pdf`).replace(/[\\/:*?"<>|]/g, "")

/* ================================================== programme report == */

export async function downloadProgrammeReport(data: ReportData) {
  const { doc, autoTable } = await newDoc()
  const w = new Writer(doc, autoTable)
  const s = programmeStats(data)
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "-")

  w.title(`Programme statistics, ${data.year.label}`, data.year.isCurrent ? "Current programme year" : "Programme year (not the current one)")
  w.tiles([
    { value: s.teams, label: "Teams" },
    { value: s.students, label: "Students" },
    { value: s.mentors, label: `Mentors (${s.mentorsGuiding} guiding a team)` },
    { value: s.evaluators, label: `Evaluators (${s.faculty} faculty, ${s.jury} jury)` },
    { value: `${s.submitted}/${s.teams}`, label: "Decks submitted" },
    { value: `${s.teamsWithMentor}/${s.teams}`, label: "Teams with a mentor" },
    { value: data.domains.length, label: "Themes" },
    { value: data.rounds.length, label: "Judging rounds" },
  ])

  w.heading("Participation")
  w.para(
    `${s.students} students in ${s.teams} teams, an average of ${s.teams ? (s.students / s.teams).toFixed(1) : "-"} per team, from ${s.departments.filter((d) => d.name !== "Not given").length} departments.`,
  )
  w.subheading("Students by department", s.departments.length * 17 + 40)
  w.bars(s.departments.map((d) => ({ label: d.name, value: d.count })), { labelWidth: 110 })
  w.subheading("Teams by size")
  w.table(
    ["Members per team", "Teams"],
    s.teamSizes.map((t) => [t.size, t.count]),
    { tableWidth: 220 },
  )

  w.heading("Themes")
  w.para(`${s.teams - s.noTheme} of ${s.teams} teams have picked a theme.`)
  w.subheading("Teams per theme", s.themes.length * 17 + 50)
  w.bars(
    s.themes.map((t) => ({ label: t.title, value: t.teams, cap: t.teamCapacity || undefined })),
    { labelWidth: 210, caption: "Dark bar: teams that picked the theme. Pale track: the theme's capacity." },
  )
  w.table(
    ["Theme", "SDGs", "Teams", "Capacity", "Mentors", "Capacity"],
    s.themes.map((t) => [t.title, t.sdgs.join(", "), t.teams, t.teamCapacity, t.mentors, t.mentorCapacity]),
    { columnStyles: { 0: { cellWidth: 200 } } },
  )

  w.heading("Mentors")
  w.facts([
    ["Mentors", s.mentors],
    ["Guiding at least one team", `${s.mentorsGuiding} (${pct(s.mentorsGuiding, s.mentors)})`],
    ["Teams with a mentor", `${s.teamsWithMentor} of ${s.teams} (${pct(s.teamsWithMentor, s.teams)})`],
    ...s.mentorLoad.map((m) => [`Mentors with ${m.teams} team${m.teams === 1 ? "" : "s"}`, m.mentors] as [string, number]),
  ])

  w.heading("Project progress")
  w.bars(
    [
      { label: "Project title", value: s.withProjectTitle, cap: s.teams },
      { label: "Problem statement", value: s.withProblem, cap: s.teams },
      { label: "Solution", value: s.withSolution, cap: s.teams },
      { label: "Deck submitted", value: s.submitted, cap: s.teams },
      { label: "Judging room", value: s.withJudgingRoom, cap: s.teams },
    ],
    { labelWidth: 120, caption: `Teams out of ${s.teams}.` },
  )

  for (const r of s.rounds) {
    w.heading(`Judging: ${r.round.name}`)
    w.para(
      `${r.round.live ? "The live round. " : ""}${r.round.published ? "Shown on the leaderboard. " : ""}Out of ${r.round.max}. ${r.scored} of ${s.teams} teams scored${r.sheets ? `, from ${r.sheets} evaluator sheets by ${r.evaluators} evaluators` : ""}.`,
    )
    if (r.scored === 0) {
      w.para("No scores yet.", { color: MUTED })
      continue
    }
    w.facts([
      ["Average", `${fmt(r.totals.mean)} / ${r.round.max}`],
      ["Median", fmt(r.totals.median)],
      ["Lowest - highest", `${fmt(r.totals.min)} - ${fmt(r.totals.max)}`],
      ["Standard deviation", fmt(r.totals.sd)],
    ])
    w.subheading("Criteria", 40 + r.criteria.length * 20)
    w.table(
      ["Criterion", "Out of", "Average", "Average %", "Lowest", "Highest"],
      r.criteria.map((c) => [c.label, c.outOf, fmt(c.mean), c.percent == null ? "-" : `${c.percent}%`, fmt(c.min), fmt(c.max)]),
      { columnStyles: { 0: { cellWidth: 190 } } },
    )
    w.subheading("Score distribution", 180)
    w.columns(r.bands.map((b) => ({ label: b.label, value: b.count })), `Teams per band of ${r.bands[0] ? r.bands[0].to - r.bands[0].from : 5} marks.`)
    w.subheading("Top 10")
    w.table(
      ["Rank", "Team", "Theme", "Mentor", "Score"],
      r.rows.filter((x) => x.rank != null).slice(0, 10).map((x) => [x.rank!, `${x.team.teamName} (#${x.team.loginId})`, x.team.domainTitle ?? "-", x.team.mentorName ?? "-", fmt(x.total)]),
      { columnStyles: { 0: { cellWidth: 36 }, 4: { cellWidth: 44 } } },
    )
  }

  const boardRounds = defaultLeaderboardRounds(data)
  if (boardRounds.length > 1) {
    const b = leaderboard(boardRounds, data.teams)
    w.heading("Leaderboard (average of published rounds)")
    w.para(`${boardRounds.map((r) => r.name).join(" and ")}. A round a team has no score in counts as 0.`)
    w.table(
      ["Rank", "Team", ...boardRounds.map((r) => r.name), "Average"],
      b.rows.slice(0, 10).map((x) => [x.rank, `${x.team.teamName} (#${x.team.loginId})`, ...boardRounds.map((r) => fmt(x.scores[r.id] ?? 0)), fmt(x.overall)]),
    )
  }

  if (data.timeline.length) {
    w.heading("Timeline")
    w.table(
      ["Phase", "Session", "Date", "Title", "Resource"],
      data.timeline.map((e) => [e.phase, e.label, e.date ?? "-", e.title, e.resource ?? "-"]),
      { columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 }, 2: { cellWidth: 80 } } },
    )
  }

  finishPages(doc, data, "Programme statistics")
  doc.save(fileName(data, "Programme statistics"))
}

/* ======================================================= team report == */

async function writeTeam(w: Writer, data: ReportData, team: ReportTeam, logo: string | null) {
  const d = w.doc
  const r = teamResults(data, team)

  // Header: logo, name, number, theme.
  const logoSize = 64
  if (logo) d.addImage(logo, "JPEG", w.w - M - logoSize, w.y - 4, logoSize, logoSize)
  d.setFont("helvetica", "bold")
  d.setFontSize(9)
  d.setTextColor(...GOLD)
  d.text(safe(`ENVISION ${data.year.label}  \u00b7  TEAM REPORT`), M, w.y)
  w.y += 24
  d.setFontSize(22)
  d.setTextColor(...NAVY)
  const nameLines = d.splitTextToSize(safe(team.teamName), w.inner - (logo ? logoSize + 16 : 0)) as string[]
  d.text(nameLines, M, w.y)
  w.y += nameLines.length * 24
  d.setFont("helvetica", "normal")
  d.setFontSize(10.5)
  d.setTextColor(...MUTED)
  d.text(safe(`Team #${team.loginId}${team.domainTitle ? `  \u00b7  ${team.domainTitle}` : ""}`), M, w.y)
  w.y = Math.max(w.y + 8, M + logoSize + 10)
  d.setDrawColor(...GOLD)
  d.setLineWidth(1.5)
  d.line(M, w.y, w.w - M, w.y)
  w.y += 22

  if (r.overall) {
    w.tiles([
      { value: `#${r.overall.rank}`, label: `Leaderboard rank of ${r.overall.of}` },
      { value: fmt(r.overall.score), label: `${r.overall.rounds.length > 1 ? "Average" : "Score"} out of ${Math.round(r.overall.max)}` },
      { value: team.members.length, label: "Members" },
      { value: team.driveUrl || team.canvaUrl ? "Yes" : "No", label: "Deck submitted" },
    ])
  }

  w.heading("Team")
  w.facts([
    ["Team lead", team.teamLeadName],
    ["Email", team.email],
    ["Phone", team.phone],
    ["Mentor", team.mentorName ? `${team.mentorName} (${team.mentorLoginId})` : null],
    ["Lab venue", team.labVenue],
    ["Judging room", team.judgingVenue],
    ["Waiting room", team.waitingVenue],
  ])
  if (team.members.length) {
    w.table(
      ["#", "Member", "Department", "Email"],
      team.members.map((m, i) => [i + 1, m.name, m.department ?? "-", m.email ?? "-"]),
      { columnStyles: { 0: { cellWidth: 22 } } },
    )
  }

  w.heading("Project")
  if (!team.projectTitle && !team.problemStatement && !team.solutionShort && !team.solutionLong) {
    w.para("The team hasn't written up its project yet.", { color: MUTED })
  } else {
    if (team.projectTitle) {
      w.subheading(team.projectTitle)
    }
    if (team.problemStatement) {
      w.para("Problem", { size: 9, color: MUTED, gap: 0 })
      w.para(team.problemStatement)
    }
    if (team.solutionShort) {
      w.para("Solution in brief", { size: 9, color: MUTED, gap: 0 })
      w.para(team.solutionShort)
    }
    if (team.solutionLong) {
      w.para("Solution in detail", { size: 9, color: MUTED, gap: 0 })
      w.para(team.solutionLong)
    }
  }
  w.room(40)
  d.setFont("helvetica", "normal")
  d.setFontSize(9.5)
  if (team.driveUrl) {
    d.setTextColor(...NAVY)
    d.textWithLink("Open the deck (Google Drive)", M, w.y, { url: team.driveUrl })
    w.y += 14
  }
  if (team.canvaUrl) {
    d.setTextColor(...NAVY)
    d.textWithLink("Open the design (Canva)", M, w.y, { url: team.canvaUrl })
    w.y += 14
  }
  if (!team.driveUrl && !team.canvaUrl) w.para("No deck submitted.", { color: MUTED })
  else if (team.submittedAt) w.para(`Last updated ${when(team.submittedAt)}`, { size: 8.5, color: MUTED })

  w.heading("Judging")
  for (const pr of r.perRound) {
    w.subheading(`${pr.round.name}${pr.round.live ? " (live round)" : ""}`)
    if (pr.total == null) {
      w.para("Not scored.", { color: MUTED })
      continue
    }
    w.table(
      ["Criterion", "Marks", "Out of"],
      [
        ...pr.round.criteria.map((c) => [c.label, fmt(pr.marks[c.label]), c.max]),
        [`Total  (rank ${pr.rank} of ${pr.outOf})`, fmt(pr.total), pr.round.max],
      ],
      {
        columnStyles: { 1: { cellWidth: 60, halign: "right" }, 2: { cellWidth: 60, halign: "right" } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (h: any) => {
          if (h.section === "body" && h.row.index === pr.round.criteria.length) h.cell.styles.fontStyle = "bold"
        },
      },
    )
    if (pr.sheets.length) {
      w.table(
        ["Evaluator", ...pr.round.criteria.map((c) => c.label), "Total"],
        pr.sheets.map((s) => [
          `${s.evaluatorName ?? s.evaluatorLoginId} (${s.evaluatorRole === "jury" ? "jury" : "faculty"})`,
          ...pr.round.criteria.map((c) => fmt(s.marks[c.label])),
          fmt(s.total),
        ]),
        { styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: INK, lineColor: RULE, lineWidth: 0.5 } },
      )
    }
  }
}

export async function downloadTeamReport(data: ReportData, team: ReportTeam) {
  const { doc, autoTable } = await newDoc()
  const w = new Writer(doc, autoTable)
  await writeTeam(w, data, team, await imageData(team.logoUrl))
  finishPages(doc, data, `Team ${team.loginId} report`)
  doc.save(fileName(data, `Team ${team.loginId} ${team.teamName} report`))
}

/** Every team's report in one PDF, each starting on a new page. */
export async function downloadAllTeamReports(data: ReportData, onProgress?: (done: number, total: number) => void) {
  const { doc, autoTable } = await newDoc()
  const w = new Writer(doc, autoTable)
  const teams = [...data.teams].sort((a, b) => Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId))
  const logos = await Promise.all(teams.map((t) => imageData(t.logoUrl)))
  for (let i = 0; i < teams.length; i++) {
    if (i > 0) {
      doc.addPage()
      w.y = M
    }
    await writeTeam(w, data, teams[i], logos[i])
    onProgress?.(i + 1, teams.length)
  }
  finishPages(doc, data, "All team reports")
  doc.save(fileName(data, "All team reports"))
}

/* ===================================================== round results == */

export async function downloadRoundResults(data: ReportData, round: ReportRound) {
  const wide = round.criteria.length > 4
  const { doc, autoTable } = await newDoc(wide ? "landscape" : "portrait")
  const w = new Writer(doc, autoTable)
  const st = roundStats(round, data.teams)
  w.title(`${round.name}: results`, `Out of ${round.max}  \u00b7  ${st.scored} of ${data.teams.length} teams scored  \u00b7  ${round.live ? "Live round" : "Not live"}${round.published ? "  \u00b7  On the leaderboard" : ""}`)
  if (st.scored) {
    w.tiles([
      { value: fmt(st.totals.mean), label: `Average out of ${round.max}` },
      { value: fmt(st.totals.median), label: "Median" },
      { value: `${fmt(st.totals.min)} - ${fmt(st.totals.max)}`, label: "Lowest - highest" },
      { value: st.sheets, label: `Evaluator sheets, ${st.evaluators} evaluators` },
    ])
  }
  w.para(`Equal totals are separated by: ${round.tiebreak.length ? round.tiebreak.join(", then ") : round.criteria.map((c) => c.label).join(", then ")}.`, { size: 9, color: MUTED })
  w.table(
    ["Rank", "Team", "Mentor", ...round.criteria.map((c) => `${c.label} (/${c.max})`), "Total"],
    st.rows.map((r) => [
      r.rank ?? "-",
      `${r.team.teamName} (#${r.team.loginId})`,
      r.team.mentorName ?? "-",
      ...round.criteria.map((c) => fmt(r.marks[c.label])),
      r.total == null ? "Not scored" : fmt(r.total),
    ]),
    { styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: INK, lineColor: RULE, lineWidth: 0.5 }, columnStyles: { 0: { cellWidth: 32 } } },
  )
  finishPages(doc, data, `${round.name} results`)
  doc.save(fileName(data, `${round.name} results`))
}

/* ======================================================= leaderboard == */

export async function downloadLeaderboard(data: ReportData, rounds: ReportRound[]) {
  const { doc, autoTable } = await newDoc()
  const w = new Writer(doc, autoTable)
  const { rows, max } = leaderboard(rounds, data.teams)
  const avg = rounds.length > 1
  w.title("Leaderboard", avg ? `Average of ${rounds.map((r) => r.name).join(" and ")}` : rounds[0].name)
  if (avg) w.para("A round a team has no score in counts as 0 in its average. Equal scores are separated by each round's tie-break order.", { size: 9, color: MUTED })
  w.table(
    ["Rank", "Team", "Theme", "Mentor", ...(avg ? rounds.map((r) => r.name) : []), avg ? `Average (/${Math.round(max)})` : `Score (/${Math.round(max)})`],
    rows.map((r) => [
      r.rank,
      `${r.team.teamName} (#${r.team.loginId})`,
      r.team.domainTitle ?? "-",
      r.team.mentorName ?? "-",
      ...(avg ? rounds.map((x) => fmt(r.scores[x.id] ?? 0)) : []),
      fmt(r.overall),
    ]),
    { styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: INK, lineColor: RULE, lineWidth: 0.5 }, columnStyles: { 0: { cellWidth: 32 } } },
  )
  finishPages(doc, data, "Leaderboard")
  doc.save(fileName(data, `Leaderboard - ${rounds.map((r) => r.name).join(" + ")}`))
}



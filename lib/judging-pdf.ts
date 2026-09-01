import type { RubricRow } from "@/lib/judging"

/**
 * jsPDF's built-in fonts are Latin-1 only — emoji and other characters
 * outside U+00FF render as garbage ("+P" tofu). Drop them and tidy the
 * leftover whitespace so names/titles at least read cleanly.
 */
function pdfSafe(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export interface PdfTeam {
  loginId: string
  teamName: string
  teamLeadName: string
  projectTitle: string
  domainTitle: string
}

export interface PdfVenueGroup {
  venueName: string
  teams: PdfTeam[]
}

export interface PdfTeamDetails {
  loginId: string
  teamName: string
  teamLeadName: string
  mentorName: string
  waitingVenue: string
}

export interface PdfDetailsGroup {
  venueName: string
  teams: PdfTeamDetails[]
}

export interface PdfFacultyTeam {
  loginId: string
  domainTitle: string
  projectTitle: string
}

export interface PdfFacultyGroup {
  venueName: string
  teams: PdfFacultyTeam[]
}

/**
 * Judging packet: one page (or more) per venue, a running header on every
 * page carrying the customisable heading + that venue's name, and a
 * handwriting scoresheet per team (team meta + the rubric with a blank
 * Score column and a Total row).
 */
export async function downloadJudgingSheetsPdf(opts: {
  heading: string
  rubric: RubricRow[]
  groups: PdfVenueGroup[]
}) {
  const { default: jsPDF } = await import("jspdf")

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 42
  const marginBottom = 46
  const contentW = pageW - marginX * 2

  const rubricTotal = opts.rubric.reduce((s, r) => s + (Number(r.max) || 0), 0)

  function drawHeader(venueName: string): number {
    let y = 46
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.setTextColor(20)
    doc.text(pdfSafe(opts.heading), pageW / 2, y, { align: "center" })
    y += 18
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(60)
    doc.text(`Venue: ${pdfSafe(venueName)}`, pageW / 2, y, { align: "center" })
    y += 10
    doc.setDrawColor(20)
    doc.setLineWidth(1)
    doc.line(marginX, y, pageW - marginX, y)
    return y + 22
  }

  function teamBlockHeight(): number {
    const metaLines = 3 // Team no/name, Lead/Domain, Project
    return 16 + metaLines * 15 + 10 + (opts.rubric.length + 2) * 22 + 20
  }

  function drawTeamBlock(team: PdfTeam, startY: number): number {
    let y = startY
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(20)
    doc.text(`Team ${team.loginId} — ${pdfSafe(team.teamName) || "—"}`, marginX, y)
    y += 15
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(45)
    doc.text(`Team Lead: ${pdfSafe(team.teamLeadName) || "—"}`, marginX, y)
    doc.text(`Domain: ${pdfSafe(team.domainTitle) || "—"}`, marginX + contentW / 2, y)
    y += 15
    doc.text(`Project: ${pdfSafe(team.projectTitle) || "—"}`, marginX, y)
    y += 16

    // Rubric grid: Criterion | Max | Score
    const cScore = 70
    const cMax = 60
    const cCriterion = contentW - cScore - cMax
    const rowH = 22
    doc.setDrawColor(30)
    doc.setLineWidth(0.6)

    const header = ["Criterion", "Max", "Score"]
    const widths = [cCriterion, cMax, cScore]
    let rowY = y

    const drawRow = (cells: string[], bold: boolean) => {
      doc.setFont("helvetica", bold ? "bold" : "normal")
      doc.setFontSize(9.5)
      doc.setTextColor(20)
      let x = marginX
      cells.forEach((text, i) => {
        doc.rect(x, rowY, widths[i], rowH)
        if (text) doc.text(text, x + 6, rowY + rowH / 2 + 3)
        x += widths[i]
      })
      rowY += rowH
    }

    drawRow(header, true)
    opts.rubric.forEach((r) => drawRow([r.label, String(r.max), ""], false))
    drawRow(["Total", String(rubricTotal), ""], true)

    return rowY + 18
  }

  opts.groups.forEach((group, gi) => {
    if (gi > 0) doc.addPage()
    let y = drawHeader(group.venueName)

    if (group.teams.length === 0) {
      doc.setFont("helvetica", "italic")
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No teams assigned to this venue.", marginX, y)
      return
    }

    group.teams.forEach((team) => {
      if (y + teamBlockHeight() > pageH - marginBottom) {
        doc.addPage()
        y = drawHeader(group.venueName)
      }
      y = drawTeamBlock(team, y)
    })
  })

  doc.save("envision-judging-sheets.pdf")
}

/**
 * Team-details packet: one page (or more) per presentation venue, a running
 * header carrying the customisable heading + that venue's name, and a plain
 * table of Team #, Team Name, Mentor, Current (allocation) Venue. No rubric.
 */
export async function downloadTeamDetailsPdf(opts: {
  heading: string
  groups: PdfDetailsGroup[]
}) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 42

  let currentVenue = ""
  const drawHeader = () => {
    let y = 46
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.setTextColor(20)
    doc.text(pdfSafe(opts.heading), pageW / 2, y, { align: "center" })
    y += 22
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(20)
    doc.text(`Venue: ${pdfSafe(currentVenue)}`, pageW / 2, y, { align: "center" })
    y += 12
    doc.setDrawColor(20)
    doc.setLineWidth(1)
    doc.line(marginX, y, pageW - marginX, y)
  }

  opts.groups.forEach((group, gi) => {
    if (gi > 0) doc.addPage()
    currentVenue = group.venueName

    autoTable(doc, {
      startY: 104,
      margin: { top: 104, left: marginX, right: marginX },
      head: [["Team #", "Team Name", "Team Leader", "Mentor", "Waiting Venue"]],
      body:
        group.teams.length > 0
          ? group.teams.map((t) => [
              t.loginId,
              pdfSafe(t.teamName) || "—",
              pdfSafe(t.teamLeadName) || "—",
              pdfSafe(t.mentorName) || "—",
              pdfSafe(t.waitingVenue) || "—",
            ])
          : [["", "No teams assigned to this venue.", "", "", ""]],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 6, lineColor: [20, 20, 20], lineWidth: 0.5, textColor: 20 },
      headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 130 },
        3: { cellWidth: 130 },
        4: { cellWidth: 80 },
      },
      didDrawPage: drawHeader,
    })
  })

  doc.save("envision-team-details.pdf")
}

/**
 * Faculty schedule: one page per presentation venue, header carries the
 * customisable title, the venue name (large + bold) and the customisable
 * timing. Table is just Team #, Domain, Project Title.
 */
export async function downloadFacultyPdf(opts: {
  heading: string
  timing: string
  groups: PdfFacultyGroup[]
}) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 42

  let currentVenue = ""
  const drawHeader = () => {
    let y = 46
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.setTextColor(20)
    doc.text(pdfSafe(opts.heading), pageW / 2, y, { align: "center" })
    y += 24
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(`Venue: ${pdfSafe(currentVenue)}`, pageW / 2, y, { align: "center" })
    y += 16
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(50)
    doc.text(`Time: ${pdfSafe(opts.timing)}`, pageW / 2, y, { align: "center" })
    y += 12
    doc.setDrawColor(20)
    doc.setLineWidth(1)
    doc.line(marginX, y, pageW - marginX, y)
  }

  opts.groups.forEach((group, gi) => {
    if (gi > 0) doc.addPage()
    currentVenue = group.venueName

    autoTable(doc, {
      startY: 120,
      margin: { top: 120, left: marginX, right: marginX },
      head: [["Team #", "Domain", "Project Title"]],
      body:
        group.teams.length > 0
          ? group.teams.map((t) => [t.loginId, pdfSafe(t.domainTitle) || "—", pdfSafe(t.projectTitle) || "—"])
          : [["", "No teams assigned to this venue.", ""]],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 6, lineColor: [20, 20, 20], lineWidth: 0.5, textColor: 20 },
      headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 190 },
        2: { cellWidth: "auto" },
      },
      didDrawPage: drawHeader,
    })
  })

  doc.save("envision-faculty-schedule.pdf")
}

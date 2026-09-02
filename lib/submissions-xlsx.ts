/**
 * One flat sheet combining the Team Details and Faculty Schedule data:
 * presentation venue, team number/name/leader, mentor, waiting venue,
 * domain, project title — one row per team. Built client-side with
 * SheetJS (dynamically imported so it stays off the initial bundle).
 */
export interface SubmissionsXlsxRow {
  presentationVenue: string
  loginId: string
  teamName: string
  teamLeadName: string
  mentorName: string
  waitingVenue: string
  domain: string
  projectTitle: string
}

const HEADERS = [
  "Presentation Venue",
  "Team #",
  "Team Name",
  "Team Leader",
  "Mentor",
  "Waiting Venue",
  "Domain",
  "Project Title",
]

export async function downloadSubmissionsXlsx(rows: SubmissionsXlsxRow[]) {
  const XLSX = await import("xlsx")

  const aoa = [
    HEADERS,
    ...rows.map((r) => [
      r.presentationVenue,
      r.loginId,
      r.teamName,
      r.teamLeadName,
      r.mentorName,
      r.waitingVenue,
      r.domain,
      r.projectTitle,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws["!cols"] = [
    { wch: 18 },
    { wch: 7 },
    { wch: 26 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 44 },
  ]
  ws["!freeze"] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Teams")
  XLSX.writeFile(wb, "envision-submissions.xlsx")
}

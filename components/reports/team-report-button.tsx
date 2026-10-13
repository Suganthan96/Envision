"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReportData } from "@/lib/reports/types"

/** "Download team report" on an admin team profile: the same PDF as on Reports. */
export function TeamReportButton({ loginId }: { loginId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className="gap-2"
        onClick={async () => {
          setError("")
          setBusy(true)
          try {
            const res = await fetch("/api/admin/reports", { cache: "no-store" })
            const data = (await res.json()) as ReportData & { error?: string }
            if (!res.ok) throw new Error(data.error ?? "Could not gather the records.")
            const team = data.teams.find((t) => t.loginId === loginId)
            if (!team) throw new Error("This team isn't in the year you're working in.")
            const { downloadTeamReport } = await import("@/lib/reports/pdf")
            await downloadTeamReport(data, team)
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.")
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {busy ? "Preparing…" : "Download team report"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

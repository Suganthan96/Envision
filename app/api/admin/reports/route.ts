import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { buildReportData } from "@/lib/reports/data"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Everything the admin reports need, for the year the admin is working in. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }
  try {
    const data = await buildReportData(session.userId)
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not gather the report data."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

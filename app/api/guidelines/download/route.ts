import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_project_guideline_file")
  const row = data?.[0]

  if (!row?.file_name || !row?.file_data) {
    return NextResponse.json({ error: "No file has been uploaded." }, { status: 404 })
  }

  const commaIndex = (row.file_data as string).indexOf(",")
  const base64 = commaIndex >= 0 ? (row.file_data as string).slice(commaIndex + 1) : (row.file_data as string)
  const bytes = Buffer.from(base64, "base64")

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(row.file_name as string)}"`,
      "Content-Length": String(bytes.length),
    },
  })
}

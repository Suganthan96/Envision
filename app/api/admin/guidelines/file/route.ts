import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS, revalidateSharedData } from "@/lib/cache-tags"

const MAX_FILE_DATA_LENGTH = 15_000_000

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)

  // Clearing the attached file: { clear: true } with no other fields.
  if (body?.clear === true) {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.rpc("admin_set_project_guideline_file", {
      p_admin_user_id: session.userId,
      p_file_name: null,
      p_file_data: null,
    })
    if (error || data !== true) {
      return NextResponse.json({ error: "Unable to remove the file." }, { status: 400 })
    }
    revalidateSharedData(CACHE_TAGS.projectGuideline)
    return NextResponse.json({ ok: true })
  }

  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : ""
  const fileData = typeof body?.fileData === "string" ? body.fileData : ""

  if (!fileName.toLowerCase().endsWith(".pptx")) {
    return NextResponse.json({ error: "Please upload a .pptx file." }, { status: 400 })
  }
  if (!fileData.startsWith("data:")) {
    return NextResponse.json({ error: "Invalid file data." }, { status: 400 })
  }
  if (fileData.length > MAX_FILE_DATA_LENGTH) {
    return NextResponse.json({ error: "That file is too large (max ~10MB)." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_project_guideline_file", {
    p_admin_user_id: session.userId,
    p_file_name: fileName,
    p_file_data: fileData,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: error?.message ?? "Unable to save the file." }, { status: 400 })
  }

  revalidateSharedData(CACHE_TAGS.projectGuideline)
  return NextResponse.json({ ok: true, fileName })
}

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

const MAX_LINK_LENGTH = 500

async function requireMember(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) }
  if (session.role !== "member") {
    return { error: NextResponse.json({ error: "Only student teams have a submission." }, { status: 403 }) }
  }
  return { session }
}

function validLink(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === "https:" || u.protocol === "http:"
  } catch {
    return false
  }
}

async function save(userId: string, driveUrl: string | null, canvaUrl: string | null) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("update_team_submission", {
    p_user_id: userId,
    p_canva_url: canvaUrl,
    p_file_url: driveUrl,
    p_file_id: null,
    p_file_name: null,
  })
  return !error && data === true
}

// Save / update the submission: a Google Drive link (required) and an
// optional Canva link.
export async function POST(request: NextRequest) {
  const { session, error } = await requireMember(request)
  if (error) return error

  const body = await request.json().catch(() => null)
  const driveUrl = typeof body?.driveUrl === "string" ? body.driveUrl.trim() : ""
  const canvaUrl = typeof body?.canvaUrl === "string" ? body.canvaUrl.trim() : ""

  if (!driveUrl) {
    return NextResponse.json({ error: "The Google Drive link is required." }, { status: 400 })
  }
  if (driveUrl.length > MAX_LINK_LENGTH || canvaUrl.length > MAX_LINK_LENGTH) {
    return NextResponse.json({ error: "That link is too long." }, { status: 400 })
  }
  if (!validLink(driveUrl)) {
    return NextResponse.json({ error: "Enter a valid Drive link starting with https://" }, { status: 400 })
  }
  if (canvaUrl && !validLink(canvaUrl)) {
    return NextResponse.json({ error: "Enter a valid Canva link starting with https://" }, { status: 400 })
  }

  if (!(await save(session.userId, driveUrl, canvaUrl || null))) {
    return NextResponse.json({ error: "Unable to save your submission." }, { status: 400 })
  }
  return NextResponse.json({
    driveUrl,
    canvaUrl: canvaUrl || null,
    updatedAt: new Date().toISOString(),
  })
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireMember(request)
  if (error) return error

  if (!(await save(session.userId, null, null))) {
    return NextResponse.json({ error: "Unable to clear your submission." }, { status: 400 })
  }
  return NextResponse.json({ driveUrl: null, canvaUrl: null, updatedAt: null })
}

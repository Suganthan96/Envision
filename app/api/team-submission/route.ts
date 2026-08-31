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

async function save(userId: string, link: string | null) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("update_team_submission", {
    p_user_id: userId,
    p_canva_url: link,
    p_file_url: null,
    p_file_id: null,
    p_file_name: null,
  })
  return !error && data === true
}

// Save / update the single submission link (a Canva URL or a Google Drive
// share link the team pasted after uploading their file themselves).
export async function POST(request: NextRequest) {
  const { session, error } = await requireMember(request)
  if (error) return error

  const body = await request.json().catch(() => null)
  const link = typeof body?.link === "string" ? body.link.trim() : ""

  if (!link) {
    return NextResponse.json(
      { error: "Paste your Canva link or Google Drive link. To clear it, use Delete submission." },
      { status: 400 },
    )
  }
  if (link.length > MAX_LINK_LENGTH) {
    return NextResponse.json({ error: "That link is too long." }, { status: 400 })
  }
  try {
    const u = new URL(link)
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error()
  } catch {
    return NextResponse.json({ error: "Enter a valid link starting with https://" }, { status: 400 })
  }

  if (!(await save(session.userId, link))) {
    return NextResponse.json({ error: "Unable to save your submission." }, { status: 400 })
  }
  return NextResponse.json({ link, updatedAt: new Date().toISOString() })
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireMember(request)
  if (error) return error

  if (!(await save(session.userId, null))) {
    return NextResponse.json({ error: "Unable to clear your submission." }, { status: 400 })
  }
  return NextResponse.json({ link: null, updatedAt: null })
}

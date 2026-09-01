import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/session"

const MAX_AVATAR_LENGTH = 2_000_000
const MAX_BIO_LENGTH = 1000

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  if (session.role !== "mentor") {
    return NextResponse.json({ error: "Only mentors have a profile." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : ""
  const bio = typeof body?.bio === "string" ? body.bio.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 })
  }
  if (avatarUrl && !avatarUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Photo must be an image." }, { status: 400 })
  }
  if (avatarUrl.length > MAX_AVATAR_LENGTH) {
    return NextResponse.json({ error: "Photo is too large." }, { status: 400 })
  }
  if (bio.length > MAX_BIO_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_BIO_LENGTH} characters or fewer.` }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()

  const { data: nameData, error: nameError } = await supabase.rpc("update_name", {
    p_user_id: session.userId,
    p_name: name,
  })
  if (nameError || nameData !== true) {
    return NextResponse.json({ error: "Unable to update your name." }, { status: 400 })
  }

  const { data, error } = await supabase.rpc("update_mentor_profile", {
    p_user_id: session.userId,
    p_avatar_url: avatarUrl || null,
    p_bio: bio || null,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save your profile." }, { status: 400 })
  }

  const newToken = await createSessionToken({ ...session, name })

  const response = NextResponse.json({ name, avatarUrl: avatarUrl || null, bio: bio || null })
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return response
}

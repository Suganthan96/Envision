import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS, revalidateSharedData } from "@/lib/cache-tags"
import type { GuidelineSlide } from "@/lib/project-guideline"

function isValidSlides(value: unknown): value is GuidelineSlide[] {
  if (!Array.isArray(value)) return false
  return value.every((slide) => {
    if (!slide || typeof slide !== "object") return false
    const s = slide as Record<string, unknown>
    if (typeof s.id !== "string" || !s.id) return false
    if (s.kind !== "text" && s.kind !== "image") return false
    if (typeof s.title !== "string") return false
    if (s.body !== null && typeof s.body !== "string") return false
    if (s.imageUrl !== null && typeof s.imageUrl !== "string") return false
    return true
  })
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === "string" ? body.title.trim() : ""

  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 })
  }
  if (!isValidSlides(body?.slides)) {
    return NextResponse.json({ error: "Invalid guideline data." }, { status: 400 })
  }
  if (body.slides.some((s: GuidelineSlide) => !s.title.trim())) {
    return NextResponse.json({ error: "Every slide needs a title." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_project_guideline", {
    p_admin_user_id: session.userId,
    p_title: title,
    p_slides: body.slides,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: error?.message ?? "Unable to save the guideline." }, { status: 400 })
  }

  revalidateSharedData(CACHE_TAGS.projectGuideline)
  return NextResponse.json({ ok: true })
}

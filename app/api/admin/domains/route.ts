import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS, revalidateSharedData } from "@/lib/cache-tags"

const VALID_ICONS = [
  "water-energy",
  "home",
  "campus",
  "city",
  "agriculture",
  "health",
  "waste",
  "ai-social",
  "climate",
  "inclusive",
]

function parseSdgs(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 17)
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const action = body?.action
  const supabase = getSupabaseServerClient()

  if (action === "remove") {
    const id = typeof body?.id === "string" ? body.id : ""
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 })
    }
    const { data, error } = await supabase.rpc("admin_delete_domain", {
      p_admin_user_id: session.userId,
      p_id: id,
    })
    if (error || data !== true) {
      return NextResponse.json({ error: error?.message ?? "Unable to delete theme." }, { status: 400 })
    }
    revalidateSharedData(CACHE_TAGS.domains)
    return NextResponse.json({ ok: true })
  }

  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const icon = typeof body?.icon === "string" ? body.icon : ""
  const sdgs = parseSdgs(body?.sdgs)

  if (!VALID_ICONS.includes(icon)) {
    return NextResponse.json({ error: "Invalid icon." }, { status: 400 })
  }

  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 })
  }

  if (action === "update") {
    const id = typeof body?.id === "string" ? body.id : ""
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 })
    }
    const { data, error } = await supabase.rpc("admin_update_domain", {
      p_admin_user_id: session.userId,
      p_id: id,
      p_title: title,
      p_description: description,
      p_icon: icon,
      p_sdgs: sdgs,
    })
    if (error || data !== true) {
      return NextResponse.json({ error: error?.message ?? "Unable to update theme." }, { status: 400 })
    }
    revalidateSharedData(CACHE_TAGS.domains)
    return NextResponse.json({ ok: true })
  }

  if (action === "add") {
    const { data, error } = await supabase.rpc("admin_add_domain", {
      p_admin_user_id: session.userId,
      p_title: title,
      p_description: description,
      p_icon: icon,
      p_sdgs: sdgs,
    })
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to add theme." }, { status: 400 })
    }
    revalidateSharedData(CACHE_TAGS.domains)
    return NextResponse.json({ ok: true, id: data })
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}

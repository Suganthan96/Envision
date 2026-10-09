import { NextRequest, NextResponse } from "next/server"
import { getBaseSupabaseClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { revalidateSharedData } from "@/lib/revalidate"
import { EDITION_COOKIE, validEditionId } from "@/lib/edition"

/**
 * Programme years, keyed by `action`:
 *   open        — work in a year: sets the admin's year cookie ("" = current)
 *   set-current — the year teams, mentors and evaluators sign in to
 *   start       — create a new year (see admin_start_edition)
 *
 * These read and write the year list itself, so they use the header-less
 * client: the year an admin is browsing must not change which year is created.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""
  const supabase = getBaseSupabaseClient()

  try {
    switch (action) {
      case "open": {
        const raw = typeof body?.edition === "string" ? body.edition : ""
        const id = raw ? await validEditionId(raw) : null
        if (raw && !id) return NextResponse.json({ error: "That year does not exist." }, { status: 400 })
        const res = NextResponse.json({ ok: true, edition: id })
        if (id) {
          res.cookies.set(EDITION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 })
        } else {
          res.cookies.delete(EDITION_COOKIE)
        }
        return res
      }
      case "set-current": {
        const id = await validEditionId(String(body?.edition ?? ""))
        if (!id) return NextResponse.json({ error: "That year does not exist." }, { status: 400 })
        const { error } = await supabase.rpc("admin_set_current_edition", {
          p_admin_user_id: session.userId,
          p_edition_id: id,
        })
        if (error) throw error
        revalidateSharedData(CACHE_TAGS.editions)
        // Back to "the current year" so the admin lands where everyone else is.
        const res = NextResponse.json({ ok: true })
        res.cookies.delete(EDITION_COOKIE)
        return res
      }
      case "start": {
        const id = String(body?.edition ?? "").trim()
        const mentorIds = Array.isArray(body?.mentorIds)
          ? body.mentorIds.map((m: unknown) => String(m).trim()).filter(Boolean)
          : []
        const teams = Number(body?.teamCount ?? 0)
        if (!Number.isInteger(teams) || teams < 0 || teams > 500) {
          return NextResponse.json({ error: "Enter a number of teams from 0 to 500." }, { status: 400 })
        }
        const { data, error } = await supabase.rpc("admin_start_edition", {
          p_admin_user_id: session.userId,
          p_edition_id: id,
          p_label: String(body?.label ?? "").trim() || id.replace("-", "–"),
          p_from_edition: typeof body?.from === "string" ? body.from : null,
          p_options: {
            themes: body?.options?.themes === true,
            rounds: body?.options?.rounds === true,
            rooms: body?.options?.rooms === true,
            timeline: body?.options?.timeline === true,
            guidelines: body?.options?.guidelines === true,
          },
          p_team_count: teams,
          p_mentor_ids: mentorIds,
          p_make_current: body?.makeCurrent === true,
        })
        if (error) throw error
        revalidateSharedData(CACHE_TAGS.editions)
        const res = NextResponse.json({ ok: true, result: data })
        // Open the new year straight away so the admin can set it up.
        res.cookies.set(EDITION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 })
        return res
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 })
    }
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Something went wrong."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

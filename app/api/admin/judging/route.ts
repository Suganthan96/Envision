import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

/**
 * One endpoint for every Submissions-page judging mutation, keyed by
 * `action`: manage judging venues, set a layered venue assignment
 * (team / mentor / theme), or save the rubric + report heading.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""
  const supabase = getSupabaseServerClient()
  const admin = session.userId

  try {
    switch (action) {
      case "add-venue": {
        const name = String(body?.name ?? "").trim()
        const kind = body?.kind === "waiting" ? "waiting" : "judging"
        if (!name) return NextResponse.json({ error: "Venue name is required." }, { status: 400 })
        const { data, error } = await supabase.rpc("admin_add_judging_venue", {
          p_admin_user_id: admin,
          p_name: name,
          p_kind: kind,
        })
        if (error) throw error
        return NextResponse.json({ venue: data })
      }
      case "rename-venue": {
        const id = String(body?.id ?? "")
        const name = String(body?.name ?? "").trim()
        if (!id || !name) return NextResponse.json({ error: "id and name are required." }, { status: 400 })
        const { error } = await supabase.rpc("admin_rename_judging_venue", {
          p_admin_user_id: admin,
          p_id: id,
          p_name: name,
        })
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case "delete-venue": {
        const id = String(body?.id ?? "")
        if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 })
        const { error } = await supabase.rpc("admin_delete_judging_venue", {
          p_admin_user_id: admin,
          p_id: id,
        })
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case "set-assignment": {
        const scope = String(body?.scope ?? "")
        const refId = String(body?.refId ?? "")
        const kind = body?.kind === "waiting" ? "waiting" : "judging"
        const venueId = body?.venueId == null ? null : String(body.venueId)
        if (!["team", "mentor", "theme"].includes(scope) || !refId) {
          return NextResponse.json({ error: "scope and refId are required." }, { status: 400 })
        }
        const { error } = await supabase.rpc("admin_set_judging_assignment", {
          p_admin_user_id: admin,
          p_scope: scope,
          p_ref_id: refId,
          p_venue_id: venueId,
          p_kind: kind,
        })
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case "save-settings": {
        const heading = String(body?.heading ?? "").trim()
        const facultyHeading = String(body?.facultyHeading ?? "").trim()
        const facultyTiming = String(body?.facultyTiming ?? "").trim()
        const rubric = Array.isArray(body?.rubric) ? body.rubric : null
        if (!heading) return NextResponse.json({ error: "Report heading is required." }, { status: 400 })
        if (!facultyHeading) return NextResponse.json({ error: "Faculty PDF title is required." }, { status: 400 })
        if (!facultyTiming) return NextResponse.json({ error: "Timing is required." }, { status: 400 })
        if (!rubric || rubric.length === 0) {
          return NextResponse.json({ error: "Add at least one rubric row." }, { status: 400 })
        }
        const clean = rubric.map((r: unknown) => {
          const row = r as { label?: unknown; max?: unknown }
          const label = String(row.label ?? "").trim()
          const max = Number(row.max)
          if (!label || !Number.isFinite(max) || max <= 0) throw new Error("Each rubric row needs a label and a positive mark.")
          return { label, max: Math.round(max) }
        })
        const { error } = await supabase.rpc("admin_set_judging_settings", {
          p_admin_user_id: admin,
          p_heading: heading,
          p_rubric: clean,
          p_faculty_heading: facultyHeading,
          p_faculty_timing: facultyTiming,
        })
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

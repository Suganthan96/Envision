import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { revalidateSharedData } from "@/lib/revalidate"

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

  // Every branch below mutates judging venues, assignments or settings, all
  // of which are cached under the `judging` tag and read on /admin/submissions.
  const purge = () => revalidateSharedData(CACHE_TAGS.judging)
  // Switching or editing a round changes what students, mentors and evaluators
  // see, all of which read through the presets tag as well.
  const purgePresets = () => {
    revalidateSharedData(CACHE_TAGS.judging)
    revalidateSharedData(CACHE_TAGS.rubricPresets)
  }
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
        purge()
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
        purge()
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
        purge()
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
        purge()
        return NextResponse.json({ ok: true })
      }
      case "set-scores": {
        const studentUserId = String(body?.studentUserId ?? "")
        if (!studentUserId) {
          return NextResponse.json({ error: "studentUserId is required." }, { status: 400 })
        }

        // Per-criterion marks keyed by rubric label. Criteria left blank are
        // simply absent, so a partly-judged team still totals correctly.
        // An empty object clears the team back to unscored.
        const raw = body?.marks
        const marks: Record<string, number> = {}
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          for (const [label, value] of Object.entries(raw as Record<string, unknown>)) {
            if (value === null || value === undefined || String(value).trim() === "") continue
            const mark = Number(value)
            if (!Number.isFinite(mark) || mark < 0 || mark > 1000) {
              return NextResponse.json(
                { error: `"${label}" must be a number between 0 and 1000.` },
                { status: 400 },
              )
            }
            marks[label] = Math.round(mark * 100) / 100
          }
        }

        // The total is derived inside the RPC, so it can never drift from the
        // parts that produced it.
        const { data, error } = await supabase.rpc("admin_set_submission_scores", {
          p_admin_user_id: admin,
          p_student_user_id: studentUserId,
          p_marks: Object.keys(marks).length > 0 ? marks : null,
        })
        if (error) throw error
        // Scores are read through getSubmissionsForAdmin, which is uncached on
        // a force-dynamic page, so there is nothing to purge here.
        return NextResponse.json({ ok: true, total: data == null ? null : Number(data) })
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
        // Saving the rubric here writes through to the live round, so the
        // presets tag has to go with it.
        purgePresets()
        return NextResponse.json({ ok: true })
      }
      // ---- evaluation rounds (rubric presets) ----
      // The active preset drives the student-facing rubric, the judging PDFs
      // and every evaluator's sheet, so each of these purges both tags.
      case "save-preset": {
        const id = body?.id == null ? null : String(body.id)
        const name = String(body?.name ?? "").trim()
        const rubric = Array.isArray(body?.rubric) ? body.rubric : null
        if (!name) return NextResponse.json({ error: "A round name is required." }, { status: 400 })
        if (!rubric || rubric.length === 0) {
          return NextResponse.json({ error: "Add at least one criterion." }, { status: 400 })
        }
        const clean = rubric.map((r: unknown) => {
          const row = r as { label?: unknown; max?: unknown }
          const label = String(row.label ?? "").trim()
          const max = Number(row.max)
          if (!label || !Number.isFinite(max) || max <= 0) {
            throw new Error("Each criterion needs a label and a positive mark.")
          }
          return { label, max: Math.round(max) }
        })
        const { data, error } = await supabase.rpc("admin_save_rubric_preset", {
          p_admin_user_id: admin,
          p_id: id,
          p_name: name,
          p_rubric: clean,
        })
        if (error) throw error
        purgePresets()
        return NextResponse.json({ id: data })
      }
      case "activate-preset": {
        const id = String(body?.id ?? "")
        if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 })
        const { error } = await supabase.rpc("admin_activate_rubric_preset", {
          p_admin_user_id: admin,
          p_id: id,
        })
        if (error) throw error
        purgePresets()
        return NextResponse.json({ ok: true })
      }
      case "delete-preset": {
        const id = String(body?.id ?? "")
        if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 })
        const { error } = await supabase.rpc("admin_delete_rubric_preset", {
          p_admin_user_id: admin,
          p_id: id,
        })
        if (error) throw error
        purgePresets()
        return NextResponse.json({ ok: true })
      }

      // ---- evaluator scope ----
      case "set-evaluator-venues":
      case "set-evaluator-teams": {
        const evaluatorUserId = String(body?.evaluatorUserId ?? "")
        const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []
        if (!evaluatorUserId) {
          return NextResponse.json({ error: "evaluatorUserId is required." }, { status: 400 })
        }
        const venues = action === "set-evaluator-venues"
        const { error } = await supabase.rpc(
          venues ? "admin_set_evaluator_venues" : "admin_set_evaluator_teams",
          venues
            ? { p_admin_user_id: admin, p_evaluator_user_id: evaluatorUserId, p_venue_ids: ids }
            : { p_admin_user_id: admin, p_evaluator_user_id: evaluatorUserId, p_student_ids: ids },
        )
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      // ---- admin override of any evaluator's sheet ----
      case "set-evaluation": {
        const presetId = String(body?.presetId ?? "")
        const evaluatorUserId = String(body?.evaluatorUserId ?? "")
        const studentUserId = String(body?.studentUserId ?? "")
        if (!presetId || !evaluatorUserId || !studentUserId) {
          return NextResponse.json(
            { error: "presetId, evaluatorUserId and studentUserId are required." },
            { status: 400 },
          )
        }
        const raw = body?.marks
        const marks: Record<string, number> = {}
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          for (const [label, value] of Object.entries(raw as Record<string, unknown>)) {
            if (value === null || value === undefined || String(value).trim() === "") continue
            const mark = Number(value)
            if (!Number.isFinite(mark) || mark < 0 || mark > 1000) {
              return NextResponse.json({ error: `"${label}" must be a number.` }, { status: 400 })
            }
            marks[label] = Math.round(mark * 100) / 100
          }
        }
        const { data, error } = await supabase.rpc("admin_set_evaluation", {
          p_admin_user_id: admin,
          p_preset_id: presetId,
          p_evaluator_user_id: evaluatorUserId,
          p_student_user_id: studentUserId,
          p_marks: Object.keys(marks).length > 0 ? marks : null,
        })
        if (error) throw error
        return NextResponse.json({ ok: true, total: data == null ? null : Number(data) })
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

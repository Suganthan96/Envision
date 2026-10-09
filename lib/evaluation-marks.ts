import type { RubricRow } from "@/lib/judging-shared"

/**
 * Per-criterion average across every sheet filed for a team, plus the average
 * total. A criterion only averages the evaluators who actually marked it, so
 * one evaluator skipping a row doesn't drag it down.
 */
export function averageMarks(rows: { marks: Record<string, number> }[], rubric: RubricRow[]) {
  const perCriterion: Record<string, number | null> = {}
  for (const criterion of rubric) {
    const values = rows
      .map((r) => r.marks[criterion.label])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    perCriterion[criterion.label] =
      values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
  }
  const totals = rows.map((r) => Object.values(r.marks).reduce((a, b) => a + b, 0))
  const average = totals.length === 0 ? null : totals.reduce((a, b) => a + b, 0) / totals.length
  return { perCriterion, average, count: rows.length }
}

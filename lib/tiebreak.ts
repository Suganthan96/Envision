/**
 * Tie-breaking for a judging round. When two teams have the same total, the
 * one with more marks in the first criterion of the round's tie-break order
 * ranks higher; if that is equal too, the next criterion decides, and so on.
 * Teams equal on every criterion share a rank.
 *
 * The admin sets the order per round on /admin/judging/scores. Saved labels that are
 * no longer in the rubric are dropped, and criteria missing from the saved
 * list follow in rubric order, so an empty list means "rubric order".
 */
export function effectiveTiebreak(criteria: string[], saved: string[] | null | undefined): string[] {
  const inRubric = new Set(criteria)
  const seen = new Set<string>()
  const out: string[] = []
  for (const label of [...(saved ?? []), ...criteria]) {
    if (!inRubric.has(label) || seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out
}

/** Higher marks first, criterion by criterion. 0 when equal on every one. */
export function compareByTiebreak(
  order: string[],
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): number {
  for (const label of order) {
    const diff = (b?.[label] ?? 0) - (a?.[label] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

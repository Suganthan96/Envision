/**
 * The Judging hub's sections, in the order the work happens: get the decks
 * and rooms ready, set up the round and who marks it, then the results.
 * Shared by the hub's cards and the tab strip on every section page.
 */
export const JUDGING_GROUPS = [
  {
    title: "Before judging",
    sections: [
      { slug: "submissions", label: "Submissions" },
      { slug: "venues", label: "Venues" },
      { slug: "documents", label: "Documents" },
    ],
  },
  {
    title: "Judging",
    sections: [
      { slug: "rounds", label: "Rounds" },
      { slug: "evaluators", label: "Faculty & Jury" },
    ],
  },
  {
    title: "Results",
    sections: [
      { slug: "scores", label: "Scores" },
      { slug: "sheets", label: "Evaluator Sheets" },
    ],
  },
] as const

export type JudgingSlug = (typeof JUDGING_GROUPS)[number]["sections"][number]["slug"]

export const JUDGING_SECTIONS: readonly { slug: JudgingSlug; label: string }[] = JUDGING_GROUPS.flatMap(
  (g): readonly { slug: JudgingSlug; label: string }[] => g.sections,
)

import { getPublicJudgingRubric } from "@/lib/judging"
import type { GuidelineSlide } from "@/lib/project-guideline"

/**
 * Appends the judging rubric as a final "Evaluation Rubric" slide to the
 * project-guideline deck, so students and mentors see exactly how the
 * submission is scored. If no rubric is set up, the deck is returned
 * unchanged.
 */
export async function withRubricSlide(slides: GuidelineSlide[]): Promise<GuidelineSlide[]> {
  const data = await getPublicJudgingRubric()
  if (!data) return slides

  const total = data.rubric.reduce((s, r) => s + (Number(r.max) || 0), 0)
  const lines = data.rubric.map((r) => `• ${r.label} — ${r.max}`)
  const body = [
    `Your final submission is evaluated out of ${total} marks:`,
    "",
    ...lines,
    "",
    `Total — ${total}`,
  ].join("\n")

  return [
    ...slides,
    {
      id: "judging-rubric",
      kind: "text",
      title: "Evaluation Rubric",
      body,
      imageUrl: null,
    },
  ]
}

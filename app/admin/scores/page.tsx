import { redirect } from "next/navigation"

/** Moved into the Judging hub; keeps a round link working. */
export default async function AdminScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string | string[] }>
}) {
  const { round } = await searchParams
  redirect(
    typeof round === "string" && round
      ? `/admin/judging/scores?round=${encodeURIComponent(round)}`
      : "/admin/judging/scores",
  )
}

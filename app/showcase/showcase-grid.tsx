import { ShowcaseSearch } from "@/components/showcase-search"
import { getPublicShowcaseTeams } from "@/lib/public-showcase"
import { getDomains } from "@/lib/domains"

/** Team list + domain lookup, streamed under <Suspense> so the showcase
 *  hero paints without waiting on the RPC. */
export async function ShowcaseGrid() {
  const [teams, domains] = await Promise.all([getPublicShowcaseTeams(), getDomains()])
  const domainTitleById = Object.fromEntries(domains.map((d) => [d.id, d.title]))

  if (teams.length === 0) {
    return <p className="text-muted-foreground text-center py-16">No teams yet.</p>
  }

  return (
    <>
      <p className="text-primary text-xs uppercase tracking-[0.2em] mb-10 text-center">
        {teams.length} {teams.length === 1 ? "Team" : "Teams"}
      </p>
      <ShowcaseSearch teams={teams} domainTitleById={domainTitleById} />
    </>
  )
}

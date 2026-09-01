import { MentorsSearch } from "@/components/mentors-search"
import { getPublicMentorShowcase } from "@/lib/public-showcase"
import { getDomains } from "@/lib/domains"

/** Mentor list + domain lookup, streamed under <Suspense> so the page
 *  hero paints without waiting on the RPC. */
export async function MentorsGrid() {
  const [mentors, domains] = await Promise.all([getPublicMentorShowcase(), getDomains()])
  const domainTitleById = Object.fromEntries(domains.map((d) => [d.id, d.title]))

  if (mentors.length === 0) {
    return <p className="text-muted-foreground text-center py-16">No mentors yet.</p>
  }

  return (
    <>
      <p className="text-primary text-xs uppercase tracking-[0.2em] mb-10 text-center">
        {mentors.length} {mentors.length === 1 ? "Mentor" : "Mentors"}
      </p>
      <MentorsSearch mentors={mentors} domainTitleById={domainTitleById} />
    </>
  )
}

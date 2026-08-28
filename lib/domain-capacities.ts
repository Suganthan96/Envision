import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { CACHE_TAGS } from "@/lib/cache-tags"

export interface DomainCapacityRecord {
  domain_id: string
  student_capacity: number
  mentor_capacity: number
}

// Capacities only change when an admin edits them (/api/admin/domain-capacity
// invalidates CACHE_TAGS.domainCapacities). Worth caching because
// /api/domains/state re-reads this on every poll from every signed-in
// student and mentor.
export const getDomainCapacities = unstable_cache(
  async (): Promise<DomainCapacityRecord[]> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_domain_capacities")
    return (data ?? []) as DomainCapacityRecord[]
  },
  ["domain-capacities"],
  { tags: [CACHE_TAGS.domainCapacities] },
)

export interface GuidelineSlide {
  id: string
  kind: "text" | "image"
  title: string
  body: string | null
  imageUrl: string | null
}

export interface ProjectGuideline {
  title: string
  slides: GuidelineSlide[]
  fileName: string | null
}

export const DEFAULT_GUIDELINE_TITLE = "Phase 1 Pitch Deck Guideline"

// Fallback used only if the DB row is ever empty. The DB
// (public.guideline_settings, via get_project_guideline() /
// admin_set_project_guideline()) is the source of truth once seeded.
export const DEFAULT_GUIDELINE_SLIDES: GuidelineSlide[] = []

// Cached until an admin saves the guideline (/api/admin/guidelines
// invalidates CACHE_TAGS.projectGuideline). Everything server-side is
// imported lazily to keep this module safe to import from client components.
let cachedGetProjectGuideline: (() => Promise<ProjectGuideline>) | null = null

export async function getProjectGuideline(): Promise<ProjectGuideline> {
  if (!cachedGetProjectGuideline) {
    const [{ unstable_cache }, { CACHE_TAGS }] = await Promise.all([
      import("next/cache"),
      import("@/lib/cache-tags"),
    ])
    cachedGetProjectGuideline = unstable_cache(
      async () => {
        const { getSupabaseServerClient } = await import("@/lib/supabase-server")
        const supabase = getSupabaseServerClient()
        const { data } = await supabase.rpc("get_project_guideline")
        const row = data?.[0]
        const slides = Array.isArray(row?.slides) ? (row.slides as GuidelineSlide[]) : DEFAULT_GUIDELINE_SLIDES
        return {
          title: row?.title?.trim() || DEFAULT_GUIDELINE_TITLE,
          slides,
          fileName: row?.file_name ?? null,
        }
      },
      ["project-guideline"],
      { tags: [CACHE_TAGS.projectGuideline] },
    )
  }
  return cachedGetProjectGuideline()
}

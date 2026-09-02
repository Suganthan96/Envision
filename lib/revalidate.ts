import { revalidateTag, revalidatePath } from "next/cache"
import type { CacheTag } from "@/lib/cache-tags"

/**
 * Purge cached shared data after an admin writes to it. Server-only — kept
 * out of lib/cache-tags.ts so the tag names stay importable from modules that
 * also reach the client bundle.
 *
 * The profile argument matters. This used to pass `"seconds"`, which is a
 * short cache-life profile — that's why tag purging appeared not to work and
 * `revalidatePath` was added to compensate. Next's own deprecation message
 * for the one-argument form points at `"max"`, which is the "expire this tag
 * regardless of age" profile and does purge `unstable_cache` entries.
 *
 * `revalidatePath("/", "layout")` is kept as a belt-and-braces fallback: it
 * clears the whole route tree, so shared data can never go stale even if a
 * tag is mistyped or a fetcher forgets to declare one. It only runs on admin
 * writes, which are rare, and the data it re-fetches is small — so the extra
 * work is not worth the risk of removing it.
 *
 * Call this on every successful admin mutation of shared data, otherwise
 * students and mentors will keep seeing the pre-edit values.
 */
export function revalidateSharedData(tag: CacheTag) {
  revalidateTag(tag, "max")
  revalidatePath("/", "layout")
}

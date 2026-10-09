/**
 * Builds the URL for a user image served by /api/img/*. The list RPCs return
 * an 8-char version (an md5 prefix of the stored data URI, null when there is
 * no image) rather than the image itself; this turns that into a cacheable
 * URL. Returns null when there is no image, so callers keep their existing
 * `logoUrl ? <img/> : <fallback/>` branches unchanged.
 *
 * `edition` pins the programme year, for pages showing a past year to
 * visitors who have no admin year cookie (login IDs repeat across years).
 */
const yearParam = (edition?: string | null) => (edition ? `&y=${encodeURIComponent(edition)}` : "")

export function teamLogoUrl(loginId: string, version: string | null, edition?: string | null): string | null {
  return version ? `/api/img/team-logo/${encodeURIComponent(loginId)}?v=${version}${yearParam(edition)}` : null
}

export function mentorAvatarUrl(loginId: string, version: string | null, edition?: string | null): string | null {
  return version ? `/api/img/mentor-avatar/${encodeURIComponent(loginId)}?v=${version}${yearParam(edition)}` : null
}

/**
 * Builds the URL for a user image served by /api/img/*. The list RPCs return
 * an 8-char version (an md5 prefix of the stored data URI, null when there is
 * no image) rather than the image itself; this turns that into a cacheable
 * URL. Returns null when there is no image, so callers keep their existing
 * `logoUrl ? <img/> : <fallback/>` branches unchanged.
 */
export function teamLogoUrl(loginId: string, version: string | null): string | null {
  return version ? `/api/img/team-logo/${encodeURIComponent(loginId)}?v=${version}` : null
}

export function mentorAvatarUrl(loginId: string, version: string | null): string | null {
  return version ? `/api/img/mentor-avatar/${encodeURIComponent(loginId)}?v=${version}` : null
}

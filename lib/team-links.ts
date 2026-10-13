/**
 * Where a team's name links to, so every mention of a team opens its profile.
 *
 * - Admins: the team's admin profile. `/admin/teams/<login>` looks the team up
 *   in the year being worked in and redirects, so callers only need the team
 *   number.
 * - Everyone else: the public project page on the Showcase, pinned to a past
 *   programme year when one is given.
 *
 * Pure, so client components can use it.
 */
export const adminTeamHref = (loginId: string) => `/admin/teams/${encodeURIComponent(loginId)}`

export const publicTeamHref = (loginId: string, year?: string | null) =>
  `/showcase/${encodeURIComponent(loginId)}${year ? `?year=${encodeURIComponent(year)}` : ""}`

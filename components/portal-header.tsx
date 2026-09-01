import { PublicNav } from "@/components/public-nav"
import { getSession } from "@/lib/get-session"
import { roleHome } from "@/lib/session"

/**
 * The header at the top of every signed-in page (admin, student, mentor) —
 * now the same floating glass pill nav used on the public pages
 * (Showcase / Mentors / theme toggle / Sign Out), so a logged-in visitor
 * sees one consistent navbar everywhere instead of two different styles.
 *
 * `marginBottom` reserves the same breathing room before the page's own
 * content that the old flat header used to occupy in normal flow — the nav
 * itself is a fixed-height floating bar regardless of which portal it's on,
 * so `maxWidth` (kept only so existing call sites don't need to change) no
 * longer does anything.
 */
export async function PortalHeader({
  marginBottom = "mb-8",
}: {
  maxWidth?: "max-w-4xl" | "max-w-5xl"
  marginBottom?: "mb-8" | "mb-16"
}) {
  const session = await getSession()
  return (
    <>
      <PublicNav isAuthenticated dashboardHref={session ? roleHome(session.role) : undefined} />
      <div className={marginBottom} />
    </>
  )
}

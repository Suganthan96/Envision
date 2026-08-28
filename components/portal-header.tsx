import { BrandLink } from "@/components/brand-link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * The wordmark + theme toggle + sign-out row at the top of every signed-in
 * page (admin, student, mentor). Pages used to render this inline inside
 * their own content wrapper, and those wrappers vary in width from page to
 * page (max-w-4xl through max-w-7xl) — so the same header rendered at a
 * different width, and therefore visibly different size, depending on which
 * page you were on. Breaking out to the viewport and re-centering at a fixed
 * width makes the header's own width independent of whatever page it's on.
 *
 * `maxWidth` is the width to re-center at — pass the width most pages in
 * that portal already use, so the header lines up with page content on the
 * common case even though it no longer depends on it. `marginBottom`
 * likewise standardizes the gap before the page's own content, which had
 * also drifted per page (mb-2, mb-8, mb-16 all appeared).
 */
export function PortalHeader({
  maxWidth,
  marginBottom = "mb-8",
}: {
  maxWidth: "max-w-4xl" | "max-w-5xl"
  marginBottom?: "mb-8" | "mb-16"
}) {
  return (
    <div className="relative w-screen left-1/2 -translate-x-1/2 px-6">
      <div className={`${maxWidth} mx-auto flex items-center justify-between ${marginBottom}`}>
        <BrandLink />
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

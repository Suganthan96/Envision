import { BrandLink } from "@/components/brand-link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * The wordmark + theme toggle + sign-out row at the top of every admin page.
 * Same reasoning as AdminNav: each page used to render this inside its own
 * content wrapper (max-w-4xl through max-w-7xl depending on the page), so
 * the logo and button visibly changed size between pages. Breaking out to
 * the viewport and re-centering at a fixed width fixes both at once.
 */
export function AdminHeader() {
  return (
    <div className="relative w-screen left-1/2 -translate-x-1/2 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-16">
        <BrandLink />
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "User Management" },
  { href: "/admin/domain-selection", label: "Domain Selection" },
  { href: "/admin/matching", label: "Mentor Allocation" },
  { href: "/admin/timeline", label: "Timeline" },
  { href: "/admin/domains", label: "Domains" },
  { href: "/admin/mentor-profiles", label: "Mentor Profiles" },
  { href: "/admin/team-profiles", label: "Team Profiles" },
] as const

type AdminNavHref = (typeof ADMIN_NAV_ITEMS)[number]["href"]

// The student and mentor selection screens live under the Domain Selection
// hub, so they keep that tab lit rather than adding entries of their own.
export type AdminNavActive = AdminNavHref | "/admin/students" | "/admin/mentors"

const HUB_CHILDREN: Record<string, AdminNavHref> = {
  "/admin/students": "/admin/domain-selection",
  "/admin/mentors": "/admin/domain-selection",
}

export function AdminNav({ active }: { active: AdminNavActive }) {
  const activeHref = HUB_CHILDREN[active] ?? active

  return (
    // Every admin page nests this inside its own content wrapper, and those
    // wrappers range from max-w-4xl (a narrow profile page) to max-w-7xl (the
    // matching board) — so the same nav was rendering at a different width,
    // and therefore wrapping the 7 items differently, on every page. Breaking
    // out to the viewport and re-centering at a fixed width makes the nav's
    // own width independent of whatever container it's placed in.
    <div className="relative w-screen left-1/2 -translate-x-1/2 px-6 mb-8">
      <div className="max-w-5xl mx-auto flex items-center gap-6 flex-wrap">
        {ADMIN_NAV_ITEMS.map((item) =>
          item.href === activeHref ? (
            <span
              key={item.href}
              className="text-primary text-sm uppercase tracking-wider border-b border-primary pb-1"
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
            >
              {item.label}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}

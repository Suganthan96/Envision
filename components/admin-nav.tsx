import Link from "next/link"

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "User Management" },
  { href: "/admin/mentors", label: "Mentor Selections" },
  { href: "/admin/students", label: "Student Selections" },
  { href: "/admin/matching", label: "Mentor Matching" },
  { href: "/admin/timeline", label: "Timeline" },
  { href: "/admin/domains", label: "Domains" },
  { href: "/admin/mentor-profiles", label: "Mentor Profiles" },
  { href: "/admin/team-profiles", label: "Team Profiles" },
] as const

export function AdminNav({ active }: { active: (typeof ADMIN_NAV_ITEMS)[number]["href"] }) {
  return (
    <div className="flex items-center gap-6 mb-8 flex-wrap">
      {ADMIN_NAV_ITEMS.map((item) =>
        item.href === active ? (
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
  )
}

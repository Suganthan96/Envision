import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DomainEditor } from "@/components/domain-editor"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function AdminDomainsPage() {
  const domains = await getDomains()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="inline" />
            <LogoutButton />
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8 flex-wrap">
          <Link href="/admin" className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider">
            User Management
          </Link>
          <Link
            href="/admin/mentors"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Mentor Selections
          </Link>
          <Link
            href="/admin/students"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Student Selections
          </Link>
          <Link
            href="/admin/matching"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Mentor Matching
          </Link>
          <Link
            href="/admin/timeline"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Timeline
          </Link>
          <span className="text-primary text-sm uppercase tracking-wider border-b border-primary pb-1">
            Domains
          </span>
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Domain <span className="text-gold-gradient">Themes</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Add, edit, or delete the themes students and mentors can choose from. A theme with existing selections
          can&apos;t be deleted. New themes start with a default capacity of 6 students / 7 mentors — adjust that
          from the Mentor or Student Selections page.
        </p>

        <DomainEditor initialDomains={domains} />
      </div>
    </main>
  )
}

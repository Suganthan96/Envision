import Link from "next/link"
import { DomainSelectionPage } from "@/components/domain-selection-page"
import { getAppSettings } from "@/lib/app-settings"
import { getDomains } from "@/lib/domains"
import { PortalHeader } from "@/components/portal-header"

export const dynamic = "force-dynamic"

export default async function MemberDomainsPage() {
  const [{ studentDomainSelectionOpen, studentCanSelect }, domains] = await Promise.all([
    getAppSettings(),
    getDomains(),
  ])

  // The wording has to follow whether a student can actually pick a domain,
  // not merely whether the screen is visible — with visibility on but
  // selection closed the page used to invite a choice it wouldn't accept.
  const canSelect = studentDomainSelectionOpen && studentCanSelect

  return (
    <main className="min-h-screen bg-background px-6 py-6">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <Link
          href="/member"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider inline-block"
        >
          ← Back to Portal
        </Link>
      </div>

      <DomainSelectionPage
        role="student"
        eyebrow="Student Portal"
        heading={canSelect ? "Choose Your Domain" : "Domains"}
        description={
          canSelect
            ? "Select the domain you'd like to build your project in for this cycle."
            : "Browse the available domains for this cycle."
        }
        domains={domains}
        maxSelections={1}
        canSelect={canSelect}
      />
    </main>
  )
}

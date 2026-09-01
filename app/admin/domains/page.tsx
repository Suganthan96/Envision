import { AdminNav } from "@/components/admin-nav"
import { DomainEditor } from "@/components/domain-editor"
import { getDomains } from "@/lib/domains"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

export default async function AdminDomainsPage() {
  const domains = await getDomains()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-4xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/domains" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Domain <span className="text-gold-gradient">Themes</span>
        </h1>

        <DomainEditor initialDomains={domains} />
      </div>
    </main>
  )
}

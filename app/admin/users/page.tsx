import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { TableSkeleton } from "@/components/skeletons"
import { AdminUsersSection } from "./admin-users-section"

export const dynamic = "force-dynamic"

export default function AdminUsersPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/users" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          User <span className="text-gold-gradient">Management</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Every account: teams, mentors, faculty, jury and admins. Add, edit, reset or hide them here.
        </p>

        <Suspense fallback={<TableSkeleton />}>
          <AdminUsersSection />
        </Suspense>
      </div>
    </main>
  )
}

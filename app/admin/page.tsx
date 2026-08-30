import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { TableSkeleton } from "@/components/skeletons"
import { AdminUsersSection } from "./admin-users-section"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Welcome, <span className="text-gold-gradient">Administrator</span>
        </h1>

        <Suspense fallback={<TableSkeleton />}>
          <AdminUsersSection />
        </Suspense>
      </div>
    </main>
  )
}

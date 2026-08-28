import { PortalHeader } from "@/components/portal-header"

/** Thin admin-specific alias: admin pages mostly land on max-w-5xl content. */
export function AdminHeader() {
  return <PortalHeader maxWidth="max-w-5xl" marginBottom="mb-16" />
}

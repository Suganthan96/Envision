/**
 * Deterministic date formatting for values rendered during SSR + hydrated on
 * the client. `toLocaleDateString()` with no args uses the runtime's locale
 * and timezone, which differ between the server and the visitor's browser
 * and cause React hydration mismatches. Pinning both keeps server and client
 * output identical.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d)
}

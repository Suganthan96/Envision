import Link from "next/link"
import { getCurrentEdition, getEditions, getRequestEdition } from "@/lib/edition"
import { BackToCurrentYear, YearSwitcher } from "@/components/year-switcher"
import { ManualSearch } from "@/components/manual-search"

/**
 * Under the admin nav: the help search, which programme year these pages are
 * showing, a way to switch, and — when it isn't the current year — a clear
 * warning that every change lands in that year.
 */
export async function YearBar() {
  const [years, active, current] = await Promise.all([getEditions(), getRequestEdition(), getCurrentEdition()])
  const past = active.id !== current.id

  return (
    // z-40: the translate makes this its own stacking context, so the help
    // search's answer panel can only sit above later cards (the Judging band,
    // dashboard panels) if the whole bar does.
    <div className="relative z-40 w-screen left-1/2 -translate-x-1/2 px-6 -mt-4 mb-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <ManualSearch />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/admin/manual" className="text-sm text-muted-foreground hover:text-primary">
              Manual
            </Link>
            <YearSwitcher
              years={years.map((y) => ({ id: y.id, label: y.label, isCurrent: y.isCurrent }))}
              active={active.id}
            />
            <Link href="/admin/years" className="text-sm text-muted-foreground hover:text-primary">
              Manage years
            </Link>
          </div>
        </div>
        {past && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/60 bg-primary/10 px-5 py-3 text-sm"
          >
            <p className="text-foreground">
              You&apos;re working in <strong className="font-semibold">{active.label}</strong>. Every change here
              applies to {active.label}; teams and mentors are using {current.label}.
            </p>
            <BackToCurrentYear label={current.label} />
          </div>
        )}
      </div>
    </div>
  )
}

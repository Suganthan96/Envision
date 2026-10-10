import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { ManualSearch } from "@/components/manual-search"
import { ManualTopicBody } from "@/components/manual-topic"
import { MANUAL, MANUAL_SECTIONS } from "@/lib/admin-manual"

/**
 * The admin user manual: search it in your own words at the top, or browse
 * every topic below. The same content answers the help search on every
 * admin page (lib/admin-manual.ts).
 */
export default function AdminManualPage() {
  const sections = MANUAL_SECTIONS.map((s) => ({ ...s, topics: MANUAL.filter((t) => t.section === s.id) })).filter(
    (s) => s.topics.length > 0,
  )

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/manual" />

        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">User manual</h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-3xl">
          Everything an admin needs to run EnVision, from adding a team to starting next year. Ask a question in
          your own words, or browse the topics below.
        </p>

        <div className="mb-12">
          <ManualSearch variant="page" />
        </div>

        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="Manual contents" className="lg:sticky lg:top-8 self-start">
            <p className="text-sm text-foreground mb-3">Contents</p>
            <ol className="flex flex-col gap-2 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#section-${s.id}`} className="text-muted-foreground hover:text-primary">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-14 min-w-0">
            {sections.map((s) => (
              <section key={s.id} id={`section-${s.id}`} className="scroll-mt-8">
                <h2 className="font-serif text-3xl text-foreground mb-6 pb-3 border-b border-border">{s.title}</h2>
                <div className="flex flex-col gap-8">
                  {s.topics.map((t) => (
                    <article key={t.id} id={t.id} className="scroll-mt-8 target:rounded-lg target:ring-1 target:ring-primary/60 target:p-4">
                      <h3 className="font-serif text-xl text-foreground mb-2">{t.title}</h3>
                      <ManualTopicBody topic={t} />
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

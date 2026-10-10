import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import type { ManualTopic } from "@/lib/admin-manual"

/** One manual answer: the direct answer, then steps, notes and where to go. */
export function ManualTopicBody({ topic, onNavigate }: { topic: ManualTopic; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      <p className="text-foreground">{topic.summary}</p>
      {topic.steps && topic.steps.length > 0 && (
        <ol className="list-decimal pl-5 flex flex-col gap-1.5 text-foreground/90 marker:text-primary">
          {topic.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      {topic.notes && topic.notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-muted-foreground border-l-2 border-primary/40 pl-3">
          {topic.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {topic.links && topic.links.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {topic.links.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              onClick={onNavigate}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {l.label}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

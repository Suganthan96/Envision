import { UserCircle } from "lucide-react"
import type { AdminMentorProfile } from "@/lib/admin-directories"

export function AdminMentorProfileCard({
  mentor,
  domainTitles,
}: {
  mentor: AdminMentorProfile
  domainTitles: string[]
}) {
  const displayName = mentor.name?.trim() || mentor.loginId

  return (
    <div className="relative p-6 bg-card/40 border border-border flex flex-col items-center text-center gap-4">
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

      <div className="size-20 rounded-full border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
        {mentor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mentor.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <UserCircle className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      <div>
        <h3 className="font-serif text-xl text-foreground mb-1">{displayName}</h3>
        <p className="text-muted-foreground text-xs font-mono">{mentor.loginId}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {domainTitles.map((title) => (
          <span
            key={title}
            className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5"
          >
            {title}
          </span>
        ))}
        {mentor.venue && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">
            {mentor.venue}
          </span>
        )}
      </div>

      {mentor.bio ? (
        <p className="w-full text-left text-foreground text-sm leading-relaxed whitespace-pre-wrap pt-4 border-t border-border">
          {mentor.bio}
        </p>
      ) : (
        <p className="w-full text-left text-muted-foreground text-xs italic pt-4 border-t border-border">
          This mentor hasn&apos;t added a description yet.
        </p>
      )}
    </div>
  )
}

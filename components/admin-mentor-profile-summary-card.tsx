import Link from "next/link"
import { UserCircle } from "lucide-react"
import type { AdminMentorProfile } from "@/lib/admin-directories"

export function AdminMentorProfileSummaryCard({ mentor }: { mentor: AdminMentorProfile }) {
  const displayName = mentor.name?.trim() || mentor.loginId

  return (
    <Link
      href={`/admin/mentor-profiles/${mentor.mentorUserId}`}
      className="group relative p-6 bg-card/40 border border-border hover:border-primary transition-all duration-500 flex flex-col items-center text-center gap-3"
    >
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

      <div className="size-20 rounded-full border border-border bg-card flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500">
        {mentor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mentor.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <UserCircle className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      <h3 className="font-serif text-xl text-foreground">{displayName}</h3>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {mentor.venue && (
          <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5">
            {mentor.venue}
          </span>
        )}
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">
          {mentor.loginId}
        </span>
      </div>

      {mentor.bio ? (
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{mentor.bio}</p>
      ) : (
        <p className="text-muted-foreground text-xs italic">No description yet.</p>
      )}
    </Link>
  )
}

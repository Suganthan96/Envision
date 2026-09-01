import { UserCircle } from "lucide-react"
import type { PublicShowcaseMentor } from "@/lib/public-showcase"
import BorderGlow from "@/components/border-glow"

export function PublicMentorCard({
  mentor,
  domainTitles,
  onOpen,
}: {
  mentor: PublicShowcaseMentor
  domainTitles: string[]
  onOpen: () => void
}) {
  const displayName = mentor.name?.trim() || mentor.loginId

  return (
    <BorderGlow
      className="h-full"
      backgroundColor="transparent"
      borderRadius={16}
      glowRadius={20}
      edgeSensitivity={40}
      glowColor="42 65 55"
      colors={["var(--primary)", "var(--gold-gradient-2)", "var(--gold-gradient-1)"]}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group relative overflow-hidden p-6 rounded-2xl bg-card/40 backdrop-blur-md border border-border hover:border-primary/70 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center gap-3 h-full w-full"
      >
        {/* Ambient corner glow — static gold blobs bleeding in from two
            corners, giving the frosted card some warmth instead of reading as
            a flat glass pane. */}
        <div className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />

        <div className="relative z-10">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative size-24 rounded-full border-2 border-primary/30 group-hover:border-primary bg-card flex items-center justify-center overflow-hidden shrink-0 transition-colors duration-300">
            {mentor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mentor.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-11 h-11 text-muted-foreground" />
            )}
          </div>
        </div>

        <h3 className="relative z-10 font-serif text-xl text-foreground group-hover:text-primary transition-colors">
          {displayName}
        </h3>

        {domainTitles.length > 0 && (
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5">
            {domainTitles.map((title) => (
              <span
                key={title}
                className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5 rounded-full"
              >
                {title}
              </span>
            ))}
          </div>
        )}

        {mentor.bio ? (
          <p className="relative z-10 text-muted-foreground text-sm leading-relaxed line-clamp-3 pt-3 border-t border-border w-full">
            {mentor.bio}
          </p>
        ) : (
          <div className="relative z-10 pt-3 border-t border-border w-full" />
        )}
      </button>
    </BorderGlow>
  )
}

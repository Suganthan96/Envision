import Link from "next/link"
import { Trophy } from "lucide-react"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { PortalHeader } from "@/components/portal-header"
import { getSession } from "@/lib/get-session"
import { getLeaderboard } from "@/lib/leaderboard"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""))

export default async function MemberLeaderboardPage() {
  const session = await getSession()
  const { rounds, entries } = session ? await getLeaderboard(session.userId) : { rounds: [], entries: [] }
  const averaged = rounds.length > 1
  const mine = entries.find((e) => e.studentUserId === session?.userId) ?? null

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <Link
          href="/member"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Portal
        </Link>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          <span className="text-gold-gradient">Leaderboard</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-4">
          {rounds.length === 0
            ? "Scores will appear here once the organisers publish them."
            : averaged
              ? `Ranked by the average of ${rounds.map((r) => r.name).join(", ")}.`
              : `Scores from ${rounds[0].name}.`}
        </p>

        <ArtDecoDivider variant="stepped" />

        {mine && (
          <div className="flex items-center gap-4 border border-primary rounded-lg bg-card/40 px-5 py-4 mb-8">
            <Trophy className="w-6 h-6 text-primary shrink-0" />
            <p className="text-foreground">
              Your team is ranked <span className="text-primary font-medium">#{mine.rank}</span> of{" "}
              {entries.length}
              {averaged ? (
                <>
                  {" "}
                  with an average of <span className="text-primary font-medium">{fmt(mine.overall)}</span>
                </>
              ) : (
                <>
                  {" "}
                  with <span className="text-primary font-medium">{fmt(mine.overall)}</span> / {rounds[0].max}
                </>
              )}
              .
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <div className="border border-border rounded-lg bg-card/40 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-primary tracking-[0.1em] uppercase text-[10px] font-normal w-14">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-primary tracking-[0.1em] uppercase text-[10px] font-normal">
                    Team
                  </th>
                  {rounds.map((r) => (
                    <th
                      key={r.id}
                      className="px-4 py-3 text-primary tracking-[0.1em] uppercase text-[10px] font-normal text-right whitespace-nowrap"
                    >
                      {r.name}
                      <span className="text-muted-foreground normal-case tracking-normal"> / {r.max}</span>
                    </th>
                  ))}
                  {averaged && (
                    <th className="px-4 py-3 text-primary tracking-[0.1em] uppercase text-[10px] font-normal text-right">
                      Average
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isMine = e.studentUserId === session?.userId
                  return (
                    <tr
                      key={e.studentUserId}
                      className={cn("border-b border-border/60 last:border-0", isMine && "bg-primary/10")}
                    >
                      <td
                        className={cn(
                          "px-4 py-3 tabular-nums",
                          e.rank <= 3 ? "text-primary font-medium" : "text-muted-foreground",
                        )}
                      >
                        {e.rank}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground font-mono text-xs mr-2">#{e.loginId}</span>
                        <span className={isMine ? "text-primary" : "text-foreground"}>{e.teamName}</span>
                      </td>
                      {rounds.map((r) => (
                        <td key={r.id} className="px-4 py-3 text-right tabular-nums text-foreground">
                          {e.scores[r.id] == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            fmt(e.scores[r.id])
                          )}
                        </td>
                      ))}
                      {averaged && (
                        <td className="px-4 py-3 text-right tabular-nums text-primary font-medium">
                          {fmt(e.overall)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {averaged && entries.length > 0 && (
          <p className="text-muted-foreground text-xs mt-3">
            A round a team has no score in counts as 0 toward its average.
          </p>
        )}
      </div>
    </main>
  )
}

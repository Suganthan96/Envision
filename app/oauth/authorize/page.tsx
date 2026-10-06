import type { Metadata } from "next"
import { Bot, ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/get-session"
import { parseAuthorize } from "@/lib/mcp/oauth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Envision | Connect an agent",
  description: "Let an AI agent manage EnVision as you.",
}

type Params = Record<string, string | string[] | undefined>

/**
 * Where an MCP client (VS Code, Claude, Cursor…) sends the admin to connect.
 * Signed out: the normal login form, which comes straight back here. Signed in
 * as an admin: one Allow / Deny screen.
 */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const get = (k: string) => {
    const v = params[k]
    return typeof v === "string" ? v : null
  }
  const [parsed, session] = await Promise.all([parseAuthorize(get), getSession()])
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString()

  return (
    <main className="min-h-screen bg-background">
      <ThemeToggle />
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-md w-full">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-px bg-primary" />
              <div className="w-3 h-3 rotate-45 border border-primary" />
              <div className="w-16 h-px bg-primary" />
            </div>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">
            <span className="text-gold-gradient">Envision</span>
          </h1>

          <div className="relative p-8 border border-border bg-card/40 mt-8 text-left">
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-primary" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-primary" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary" />

            {"error" in parsed ? (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-foreground">Couldn&apos;t connect.</p>
                <p className="text-muted-foreground text-sm">{parsed.error}</p>
                {parsed.redirect && (
                  <a href={parsed.redirect} className="text-primary text-sm underline underline-offset-4">
                    Return to the app
                  </a>
                )}
              </div>
            ) : !session ? (
              <div className="flex flex-col gap-6">
                <p className="text-muted-foreground text-sm text-center">
                  Sign in with your admin account to connect{" "}
                  <span className="text-foreground">{parsed.ok.client.name}</span>.
                </p>
                <LoginForm redirectTo={`/oauth/authorize?${query}`} />
              </div>
            ) : session.role !== "admin" ? (
              <div className="flex flex-col gap-3 text-center">
                <p className="text-foreground">Admins only</p>
                <p className="text-muted-foreground text-sm">
                  You&apos;re signed in as {session.loginId}. Sign out and sign in with an admin account to connect an
                  agent.
                </p>
              </div>
            ) : (
              <form method="post" action="/api/oauth/authorize" className="flex flex-col gap-6">
                {Object.entries(params).map(([k, v]) =>
                  typeof v === "string" ? <input key={k} type="hidden" name={k} value={v} /> : null,
                )}
                <div className="flex items-center gap-4">
                  <div className="size-12 shrink-0 rounded-xl border border-primary/50 bg-primary/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{parsed.ok.client.name}</p>
                    <p className="text-muted-foreground text-sm">wants to connect to EnVision</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg border border-border bg-background/40 p-4 text-sm">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    It will be able to do everything the admin portal can — read and change teams, mentors, venues,
                    rounds and scores — acting as <span className="text-foreground">{session.loginId}</span>. You can
                    connect again any time; tokens last 90 days.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    name="decision"
                    value="deny"
                    variant="outline"
                    className="flex-1 h-11 border-border text-foreground hover:bg-transparent dark:hover:bg-transparent"
                  >
                    Deny
                  </Button>
                  <Button
                    type="submit"
                    name="decision"
                    value="allow"
                    className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm"
                  >
                    Allow
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

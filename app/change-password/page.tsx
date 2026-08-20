import { ArtDecoSunburst } from "@/components/art-deco-sunburst"
import { ChangePasswordForm } from "@/components/change-password-form"
import { getSession } from "@/lib/get-session"

export default async function ChangePasswordPage() {
  const session = await getSession()

  return (
    <main className="min-h-screen bg-background">
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <ArtDecoSunburst />

        <div className="relative z-10 text-center max-w-md mx-auto w-full">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-px bg-primary" />
              <div className="w-3 h-3 rotate-45 border border-primary" />
              <div className="w-16 h-px bg-primary" />
            </div>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-12">
            <span className="text-gold-gradient">Set Your Password</span>
          </h1>

          <div className="relative p-8 border border-border bg-card/40">
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-primary" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-primary" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary" />

            <ChangePasswordForm
              forced={session?.mustChangePassword ?? true}
              requireName={session?.role === "mentor" || session?.role === "member"}
              nameLabel={session?.role === "member" ? "Team Name" : "Full Name"}
              nameHelperText={
                session?.role === "member"
                  ? "You can rename your team later from your dashboard."
                  : "You will need to enter this exact name every time you sign in."
              }
            />
          </div>
        </div>
      </section>
    </main>
  )
}

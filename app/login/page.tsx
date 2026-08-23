import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"

export const metadata: Metadata = {
  title: "Envision | Sign In",
  description: "Sign in to Envision.",
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <ThemeToggle />
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="relative z-10 text-center max-w-md mx-auto w-full">
          {/* Decorative top element */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-px bg-primary" />
              <div className="w-3 h-3 rotate-45 border border-primary" />
              <div className="w-16 h-px bg-primary" />
            </div>
          </div>

          <p className="text-primary tracking-[0.3em] uppercase text-sm mb-6">Est. 2021</p>

          <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-4 leading-tight">
            <span className="text-gold-gradient">Envision</span>
          </h1>

          <p className="text-muted-foreground text-base mb-12">Sign in to continue</p>

          <div className="relative p-8 border border-border bg-card/40">
            {/* Decorative frame corners */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-primary" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-primary" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary" />

            <LoginForm />
          </div>

          {/* Decorative bottom element */}
          <div className="flex justify-center mt-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-primary to-primary" />
              <div className="w-2 h-2 rotate-45 bg-primary" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

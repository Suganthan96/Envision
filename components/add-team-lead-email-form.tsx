"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AddTeamLeadEmailForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/member/add-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Unable to save the email address.")
        setLoading(false)
        return
      }

      router.push(data.redirect)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <p className="text-muted-foreground text-sm text-center leading-relaxed">
        We need your team lead&apos;s email address to keep you updated about the program.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-primary tracking-[0.15em] uppercase text-xs">
          Team Lead Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="teamlead@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-11"
        />
      </div>

      {error && <p className="text-destructive text-sm text-center">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wider uppercase text-sm h-11 transition-all duration-300"
      >
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  )
}

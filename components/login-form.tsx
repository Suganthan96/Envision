"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MENTOR_ID_ERROR, isValidMentorId, looksLikeMentorId } from "@/lib/mentor-login-id"

export function LoginForm() {
  const router = useRouter()
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (looksLikeMentorId(loginId) && !isValidMentorId(loginId)) {
      setError(MENTOR_ID_ERROR)
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Unable to sign in.")
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginId" className="text-primary tracking-[0.15em] uppercase text-xs">
          Login ID
        </Label>
        <Input
          id="loginId"
          type="text"
          autoComplete="username"
          placeholder="Enter your login ID"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-primary tracking-[0.15em] uppercase text-xs">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {loading ? "Signing In..." : "Sign In"}
      </Button>
    </form>
  )
}

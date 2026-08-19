"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Unable to update password.")
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
      {forced && (
        <p className="text-muted-foreground text-sm text-center leading-relaxed">
          This is your first sign-in. You must set a new password before continuing.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="oldPassword" className="text-primary tracking-[0.15em] uppercase text-xs">
          Current Password
        </Label>
        <Input
          id="oldPassword"
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
          className="bg-card border-border text-foreground focus:border-primary focus:ring-primary h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword" className="text-primary tracking-[0.15em] uppercase text-xs">
          New Password
        </Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="bg-card border-border text-foreground focus:border-primary focus:ring-primary h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword" className="text-primary tracking-[0.15em] uppercase text-xs">
          Confirm New Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="bg-card border-border text-foreground focus:border-primary focus:ring-primary h-11"
        />
      </div>

      {error && <p className="text-destructive text-sm text-center">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wider uppercase text-sm h-11 transition-all duration-300"
      >
        {loading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  )
}

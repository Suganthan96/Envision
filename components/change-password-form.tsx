"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"

export function ChangePasswordForm({
  forced,
  requireName = false,
  nameLabel = "Full Name",
  nameHelperText = "You will need to enter this exact name every time you sign in.",
  requirePhone = false,
  phoneLabel = "Phone Number",
  phoneHelperText = "We'll use this to reach you about the program.",
  requireTeamLeadName = false,
  teamLeadNameLabel = "Team Leader Name",
  teamLeadNameHelperText = "The name of your team's leader.",
}: {
  forced: boolean
  requireName?: boolean
  nameLabel?: string
  nameHelperText?: string
  requirePhone?: boolean
  phoneLabel?: string
  phoneHelperText?: string
  requireTeamLeadName?: boolean
  teamLeadNameLabel?: string
  teamLeadNameHelperText?: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [teamLeadName, setTeamLeadName] = useState("")
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
        body: JSON.stringify({ oldPassword, newPassword, name, phone, teamLeadName }),
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

      {requireName && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-primary tracking-[0.15em] uppercase text-xs">
            {nameLabel}
          </Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder={`Enter your ${nameLabel.toLowerCase()}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-card border-border text-foreground focus:border-primary focus:ring-primary h-11"
          />
          <p className="text-muted-foreground text-xs">{nameHelperText}</p>
        </div>
      )}

      {requireTeamLeadName && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="teamLeadName" className="text-primary tracking-[0.15em] uppercase text-xs">
            {teamLeadNameLabel}
          </Label>
          <Input
            id="teamLeadName"
            type="text"
            autoComplete="name"
            placeholder="Enter your team leader's name"
            value={teamLeadName}
            onChange={(e) => setTeamLeadName(e.target.value)}
            required
            className="bg-card border-border text-foreground focus:border-primary focus:ring-primary h-11"
          />
          <p className="text-muted-foreground text-xs">{teamLeadNameHelperText}</p>
        </div>
      )}

      {requirePhone && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone" className="text-primary tracking-[0.15em] uppercase text-xs">
            {phoneLabel}
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="bg-card border-border text-foreground focus:border-primary focus:ring-primary h-11"
          />
          <p className="text-muted-foreground text-xs">{phoneHelperText}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="oldPassword" className="text-primary tracking-[0.15em] uppercase text-xs">
          Current Password
        </Label>
        <PasswordInput
          id="oldPassword"
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
        <PasswordInput
          id="newPassword"
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
        <PasswordInput
          id="confirmPassword"
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

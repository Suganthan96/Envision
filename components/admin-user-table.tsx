"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type AppUserRow = {
  login_id: string
  role: "member" | "mentor" | "admin"
  must_change_password: boolean
}

const DEFAULT_PASSWORD = "licet@123"

export function AdminUserTable({ users }: { users: AppUserRow[] }) {
  const router = useRouter()
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const resetPassword = async (loginId: string, password?: string) => {
    setPending(loginId)
    setFeedback((f) => ({ ...f, [loginId]: "" }))

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLoginId: loginId, newPassword: password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFeedback((f) => ({ ...f, [loginId]: data.error ?? "Failed to reset." }))
        return
      }

      setFeedback((f) => ({ ...f, [loginId]: "Password reset. They must set a new one at next sign-in." }))
      setCustomPasswords((c) => ({ ...c, [loginId]: "" }))
      router.refresh()
    } catch {
      setFeedback((f) => ({ ...f, [loginId]: "Something went wrong." }))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Login ID</TableHead>
            <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Role</TableHead>
            <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Status</TableHead>
            <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Reset Password</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.login_id} className="border-border align-top">
              <TableCell className="text-foreground font-mono">{u.login_id}</TableCell>
              <TableCell className="text-muted-foreground capitalize">{u.role}</TableCell>
              <TableCell className="text-muted-foreground">
                {u.must_change_password ? "Awaiting first sign-in" : "Active"}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2 py-1">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={`Default: ${DEFAULT_PASSWORD}`}
                      value={customPasswords[u.login_id] ?? ""}
                      onChange={(e) =>
                        setCustomPasswords((c) => ({ ...c, [u.login_id]: e.target.value }))
                      }
                      className="bg-card border-border text-foreground h-8 text-sm w-48"
                    />
                    <Button
                      size="sm"
                      disabled={pending === u.login_id}
                      onClick={() => resetPassword(u.login_id, customPasswords[u.login_id] || undefined)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-wider h-8"
                    >
                      Reset
                    </Button>
                  </div>
                  {feedback[u.login_id] && (
                    <p className="text-xs text-muted-foreground">{feedback[u.login_id]}</p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

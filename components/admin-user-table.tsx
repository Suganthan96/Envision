"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
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
  const [query, setQuery] = useState("")

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.login_id.toLowerCase().includes(q) || u.role.toLowerCase().includes(q),
    )
  }, [users, query])

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
    <div>
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by login ID or role..."
          className="pl-9 bg-card border-border text-foreground rounded-none h-10"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <p className="text-muted-foreground">No users match your search.</p>
        </div>
      ) : (
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
              {filteredUsers.map((u) => (
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
      )}
    </div>
  )
}

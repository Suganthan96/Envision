"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  name: string | null
  phone: string | null
  email: string | null
}

const DEFAULT_PASSWORD = "licet@123"

export function AdminUserTable({ users }: { users: AppUserRow[] }) {
  const router = useRouter()
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [addLoginId, setAddLoginId] = useState("")
  const [addRole, setAddRole] = useState<"member" | "mentor">("member")
  const [addPassword, setAddPassword] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.login_id.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q),
    )
  }, [users, query])

  const deletableFiltered = filteredUsers.filter((u) => u.role !== "admin")
  const allFilteredSelected =
    deletableFiltered.length > 0 && deletableFiltered.every((u) => selected.has(u.login_id))

  const toggleOne = (loginId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(loginId)
      else next.delete(loginId)
      return next
    })
  }

  const toggleAllFiltered = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const u of deletableFiltered) {
        if (checked) next.add(u.login_id)
        else next.delete(u.login_id)
      }
      return next
    })
  }

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

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.length === 0) return
    setDeleting(true)
    setDeleteError("")

    try {
      const res = await fetch("/api/admin/delete-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginIds: deleteTarget }),
      })
      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.error ?? "Unable to delete accounts.")
        return
      }

      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of deleteTarget) next.delete(id)
        return next
      })
      setDeleteTarget(null)
      router.refresh()
    } catch {
      setDeleteError("Something went wrong. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const submitAddUser = async () => {
    setAdding(true)
    setAddError("")

    try {
      const res = await fetch("/api/admin/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: addLoginId.trim(), role: addRole, password: addPassword || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAddError(data.error ?? "Unable to add user.")
        return
      }

      setAddOpen(false)
      setAddLoginId("")
      setAddPassword("")
      setAddRole("member")
      router.refresh()
    } catch {
      setAddError("Something went wrong. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="relative max-w-sm flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by login ID or role..."
            className="pl-9 bg-card border-border text-foreground h-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(Array.from(selected))}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground dark:hover:bg-destructive dark:hover:text-destructive-foreground dark:bg-transparent dark:border-destructive text-xs uppercase tracking-wider h-10"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Selected ({selected.size})
            </Button>
          )}
          <Button
            onClick={() => {
              setAddError("")
              setAddOpen(true)
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-wider h-10"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add User
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <p className="text-muted-foreground">No users match your search.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={(checked) => toggleAllFiltered(checked === true)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Login ID</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Name</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Phone</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Email</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Role</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Status</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Reset Password</TableHead>
                <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.login_id} className="border-border align-top">
                  <TableCell>
                    {u.role !== "admin" && (
                      <Checkbox
                        checked={selected.has(u.login_id)}
                        onCheckedChange={(checked) => toggleOne(u.login_id, checked === true)}
                        aria-label={`Select ${u.login_id}`}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-foreground font-mono">{u.login_id}</TableCell>
                  <TableCell className="text-muted-foreground">{u.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-mono">{u.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-mono">{u.email ?? "—"}</TableCell>
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
                  <TableCell>
                    {u.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget([u.login_id])}
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground dark:hover:bg-destructive dark:hover:text-destructive-foreground dark:bg-transparent dark:border-destructive h-8 w-8 p-0"
                        aria-label={`Delete ${u.login_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteError("")
          }
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-foreground">
              Delete {deleteTarget && deleteTarget.length > 1 ? `${deleteTarget.length} accounts` : "account"}?
            </DialogTitle>
          </DialogHeader>

          <DialogDescription className="text-muted-foreground leading-relaxed text-base">
            This permanently removes {deleteTarget && deleteTarget.length > 1 ? "these accounts" : "this account"} and
            any domain selection they made. This cannot be undone.
          </DialogDescription>

          {deleteTarget && (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {deleteTarget.map((id) => (
                <span key={id} className="text-xs font-mono text-foreground border border-border px-2 py-1">
                  {id}
                </span>
              ))}
            </div>
          )}

          {deleteError && <p className="text-destructive text-sm">{deleteError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="border-border text-foreground uppercase tracking-wider text-sm bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 uppercase tracking-wider text-sm"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setAddError("")
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-foreground">Add New User</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="addLoginId" className="text-primary tracking-[0.15em] uppercase text-xs">
                Login ID
              </Label>
              <Input
                id="addLoginId"
                value={addLoginId}
                onChange={(e) => setAddLoginId(e.target.value)}
                placeholder="Enter a unique login ID"
                className="bg-card border-border text-foreground h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-primary tracking-[0.15em] uppercase text-xs">Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as "member" | "mentor")}>
                <SelectTrigger className="bg-card border-border text-foreground w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (Student)</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="addPassword" className="text-primary tracking-[0.15em] uppercase text-xs">
                Starting Password
              </Label>
              <Input
                id="addPassword"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder={`Default: ${DEFAULT_PASSWORD}`}
                className="bg-card border-border text-foreground h-10"
              />
              <p className="text-muted-foreground text-xs">
                They will be required to set a new password at their first sign-in.
              </p>
            </div>

            {addError && <p className="text-destructive text-sm">{addError}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={adding}
              onClick={() => setAddOpen(false)}
              className="border-border text-foreground uppercase tracking-wider text-sm bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={adding || !addLoginId.trim()}
              onClick={submitAddUser}
              className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm"
            >
              {adding ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Pencil, Search, Trash2, UserPlus } from "lucide-react"
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

/** Roles an admin can create here. Admin accounts are never made through the UI. */
type AddableRole = "member" | "mentor" | "faculty" | "jury"

export type AppUserRow = {
  login_id: string
  role: "member" | "mentor" | "admin" | "faculty" | "jury"
  must_change_password: boolean
  name: string | null
  phone: string | null
  email: string | null
  hidden?: boolean
}

const DEFAULT_PASSWORD = "licet@123"

const isEvaluatorRole = (role: string) => role === "faculty" || role === "jury"

/** Faculty and External Jury read better than the raw role names. */
const ROLE_LABEL: Record<string, string> = {
  member: "Member",
  mentor: "Mentor",
  admin: "Admin",
  faculty: "Faculty",
  jury: "External Jury",
}

export function AdminUserTable({
  users,
  venues = [],
  venuesByLogin = {},
}: {
  users: AppUserRow[]
  /** Judging venues, for assigning faculty / jury their rooms. */
  venues?: { id: string; name: string }[]
  /** Rooms each evaluator already covers, keyed by login ID. */
  venuesByLogin?: Record<string, string[]>
}) {
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
  const [addRole, setAddRole] = useState<AddableRole>("member")
  const [addPassword, setAddPassword] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")
  // Evaluators get a name and their judging venues at creation; everyone else
  // is a team or mentor number and neither field applies.
  const [addName, setAddName] = useState("")
  const [addVenues, setAddVenues] = useState<string[]>([])
  const [editTarget, setEditTarget] = useState<AppUserRow | null>(null)

  // Numeric login IDs (the student teams) sort by value, not lexically, so
  // 2 comes before 10. Non-numeric IDs (admin accounts) sort alphabetically
  // and sit ahead of the numbered rows.
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const na = Number(a.login_id)
      const nb = Number(b.login_id)
      const aNum = a.login_id.trim() !== "" && Number.isFinite(na)
      const bNum = b.login_id.trim() !== "" && Number.isFinite(nb)
      if (aNum && bNum) return na - nb
      if (aNum) return 1
      if (bNum) return -1
      return a.login_id.localeCompare(b.login_id)
    })
  }, [users])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedUsers
    return sortedUsers.filter(
      (u) =>
        u.login_id.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q),
    )
  }, [sortedUsers, query])

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

  const toggleHidden = async (loginId: string, hidden: boolean) => {
    setPending(loginId)
    try {
      const res = await fetch("/api/admin/set-user-hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, hidden }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback((f) => ({ ...f, [loginId]: data.error ?? "Could not update visibility." }))
        return
      }
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
        body: JSON.stringify({
          loginId: addLoginId.trim(),
          role: addRole,
          password: addPassword || undefined,
          name: addName.trim() || undefined,
          venueIds: isEvaluatorRole(addRole) ? addVenues : undefined,
        }),
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
      setAddName("")
      setAddVenues([])
      if (data.warning) setFeedback((f) => ({ ...f, [addLoginId.trim()]: data.warning }))
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
        <>
          {/* Wide screens: a column per field, as before — sized with
              percentages on a fixed layout so the whole table fits its
              container instead of scrolling sideways. */}
          <div className="border border-border rounded-lg overflow-hidden hidden md:block">
            <Table className="table-fixed text-sm">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={(checked) => toggleAllFiltered(checked === true)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[11%]">
                    Login ID
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[14%]">
                    Name
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[10%]">
                    Phone
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[13%]">
                    Email
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[12%]">
                    Role
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[10%]">
                    Status
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">
                    Reset Password
                  </TableHead>
                  <TableHead className="text-primary tracking-[0.1em] uppercase text-xs w-[124px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow
                    key={u.login_id}
                    className={`border-border ${u.hidden ? "opacity-45" : ""}`}
                  >
                    <TableCell>
                      {u.role !== "admin" && (
                        <Checkbox
                          checked={selected.has(u.login_id)}
                          onCheckedChange={(checked) => toggleOne(u.login_id, checked === true)}
                          aria-label={`Select ${u.login_id}`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-foreground font-mono truncate" title={u.login_id}>
                      {u.login_id}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate" title={u.name ?? ""}>
                      {u.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs truncate">
                      {u.phone ?? "—"}
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground font-mono text-xs truncate"
                      title={u.email ?? ""}
                    >
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate" title={roomsOf(u, venues, venuesByLogin)}>
                      {ROLE_LABEL[u.role] ?? u.role}
                      {isEvaluatorRole(u.role) && (
                        <span className="text-xs"> &middot; {roomsOf(u, venues, venuesByLogin)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.must_change_password ? "Awaiting sign-in" : "Active"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder={`Default: ${DEFAULT_PASSWORD}`}
                          value={customPasswords[u.login_id] ?? ""}
                          onChange={(e) =>
                            setCustomPasswords((c) => ({ ...c, [u.login_id]: e.target.value }))
                          }
                          className="bg-card border-border text-foreground h-8 text-xs flex-1 min-w-0"
                        />
                        <Button
                          size="sm"
                          disabled={pending === u.login_id}
                          onClick={() =>
                            resetPassword(u.login_id, customPasswords[u.login_id] || undefined)
                          }
                          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-wider h-8 px-2.5 shrink-0"
                        >
                          Reset
                        </Button>
                      </div>
                      {feedback[u.login_id] && (
                        <p className="text-xs text-muted-foreground mt-1">{feedback[u.login_id]}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        u={u}
                        pending={pending === u.login_id}
                        onEdit={() => setEditTarget(u)}
                        onToggleHidden={() => toggleHidden(u.login_id, !u.hidden)}
                        onDelete={() => setDeleteTarget([u.login_id])}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Narrow screens: the same row as a stacked card, so a phone never
              has to scroll sideways to reach the actions. */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredUsers.map((u) => (
              <div
                key={u.login_id}
                className={`border border-border rounded-lg p-4 flex flex-col gap-3 ${
                  u.hidden ? "opacity-45" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {u.role !== "admin" && (
                    <Checkbox
                      checked={selected.has(u.login_id)}
                      onCheckedChange={(checked) => toggleOne(u.login_id, checked === true)}
                      aria-label={`Select ${u.login_id}`}
                      className="mt-1"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <AccountCell u={u} venues={venues} venuesByLogin={venuesByLogin} />
                  </div>
                  <RowActions
                    u={u}
                    pending={pending === u.login_id}
                    onEdit={() => setEditTarget(u)}
                    onToggleHidden={() => toggleHidden(u.login_id, !u.hidden)}
                    onDelete={() => setDeleteTarget([u.login_id])}
                  />
                </div>

                <div className="text-muted-foreground text-xs">
                  <span className="block font-mono break-all">{u.phone ?? "—"}</span>
                  <span className="block font-mono break-all">{u.email ?? "—"}</span>
                  <span className="block mt-1">
                    {u.must_change_password ? "Awaiting first sign-in" : "Active"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder={`Default: ${DEFAULT_PASSWORD}`}
                    value={customPasswords[u.login_id] ?? ""}
                    onChange={(e) =>
                      setCustomPasswords((c) => ({ ...c, [u.login_id]: e.target.value }))
                    }
                    className="bg-card border-border text-foreground h-8 text-sm flex-1 min-w-0"
                  />
                  <Button
                    size="sm"
                    disabled={pending === u.login_id}
                    onClick={() =>
                      resetPassword(u.login_id, customPasswords[u.login_id] || undefined)
                    }
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-wider h-8"
                  >
                    Reset
                  </Button>
                </div>
                {feedback[u.login_id] && (
                  <p className="text-xs text-muted-foreground">{feedback[u.login_id]}</p>
                )}
              </div>
            ))}
          </div>
        </>
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
              <Select value={addRole} onValueChange={(v) => setAddRole(v as AddableRole)}>
                <SelectTrigger className="bg-card border-border text-foreground w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (Student)</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="faculty">Faculty (Evaluator)</SelectItem>
                  <SelectItem value="jury">External Jury (Evaluator)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEvaluatorRole(addRole) && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="addName" className="text-primary tracking-[0.15em] uppercase text-xs">
                    Name
                  </Label>
                  <Input
                    id="addName"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Dr. Anita Rao"
                    className="bg-card border-border text-foreground h-10"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-primary tracking-[0.15em] uppercase text-xs">
                    Judging Venues
                  </Label>
                  <VenuePicker venues={venues} value={addVenues} onChange={setAddVenues} />
                  <p className="text-muted-foreground text-xs">
                    They mark the teams presenting in these rooms. Can be changed later from Edit
                    or on Judging Rounds.
                  </p>
                </div>
              </>
            )}

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

      <EditUserDialog
        user={editTarget}
        venues={venues}
        venueIds={editTarget ? venuesByLogin[editTarget.login_id] ?? [] : []}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null)
          router.refresh()
        }}
      />
    </div>
  )
}

/** The rooms an evaluator covers, as a short line. */
function roomsOf(
  u: AppUserRow,
  venues: { id: string; name: string }[],
  venuesByLogin: Record<string, string[]>,
) {
  const names = (venuesByLogin[u.login_id] ?? []).map(
    (id) => venues.find((v) => v.id === id)?.name ?? "?",
  )
  return names.length === 0 ? "no venue" : names.join(", ")
}

/** Login ID, name, role — and, for an evaluator, the rooms they cover. */
function AccountCell({
  u,
  venues,
  venuesByLogin,
}: {
  u: AppUserRow
  venues: { id: string; name: string }[]
  venuesByLogin: Record<string, string[]>
}) {
  return (
    <div className="min-w-0">
      <span className="block text-foreground font-mono break-all">{u.login_id}</span>
      <span className="block text-muted-foreground text-xs break-words">{u.name ?? "—"}</span>
      <span className="block text-muted-foreground text-xs">
        {ROLE_LABEL[u.role] ?? u.role}
        {isEvaluatorRole(u.role) && <> &middot; {roomsOf(u, venues, venuesByLogin)}</>}
      </span>
    </div>
  )
}

/** Edit / hide / delete, grouped so they cost one narrow column. */
function RowActions({
  u,
  pending,
  onEdit,
  onToggleHidden,
  onDelete,
}: {
  u: AppUserRow
  pending: boolean
  onEdit: () => void
  onToggleHidden: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        size="sm"
        variant="outline"
        onClick={onEdit}
        className="border-border text-muted-foreground hover:text-primary hover:border-primary dark:bg-transparent h-8 w-8 p-0"
        aria-label={`Edit ${u.login_id}`}
        title="Edit this login"
      >
        <Pencil className="w-4 h-4" />
      </Button>
      {u.role !== "admin" && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onToggleHidden}
            className="border-border text-muted-foreground hover:text-primary hover:border-primary dark:bg-transparent h-8 w-8 p-0"
            aria-label={u.hidden ? `Show ${u.login_id}` : `Hide ${u.login_id}`}
            title={u.hidden ? "Hidden from lists — click to show" : "Visible — click to hide"}
          >
            {u.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground dark:hover:bg-destructive dark:hover:text-destructive-foreground dark:bg-transparent dark:border-destructive h-8 w-8 p-0"
            aria-label={`Delete ${u.login_id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  )
}

/** Tick the rooms an evaluator covers. */
function VenuePicker({
  venues,
  value,
  onChange,
}: {
  venues: { id: string; name: string }[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  if (venues.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No judging venues yet — add them on Submissions first.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {venues.map((v) => {
        const on = value.includes(v.id)
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(on ? value.filter((id) => id !== v.id) : [...value, v.id])}
            className={
              on
                ? "rounded-full border border-primary bg-primary/10 text-primary px-3 py-1 text-xs"
                : "rounded-full border border-border text-muted-foreground hover:text-foreground px-3 py-1 text-xs"
            }
          >
            {v.name}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Edit one login's details. Name, phone and email apply to any account; the
 * role swap and the venue picker are for evaluators, since changing a member
 * into a mentor would strand their team and submission rows.
 */
function EditUserDialog({
  user,
  venues,
  venueIds,
  onClose,
  onSaved,
}: {
  user: AppUserRow | null
  venues: { id: string; name: string }[]
  venueIds: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [loginId, setLoginId] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>("member")
  const [rooms, setRooms] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  // Reload the form whenever a different row is opened.
  const key = user?.login_id ?? ""
  useEffect(() => {
    if (!user) return
    setLoginId(user.login_id)
    setName(user.name ?? "")
    setPhone(user.phone ?? "")
    setEmail(user.email ?? "")
    setRole(user.role)
    setRooms(venueIds)
    setError("")
    // venueIds is derived from the same row, so the login ID is the real key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const evaluator = user ? isEvaluatorRole(user.role) : false

  async function save() {
    if (!user) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.login_id,
          newLoginId: loginId,
          name,
          phone,
          email,
          role: evaluator ? role : undefined,
          venueIds: evaluator ? rooms : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Could not save.")
        return
      }
      onSaved()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-foreground">
            Edit {user?.login_id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editLoginId" className="text-primary tracking-[0.15em] uppercase text-xs">
              Login ID
            </Label>
            <Input
              id="editLoginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="bg-card border-border text-foreground h-10 font-mono"
            />
            {user && loginId.trim() !== user.login_id && (
              <p className="text-muted-foreground text-xs">
                They will sign in with{" "}
                <span className="text-foreground font-mono">{loginId.trim() || "—"}</span> from now
                on. Their team, marks and assignments all follow the account, not the ID.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="editName" className="text-primary tracking-[0.15em] uppercase text-xs">
              Name
            </Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="—"
              className="bg-card border-border text-foreground h-10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="editPhone" className="text-primary tracking-[0.15em] uppercase text-xs">
              Phone
            </Label>
            <Input
              id="editPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="—"
              className="bg-card border-border text-foreground h-10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="editEmail" className="text-primary tracking-[0.15em] uppercase text-xs">
              Email
            </Label>
            <Input
              id="editEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="—"
              className="bg-card border-border text-foreground h-10"
            />
          </div>

          {evaluator && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-primary tracking-[0.15em] uppercase text-xs">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-card border-border text-foreground w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faculty">Faculty (Evaluator)</SelectItem>
                    <SelectItem value="jury">External Jury (Evaluator)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-primary tracking-[0.15em] uppercase text-xs">
                  Judging Venues
                </Label>
                <VenuePicker venues={venues} value={rooms} onChange={setRooms} />
              </div>
            </>
          )}

          {!evaluator && user?.role !== "admin" && (
            <p className="text-muted-foreground text-xs">
              A member or mentor keeps its role — switching it would strand their team, mentor and
              submission records. Delete and re-create the login instead.
            </p>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
            className="border-border text-foreground uppercase tracking-wider text-sm bg-transparent"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !loginId.trim()}
            onClick={save}
            className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm"
          >
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

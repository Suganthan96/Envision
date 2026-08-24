export interface PendingPerson {
  loginId: string
  name: string | null
  phone: string | null
  email: string | null
}

export function PendingSelections({
  people,
  personLabel,
}: {
  people: PendingPerson[]
  personLabel: string
}) {
  if (people.length === 0) return null

  return (
    <div className="mb-12">
      <h2 className="font-serif text-xl text-foreground mb-1">
        Not Yet Selected <span className="text-muted-foreground text-sm">({people.length})</span>
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        {personLabel} accounts that have not chosen a domain yet.
      </p>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const displayName = person.name?.trim() || person.loginId
          return (
            <span
              key={person.loginId}
              className="text-sm text-muted-foreground border border-border px-3 py-1.5"
              title={person.loginId}
            >
              {displayName}
              {person.phone?.trim() && <span className="text-muted-foreground/70"> · {person.phone}</span>}
              {person.email?.trim() && <span className="text-muted-foreground/70"> · {person.email}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

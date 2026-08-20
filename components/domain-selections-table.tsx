import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DOMAINS } from "@/lib/domains"

export interface SelectionRow {
  loginId: string
  domainIds: string[]
}

function domainTitle(domainId: string) {
  return DOMAINS.find((d) => d.id === domainId)?.title ?? domainId
}

export function DomainSelectionsTable({ rows, emptyLabel }: { rows: SelectionRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return (
      <div className="border border-border p-8 text-center">
        <p className="text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Login ID</TableHead>
            <TableHead className="text-primary tracking-[0.1em] uppercase text-xs">Domain(s) Selected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.loginId} className="border-border align-top">
              <TableCell className="text-foreground font-mono">{row.loginId}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col gap-1">
                  {row.domainIds.map((domainId) => (
                    <span key={domainId}>{domainTitle(domainId)}</span>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

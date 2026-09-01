import Link from "next/link"

export function BackLink({ label, fallbackHref }: { label: string; fallbackHref: string }) {
  return (
    <Link
      href={fallbackHref}
      className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
    >
      ← {label}
    </Link>
  )
}

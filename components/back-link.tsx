"use client"

import { useRouter } from "next/navigation"

export function BackLink({ label, fallbackHref }: { label: string; fallbackHref: string }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
      className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
    >
      ← {label}
    </button>
  )
}

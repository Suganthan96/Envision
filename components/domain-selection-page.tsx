"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { DomainSelectCard } from "@/components/domain-select-card"
import { DomainIcon } from "@/components/domain-icon"
import { DOMAINS } from "@/lib/domains"

const POLL_INTERVAL_MS = 8000

interface DomainSelectionPageProps {
  role: "mentor" | "student"
  eyebrow: string
  heading: string
  description: string
  capacity?: number
  maxSelections?: number
  canSelect?: boolean
}

export function DomainSelectionPage({
  eyebrow,
  heading,
  description,
  capacity,
  maxSelections = 1,
  canSelect = true,
}: DomainSelectionPageProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [stateLoaded, setStateLoaded] = useState(false)
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const activeDomain = DOMAINS.find((d) => d.id === activeDomainId) ?? null

  const fetchState = async () => {
    try {
      const res = await fetch("/api/domains/state")
      if (!res.ok) return
      const data = await res.json()
      setCounts(data.counts ?? {})
      setSelected(Array.isArray(data.mine) ? data.mine : [])
    } catch {
      // network hiccup — the next poll will retry
    } finally {
      setStateLoaded(true)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectDomain = async (domainId: string) => {
    setSubmitting(true)
    setSubmitError("")

    try {
      const res = await fetch("/api/domains/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error ?? "Unable to save your selection.")
        await fetchState()
        return
      }

      setSelected((prev) => (prev.includes(domainId) ? prev : [...prev, domainId]))
      setActiveDomainId(null)
      await fetchState()
    } catch {
      setSubmitError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const isMine = (domainId: string) => selected.includes(domainId)

  const isFull = (domainId: string) => {
    if (capacity === undefined) return false
    if (isMine(domainId)) return false
    return (counts[domainId] ?? 0) >= capacity
  }

  const atMax = stateLoaded && selected.length >= maxSelections

  const isLockedOut = (domainId: string) => atMax && !isMine(domainId)

  return (
    <div>
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-primary tracking-[0.3em] uppercase text-sm mb-6">{eyebrow}</p>
            <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-6 text-balance">{heading}</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{description}</p>
          </div>

          <ArtDecoDivider variant="stepped" />

          <p className="text-center text-primary tracking-[0.2em] uppercase text-xs mb-2">
            {atMax
              ? maxSelections > 1
                ? "Your Domains Are Locked In"
                : "Your Domain Is Locked In"
              : !canSelect
                ? "Preview Only"
                : maxSelections > 1
                  ? `Select Your Domains (${selected.length}/${maxSelections})`
                  : "Select Your Domain"}
          </p>
          {atMax ? (
            <p className="text-center text-muted-foreground text-sm mb-8">
              {maxSelections > 1 ? "Once chosen, your domains cannot be changed." : "Once chosen, your domain cannot be changed."}
            </p>
          ) : !canSelect ? (
            <p className="text-center text-muted-foreground text-sm mb-8">
              You can browse the domains below, but selection isn&apos;t open yet.
            </p>
          ) : (
            <div className="mb-8" />
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            {DOMAINS.map((domain) => (
              <DomainSelectCard
                key={domain.id}
                title={domain.title}
                icon={<DomainIcon icon={domain.icon} className="w-10 h-10" />}
                selected={isMine(domain.id)}
                onOpen={() => setActiveDomainId(domain.id)}
                capacity={capacity !== undefined && stateLoaded ? capacity : undefined}
                count={counts[domain.id] ?? 0}
                disabled={isFull(domain.id) || isLockedOut(domain.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <Dialog
        open={activeDomain !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDomainId(null)
            setSubmitError("")
          }
        }}
      >
        <DialogContent className="bg-card border-border">
          {activeDomain && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-foreground text-balance">
                  {activeDomain.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-1.5">
                {activeDomain.sdgs.map((sdg) => (
                  <span
                    key={sdg}
                    className="text-[10px] tracking-wider uppercase text-primary border border-primary/40 px-1.5 py-0.5"
                  >
                    SDG {sdg}
                  </span>
                ))}
              </div>

              <DialogDescription className="text-muted-foreground leading-relaxed text-base">
                {activeDomain.description}
              </DialogDescription>

              {capacity !== undefined && (
                <p className={isFull(activeDomain.id) ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
                  {counts[activeDomain.id] ?? 0}/{capacity} selected
                  {isFull(activeDomain.id) ? " — this domain is full." : ""}
                </p>
              )}

              {submitError && <p className="text-destructive text-sm">{submitError}</p>}

              <DialogFooter>
                {isMine(activeDomain.id) ? (
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="border-primary text-primary uppercase tracking-wider text-sm bg-transparent opacity-70"
                  >
                    Currently Selected
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={!canSelect || submitting || isFull(activeDomain.id) || isLockedOut(activeDomain.id)}
                    onClick={() => selectDomain(activeDomain.id)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm disabled:opacity-40"
                  >
                    {!canSelect
                      ? "Selection Not Open Yet"
                      : isLockedOut(activeDomain.id)
                      ? "Selection Locked"
                      : isFull(activeDomain.id)
                        ? "Domain Full"
                        : submitting
                          ? "Saving..."
                          : "Select This Domain"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

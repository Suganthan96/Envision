"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { ArtDecoSunburst } from "@/components/art-deco-sunburst"
import { DomainSelectCard } from "@/components/domain-select-card"
import { DomainIcon } from "@/components/domain-icon"
import { DOMAINS } from "@/lib/domains"

interface DomainSelectionPageProps {
  role: "mentor" | "student"
  eyebrow: string
  heading: string
  description: string
  multiSelect?: boolean
  defaultName?: string
}

export function DomainSelectionPage({
  role,
  eyebrow,
  heading,
  description,
  multiSelect = true,
  defaultName = "",
}: DomainSelectionPageProps) {
  const [name, setName] = useState(defaultName)
  const [selected, setSelected] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null)

  const activeDomain = DOMAINS.find((d) => d.id === activeDomainId) ?? null

  const toggleDomain = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((d) => d !== id)
      return multiSelect ? [...prev, id] : [id]
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || selected.length === 0) return
    // TODO: wire up to real submission once auth/DB is in place — for now this only updates local state
    setSubmitted(true)
  }

  if (submitted) {
    const chosenTitles = selected.map((id) => DOMAINS.find((d) => d.id === id)?.title).filter(Boolean)

    return (
      <div className="flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-md">
          <p className="font-serif text-3xl text-primary mb-4">Thank You, {name}</p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Your domain{chosenTitles.length > 1 ? "s have" : " has"} been recorded: {chosenTitles.join(", ")}.
          </p>
          <Button
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-wider text-sm bg-transparent"
          >
            Edit Selection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <section className="relative py-24 px-6 overflow-hidden">
        <ArtDecoSunburst className="opacity-50" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-primary tracking-[0.3em] uppercase text-sm mb-6">{eyebrow}</p>
            <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-6 text-balance">{heading}</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{description}</p>
          </div>

          <ArtDecoDivider variant="stepped" />

          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="max-w-md mx-auto">
              <label className="block text-primary tracking-[0.2em] uppercase text-xs mb-3" htmlFor="name">
                Your Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              />
            </div>

            <div>
              <p className="text-center text-primary tracking-[0.2em] uppercase text-xs mb-8">
                Select Your Domain{multiSelect ? "s" : ""}
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {DOMAINS.map((domain) => (
                  <DomainSelectCard
                    key={domain.id}
                    title={domain.title}
                    icon={<DomainIcon icon={domain.icon} className="w-10 h-10" />}
                    selected={selected.includes(domain.id)}
                    onOpen={() => setActiveDomainId(domain.id)}
                  />
                ))}
              </div>
            </div>

            <div className="text-center">
              <Button
                type="submit"
                disabled={!name || selected.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wider uppercase text-sm px-12 h-12 transition-all duration-300 disabled:opacity-40"
              >
                Confirm Selection
              </Button>
            </div>
          </form>
        </div>
      </section>

      <Dialog open={activeDomain !== null} onOpenChange={(open) => !open && setActiveDomainId(null)}>
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

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    toggleDomain(activeDomain.id)
                    setActiveDomainId(null)
                  }}
                  variant={selected.includes(activeDomain.id) ? "outline" : "default"}
                  className={
                    selected.includes(activeDomain.id)
                      ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-wider text-sm bg-transparent"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm"
                  }
                >
                  {selected.includes(activeDomain.id) ? "Remove Selection" : "Select This Domain"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

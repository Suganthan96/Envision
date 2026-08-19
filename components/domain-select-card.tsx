"use client"

import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface DomainSelectCardProps {
  title: string
  icon: ReactNode
  selected: boolean
  onOpen: () => void
  capacity?: number
  count?: number
  disabled?: boolean
}

export function DomainSelectCard({
  title,
  icon,
  selected,
  onOpen,
  capacity,
  count = 0,
  disabled = false,
}: DomainSelectCardProps) {
  const full = capacity !== undefined && count >= capacity

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group relative p-8 w-full text-left bg-card border transition-all duration-500",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary",
        disabled && "opacity-40 cursor-not-allowed hover:border-border",
      )}
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center bg-primary">
          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
        <h3 className="font-serif text-xl text-foreground text-balance mb-3">{title}</h3>

        {capacity !== undefined && (
          <span
            className={cn(
              "text-[10px] tracking-wider uppercase border px-2 py-0.5",
              full ? "text-destructive border-destructive/50" : "text-primary border-primary/40",
            )}
          >
            {full ? "Not Available" : "Available"} · {count}/{capacity}
          </span>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary transition-all duration-500",
          selected ? "w-3/4" : "w-0 group-hover:w-3/4",
        )}
      />
    </button>
  )
}

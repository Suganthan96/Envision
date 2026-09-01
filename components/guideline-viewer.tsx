"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GuidelineSlide } from "@/lib/project-guideline"

export function GuidelineViewer({ slides, fileName }: { slides: GuidelineSlide[]; fileName: string | null }) {
  const [index, setIndex] = useState(0)

  if (slides.length === 0) {
    return (
      <p className="text-muted-foreground text-lg">
        The project guideline hasn&apos;t been published yet. Check back soon.
      </p>
    )
  }

  const slide = slides[index]
  const atStart = index === 0
  const atEnd = index === slides.length - 1

  return (
    <div className="flex flex-col gap-6">
      {fileName && (
        <a
          href="/api/guidelines/download"
          className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs uppercase tracking-wider self-start border border-primary/40 px-3 py-2 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download {fileName}
        </a>
      )}

      <div className="relative border border-border bg-card/40 min-h-[420px] flex flex-col">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />

        <div className="flex-1 flex flex-col p-8 sm:p-12 overflow-y-auto">
          {slide.kind === "image" && slide.imageUrl ? (
            <div className="flex flex-col gap-6 flex-1">
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground text-balance">{slide.title}</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="max-w-full max-h-[50vh] object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground text-balance">{slide.title}</h2>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                {slide.body}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={atStart}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-10 bg-transparent disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>

        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-primary/50"
              }`}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={atEnd}
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-10 bg-transparent disabled:opacity-30"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      <p className="text-muted-foreground text-xs text-center uppercase tracking-wider">
        Slide {index + 1} of {slides.length}
      </p>
    </div>
  )
}

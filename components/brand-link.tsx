import Link from "next/link"

/**
 * The "Envision" wordmark that heads every signed-in page. It links back to
 * the landing page, which is what people expect a masthead to do — before
 * this it was inert markup repeated across ~23 files.
 */
export function BrandLink() {
  return (
    <Link href="/" className="flex items-center gap-4 group" aria-label="Envision home">
      <div className="w-8 h-px bg-primary" />
      <span className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
        Envision
      </span>
    </Link>
  )
}

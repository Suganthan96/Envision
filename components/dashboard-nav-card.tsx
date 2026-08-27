import Link from "next/link"
import type { ReactNode } from "react"

export function DashboardNavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group relative p-12 bg-card/35 backdrop-blur-sm border border-border hover:border-primary transition-all duration-500 flex flex-col items-center text-center"
    >
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />

      <div className="w-20 h-20 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform duration-500 [&_svg]:w-11 [&_svg]:h-11">
        {icon}
      </div>
      <h3 className="font-serif text-2xl text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground text-base leading-relaxed">{description}</p>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary transition-all duration-500 w-0 group-hover:w-3/4" />
    </Link>
  )
}

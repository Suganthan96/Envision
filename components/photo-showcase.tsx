import Image from "next/image"
import type { ShowcasePhoto } from "@/lib/showcase-photos"

export function PhotoShowcase({ photos }: { photos: ShowcasePhoto[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative">
          <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary z-10" />
          <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-primary z-10" />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-primary z-10" />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary z-10" />

          <div className="relative aspect-[4/3] overflow-hidden bg-card border border-border">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          </div>

          <p className="text-muted-foreground text-sm text-center mt-4 tracking-wide">{photo.caption}</p>
        </div>
      ))}
    </div>
  )
}

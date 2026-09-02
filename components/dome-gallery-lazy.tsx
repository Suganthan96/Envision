"use client"

import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type DomeGallery from "@/components/dome-gallery"

/**
 * The dome gallery is ~950 lines plus `@use-gesture/react`, and it lives in a
 * snap-scroll section below the fold — nothing is visible until the visitor
 * scrolls to it. Loading it lazily and client-only keeps it out of the
 * landing page's initial bundle, mirroring what web-threads-lazy.tsx does for
 * the WebGL backdrop.
 */
const LazyDomeGallery = dynamic(() => import("@/components/dome-gallery"), {
  ssr: false,
  loading: () => <div className="w-full h-full" aria-hidden="true" />,
})

export function DomeGalleryLazy(props: ComponentProps<typeof DomeGallery>) {
  return <LazyDomeGallery {...props} />
}

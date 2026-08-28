"use client"

import dynamic from "next/dynamic"
import type { WebThreadsProps } from "@/components/web-threads"

// The animated backdrop is purely decorative and pulls in `ogl` (a WebGL
// library) — a meaningful chunk of JS that used to sit in the initial
// bundle of every page because the root layout imported it statically.
// Loading it lazily and client-only keeps it off the critical path: the
// page renders and becomes interactive first, then the backdrop fades in.
const WebThreads = dynamic(() => import("@/components/web-threads").then((m) => m.WebThreads), {
  ssr: false,
  loading: () => null,
})

export function WebThreadsLazy(props: WebThreadsProps) {
  return <WebThreads {...props} />
}

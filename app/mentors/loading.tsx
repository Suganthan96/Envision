import { CardGridSkeleton } from "@/components/skeletons"

export default function MentorsLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="h-[60px] w-full max-w-md mx-auto rounded-full bg-muted/40 animate-pulse mt-4" />
      <div className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-16">
          <div className="h-4 w-32 rounded bg-muted/50 animate-pulse" />
          <div className="h-14 w-80 max-w-full rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded bg-muted/40 animate-pulse" />
        </div>
        <CardGridSkeleton />
      </div>
    </main>
  )
}

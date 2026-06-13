import { Skeleton } from "@/components/ui/primitives";

export default function StudioLoading() {
  return (
    <div className="min-h-screen bg-paper">
      {/* top nav placeholder */}
      <div className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Skeleton className="h-7 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-9 w-56" />
        <Skeleton className="mt-4 h-5 w-72" />

        {/* writing stats card */}
        <Skeleton className="mt-8 h-44 w-full rounded-2xl" />

        {/* project grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-soft">
              <Skeleton className="h-32 w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

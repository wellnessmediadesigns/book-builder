import { Skeleton } from "@/components/ui/primitives";

export default function BookLoading() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="ml-auto h-8 w-48 rounded-xl" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <Skeleton className="mt-3 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-4/5" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

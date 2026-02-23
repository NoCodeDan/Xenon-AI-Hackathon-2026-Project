import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page heading */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Library Health Banner -- full width */}
        <div className="col-span-full rounded-xl border bg-card p-6">
          <div className="flex items-center gap-8">
            <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="rounded-xl border bg-card py-6">
          <div className="space-y-2 px-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <div className="mt-6 px-6">
            <Skeleton className="h-52 w-full" />
          </div>
        </div>

        {/* Topic Heatmap -- spans 2 columns */}
        <div className="rounded-xl border bg-card py-6 md:col-span-2">
          <div className="space-y-2 px-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 px-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="rounded-xl border bg-card py-6">
          <div className="space-y-2 px-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="mt-6 space-y-3 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Requests Leaderboard */}
        <div className="rounded-xl border bg-card py-6">
          <div className="space-y-2 px-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="mt-6 space-y-3 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Freshness Trend -- spans 2 columns */}
        <div className="rounded-xl border bg-card py-6 md:col-span-2">
          <div className="space-y-2 px-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-60" />
          </div>
          <div className="mt-6 px-6">
            <Skeleton className="h-52 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

import LeaderboardSkeleton from "@/components/skeletons/LeaderboardSkeleton";

export default function Loading() {
  return (
    <div className="bg-background min-h-screen pb-xl">
      {/* Header Skeleton */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md mb-md">
        <div className="py-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest animate-pulse"></div>
            <div className="h-8 bg-surface-container-highest rounded w-40 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
        {/* Card Header Skeleton */}
        <div className="p-lg bg-surface-container-high border-b border-outline-variant animate-pulse">
          <div className="h-6 bg-surface-container-highest rounded w-48 mb-2"></div>
          <div className="h-4 bg-surface-container-highest rounded w-64 mt-xs"></div>
        </div>

        {/* List Skeleton */}
        <div className="flex flex-col">
          {[...Array(5)].map((_, i) => (
            <LeaderboardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

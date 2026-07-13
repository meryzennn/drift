export default function LeaderboardSkeleton() {
  return (
    <div className="flex items-center justify-between p-md border-b border-outline-variant/50 animate-pulse">
      <div className="flex items-center gap-md w-full">
        {/* Rank Number Skeleton */}
        <div className="w-8 h-6 bg-surface-container-highest rounded shrink-0"></div>
        
        {/* Avatar Skeleton */}
        <div className="w-12 h-12 rounded-full bg-surface-container-highest shrink-0 border border-outline-variant"></div>
        
        {/* User Info Skeleton */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="h-4 bg-surface-container-highest rounded w-32"></div>
          <div className="h-3 bg-surface-container-highest rounded w-24"></div>
        </div>
      </div>
      
      {/* Amount Skeleton */}
      <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
        <div className="h-8 w-24 bg-surface-container-highest rounded-lg"></div>
        <div className="h-3 w-16 bg-surface-container-highest rounded"></div>
      </div>
    </div>
  );
}

export default function MessagesSkeleton() {
  return (
    <div className="w-full min-w-full flex items-center gap-4 p-4 bg-surface-container-low border border-outline-variant/50 rounded-2xl animate-pulse">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-surface-container-highest shrink-0 border border-outline-variant"></div>
      
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1.5">
          {/* Display Name */}
          <div className="h-4 bg-surface-container-highest rounded w-32 mt-1"></div>
          {/* Date */}
          <div className="h-3 bg-surface-container-highest rounded w-12 mt-1"></div>
        </div>
        {/* Username */}
        <div className="h-3 bg-surface-container-highest rounded w-24 mt-0.5"></div>
      </div>
    </div>
  );
}

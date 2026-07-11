export default function PostSkeleton() {
  return (
    <article className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-md mb-md animate-pulse">
      <div className="flex items-start gap-md">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-surface-container-highest shrink-0"></div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-sm mt-1">
          {/* Header (Name & Username) */}
          <div className="flex items-center gap-2">
            <div className="h-4 bg-surface-container-highest rounded w-24"></div>
            <div className="h-3 bg-surface-container-highest rounded w-20"></div>
            <div className="h-3 bg-surface-container-highest rounded w-16 ml-auto"></div>
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="h-4 bg-surface-container-highest rounded w-full"></div>
            <div className="h-4 bg-surface-container-highest rounded w-5/6"></div>
            <div className="h-4 bg-surface-container-highest rounded w-4/6"></div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-6 mt-4">
            <div className="h-6 w-16 bg-surface-container-highest rounded-full"></div>
            <div className="h-6 w-16 bg-surface-container-highest rounded-full"></div>
            <div className="h-6 w-16 bg-surface-container-highest rounded-full"></div>
          </div>
        </div>
      </div>
    </article>
  );
}

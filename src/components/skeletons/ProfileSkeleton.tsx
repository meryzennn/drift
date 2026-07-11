export default function ProfileSkeleton() {
  return (
    <div className="flex flex-col border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden animate-pulse">
      {/* Header Banner */}
      <div className="h-48 md:h-64 w-full bg-surface-container-highest relative border-b border-outline-variant">
        {/* Avatar */}
        <div className="absolute -bottom-16 left-4 md:left-6 rounded-full border-4 border-background bg-surface-container-highest w-32 h-32 overflow-hidden shadow-none"></div>
      </div>
      
      {/* Profile Info Section */}
      <div className="pt-20 px-4 md:px-6 pb-6 border-b border-outline-variant">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            <div className="h-8 bg-surface-container-highest rounded w-48"></div>
            <div className="h-4 bg-surface-container-highest rounded w-32"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-surface-container-highest rounded-lg"></div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <div className="h-4 bg-surface-container-highest rounded w-full max-w-[42rem]"></div>
          <div className="h-4 bg-surface-container-highest rounded w-3/4 max-w-[30rem]"></div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 md:gap-6 mt-6 items-center">
          <div className="h-5 bg-surface-container-highest rounded w-20"></div>
          <div className="h-5 bg-surface-container-highest rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}

export default function NFTGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md mt-lg animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square bg-surface-container-highest rounded-2xl border border-outline-variant/50 relative overflow-hidden">
          {/* Mock shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent shimmer-effect"></div>
        </div>
      ))}
    </div>
  );
}

import PostSkeleton from "@/components/skeletons/PostSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(5)].map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

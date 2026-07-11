import { Post } from "@/types";
import PostCard from "./PostCard";

interface FeedProps {
  posts: Post[];
}

export default function Feed({ posts }: FeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-2xl text-on-surface-variant">
        No posts yet. Be the first to share!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

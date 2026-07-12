import { supabase } from "@/utils/supabase";
import PostCard from "@/components/PostCard";
import CreateComment from "@/components/CreateComment";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { Post } from "@/types";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";

export const revalidate = 0;

export default async function PostDetailPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ highlight?: string }> }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const highlightId = resolvedSearchParams?.highlight;

  // Fetch Post
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(POST_SELECT_QUERY)
    .eq("id", id)
    .single();

  if (postError || !postData) {
    notFound();
  }

  const post: Post = mapPostData(postData);

  // Fetch Replies
  const { data: repliesData } = await supabase
    .from("posts")
    .select(POST_SELECT_QUERY)
    .eq("reply_to_post_id", id)
    .order("created_at", { ascending: false });

  let replies: Post[] = (repliesData || []).map(mapPostData);

  // If there's a highlighted reply, move it to the top
  if (highlightId) {
    const highlightIndex = replies.findIndex(r => r.id === highlightId);
    if (highlightIndex > 0) {
      const highlightedReply = replies.splice(highlightIndex, 1)[0];
      replies.unshift(highlightedReply);
    }
  }

  post.commentsCount = replies.length;

  return (
    <div className="flex flex-col">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant p-md flex items-center gap-md">
        <BackButton />
        <h1 className="font-headline-sm font-bold text-on-surface">Post</h1>
      </div>

      {/* Main Post */}
      <div className="pt-md pb-xs">
        <PostCard post={post} isDetail={true} />
      </div>

      {/* Create Comment Form */}
      <CreateComment postId={post.id} postAuthor={post.authorPublicKey} />

      {/* Replies List */}
      <div className="flex flex-col gap-md pb-md">
        {replies.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant font-body-md">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map(reply => (
            <PostCard 
              key={reply.id} 
              post={reply} 
              hideReplyIndicator={true} 
              isHighlighted={reply.id === highlightId} 
            />
          ))
        )}
      </div>
    </div>
  );
}

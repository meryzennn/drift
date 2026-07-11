import { supabase } from "@/utils/supabase";
import PostCard from "@/components/PostCard";
import CreateComment from "@/components/CreateComment";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { Post } from "@/types";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";

export const revalidate = 0;

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const replies: Post[] = (repliesData || []).map(mapPostData);

  post.commentsCount = replies.length;

  return (
    <div className="flex flex-col">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant p-md flex items-center gap-md">
        <BackButton />
        <h1 className="font-headline-sm font-bold text-on-surface">Post</h1>
      </div>

      {/* Main Post */}
      <div className="pt-md border-b border-outline-variant pb-md">
        <PostCard post={post} isDetail={true} />
      </div>

      {/* Create Comment Form */}
      <CreateComment postId={post.id} postAuthor={post.authorPublicKey} />

      {/* Replies List */}
      <div className="flex flex-col">
        {replies.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant font-body-md">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map(reply => (
            <PostCard key={reply.id} post={reply} hideReplyIndicator={true} />
          ))
        )}
      </div>
    </div>
  );
}

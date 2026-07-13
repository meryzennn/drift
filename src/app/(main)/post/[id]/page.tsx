import { supabase } from "@/utils/supabase";
import PostCard from "@/components/PostCard";
import ClientReplies from "@/components/ClientReplies";
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

      {/* Main Post and Replies — managed client-side via realtime, no router.refresh() */}
      <ClientReplies
        mainPost={post}
        initialReplies={replies}
        highlightId={highlightId}
      />
    </div>
  );
}

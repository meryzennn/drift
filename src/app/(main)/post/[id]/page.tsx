import { supabase } from "@/utils/supabase";
import PostCard from "@/components/PostCard";
import CommentCard from "@/components/CommentCard";
import CreateComment from "@/components/CreateComment";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { Post, Comment } from "@/types";

export const revalidate = 0;

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch Post
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(`
      id,
      author_wallet,
      content,
      media_url,
      likes,
      created_at,
      users (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("id", id)
    .single();

  if (postError || !postData) {
    notFound();
  }

  const post: Post = {
    id: postData.id,
    authorPublicKey: postData.author_wallet,
    content: postData.content,
    imageUrl: postData.media_url,
    likes: postData.likes,
    createdAt: postData.created_at,
    authorProfile: postData.users ? {
      username: (postData.users as any).username,
      displayName: (postData.users as any).display_name,
      avatarUrl: (postData.users as any).avatar_url,
    } : undefined
  };

  // Fetch Comments
  const { data: commentsData } = await supabase
    .from("comments")
    .select(`
      id,
      post_id,
      author_wallet,
      content,
      media_url,
      created_at,
      users (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("post_id", id)
    .order("created_at", { ascending: false });

  const comments: Comment[] = (commentsData || []).map((c: any) => ({
    id: c.id,
    postId: c.post_id,
    authorPublicKey: c.author_wallet,
    content: c.content,
    imageUrl: c.media_url,
    createdAt: c.created_at,
    authorProfile: c.users ? {
      username: c.users.username,
      displayName: c.users.display_name,
      avatarUrl: c.users.avatar_url,
    } : undefined
  }));

  post.commentsCount = comments.length;

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
      <CreateComment postId={post.id} />

      {/* Comments List */}
      <div className="flex flex-col">
        {comments.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant font-body-md">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}

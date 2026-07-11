import Navbar from "@/components/Navbar";
import CreatePost from "@/components/CreatePost";
import Feed from "@/components/Feed";
import { Post } from "@/types";
import { supabase } from "@/utils/supabase";

export const revalidate = 0; // Disable caching for the feed

export default async function Home() {
  const { data: postsData } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      media_url,
      created_at,
      likes,
      author_wallet,
      users (
        username,
        display_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  const posts: Post[] = (postsData || []).map((p: any) => ({
    id: p.id,
    authorPublicKey: p.author_wallet,
    content: p.content,
    imageUrl: p.media_url,
    createdAt: p.created_at,
    likes: p.likes,
    authorProfile: p.users ? {
      username: p.users.username,
      displayName: p.users.display_name,
      avatarUrl: p.users.avatar_url,
    } : undefined,
  }));

  return (
    <>
      <CreatePost />
      <Feed posts={posts} />
    </>
  );
}

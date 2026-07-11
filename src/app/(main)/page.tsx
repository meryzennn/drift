import Navbar from "@/components/Navbar";
import CreatePost from "@/components/CreatePost";
import Feed from "@/components/Feed";
import { Post } from "@/types";
import { supabase } from "@/utils/supabase";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";

export const revalidate = 0; // Disable caching for the feed

export default async function Home() {
  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select(POST_SELECT_QUERY)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("SUPABASE ERROR:", postsError);
  }

  const posts: Post[] = (postsData || []).map(mapPostData);

  return (
    <>
      <CreatePost />
      <Feed posts={posts} />
    </>
  );
}

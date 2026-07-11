import { Post } from "@/types";
import Feed from "@/components/Feed";
import { supabase } from "@/utils/supabase";

export const revalidate = 0;

export default async function ExplorePage() {
  // Fetch posts ordered by likes to represent "Trending"
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
      ),
      comments ( count )
    `)
    .order("likes", { ascending: false })
    .limit(20);

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
    commentsCount: p.comments?.[0]?.count ?? 0,
  }));

  return (
    <>
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md mb-md">
        <div className="py-md flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Explore</h2>
          <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer transition-colors">settings</span>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-sm pb-sm">
          <div className="bg-primary text-background px-md py-xs rounded-lg font-label-md cursor-pointer">Trending</div>
          <div className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest px-md py-xs rounded-lg font-label-md cursor-pointer transition-colors">DeFi</div>
          <div className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest px-md py-xs rounded-lg font-label-md cursor-pointer transition-colors">NFTs</div>
          <div className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest px-md py-xs rounded-lg font-label-md cursor-pointer transition-colors">Infrastructure</div>
        </div>
      </div>

      <Feed posts={posts} />
    </>
  );
}

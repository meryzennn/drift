"use client";

import { Post } from "@/types";
import PostCard from "./PostCard";
import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import PostSkeleton from "./skeletons/PostSkeleton";
import { useRouter, usePathname } from "next/navigation";
import { Virtuoso } from "react-virtuoso";
import { useRef } from "react";
import { resolveFbEmbed } from "@/lib/fbEmbedResolver";
import { parseEmbeds } from "@/utils/embedParser";
import { rankPersonalizedPosts, HOME_WEIGHTS, calculatePostScore } from "@/utils/feedAlgorithm";

interface FeedItem {
  type: "post" | "activity";
  activityType?: "tip" | "repost";
  post: Post;
  sortKey: string;
  actor?: { username?: string; avatar_url?: string; wallet: string };
  amount?: number;
}

interface FeedProps {
  posts: Post[];
}

const getCache = () => {
  if (typeof window === 'undefined') return { index: {} as Record<string, number>, virtuosoState: {} as Record<string, any> };
  if (!(window as any)._feedCache) {
    (window as any)._feedCache = { index: {}, virtuosoState: {} };
  }
  return (window as any)._feedCache;
};

// Extract Facebook URL from post content using the parser
function extractFbUrls(post: Post): string[] {
  if (!post.content) return [];
  const parsed = parseEmbeds(post.content);
  return parsed.embeds
    .filter(e => e.type === 'facebook')
    .map(e => e.originalUrl);
}

export default function Feed({ posts }: FeedProps) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const pathname = usePathname(); // We need pathname to key the cache
  const virtuosoRef = useRef<any>(null);

  // We don't need manual scroll restoration, react-virtuoso handles it with initialTopMostItemIndex
  // The index is saved continuously in rangeChanged

  const [internalPosts, setInternalPosts] = useState<Post[]>(posts);
  const [hasMore, setHasMore] = useState(posts.length >= 10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);

  const [feedItems, setFeedItems] = useState<FeedItem[]>(
    internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt }))
  );
  const [loadingTipActivity, setLoadingTipActivity] = useState(false);

  // Sync prop changes (e.g., from router.refresh)
  useEffect(() => {
    setInternalPosts(posts);
    setHasMore(posts.length >= 10);
    setNewPostsCount(0);
  }, [posts]);

  // Optimistic update: inject new post from sessionStorage
  useEffect(() => {
    const newPostJson = sessionStorage.getItem('newPost');
    if (newPostJson) {
      try {
        const newPost = JSON.parse(newPostJson);
        setInternalPosts(prev => {
          // Check if post already exists to avoid duplicates
          if (prev.some(p => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
        sessionStorage.removeItem('newPost');
      } catch (e) {
        console.error('Failed to parse new post:', e);
        sessionStorage.removeItem('newPost');
      }
    }
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setFeedItems(internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
      return;
    }
    fetchFollowerActivity();
  }, [publicKey, internalPosts]);

  // Prefetch Facebook embed aspect ratios in the background as soon as posts
  // land, so by the time Virtuoso mounts+measures the item, the real height
  // is already known — avoids the scrollHeight jump mid-scroll.
  useEffect(() => {
    const fbUrls = internalPosts.flatMap(extractFbUrls);

    fbUrls.forEach(url => {
      resolveFbEmbed(url); // fire-and-forget, just warms the cache
    });
  }, [internalPosts]);

  const fetchFollowerActivity = async () => {
    if (!publicKey) return;
    setLoadingTipActivity(true);

    try {
      const { data: followData } = await supabase
        .from("follows")
        .select("following_wallet")
        .eq("follower_wallet", publicKey.toString());

      const followedWallets = (followData || []).map((f: any) => f.following_wallet);

      // Rank posts with personalized boost for following
      const rankedPosts = rankPersonalizedPosts(
        internalPosts,
        followedWallets,
        1.5,
        HOME_WEIGHTS,
        publicKey?.toString()
      );

      if (followedWallets.length === 0) {
        setFeedItems(rankedPosts.map(p => ({
          type: "post",
          post: p,
          sortKey: p.algorithmScore?.toString() || p.createdAt
        })));
        return;
      }

      const { data: notifs } = await supabase
        .from("notifications")
        .select(`
          actor_wallet,
          post_id,
          type,
          amount,
          created_at,
          actor:users!notifications_actor_wallet_fkey(username, avatar_url)
        `)
        .in("type", ["tip", "repost"])
        .in("actor_wallet", followedWallets)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!notifs || notifs.length === 0) {
        setFeedItems(internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
        return;
      }

      const postIds = [...new Set(notifs.map((t: any) => t.post_id).filter(Boolean))];
      const { data: activePostsData } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .in("id", postIds);

      const activePostsMap = new Map<string, Post>();
      (activePostsData || []).forEach((p: any) => {
        activePostsMap.set(p.id, mapPostData(p));
      });

      const seenPostIds = new Set<string>();
      const activityItems: FeedItem[] = [];

      for (const notif of notifs) {
        if (!notif.post_id || seenPostIds.has(notif.post_id)) continue;
        const post = activePostsMap.get(notif.post_id);
        if (!post) continue;

        let activityPost = { ...post };
        if (notif.type === "repost") {
          activityPost.isRepost = true;
          activityPost.repostedBy = (notif.actor as any)?.username || notif.actor_wallet;
          activityPost.reposterWallet = notif.actor_wallet;
        }

        seenPostIds.add(notif.post_id);
        activityItems.push({
          type: "activity",
          activityType: notif.type as "tip" | "repost",
          post: activityPost,
          sortKey: notif.created_at,
          actor: {
            username: (notif.actor as any)?.username,
            avatar_url: (notif.actor as any)?.avatar_url,
            wallet: notif.actor_wallet,
          },
          amount: notif.amount,
        });
      }

      // Deduplicate: exclude posts already shown as activity items
      const merged: FeedItem[] = [
        ...rankedPosts
          .filter(p => !seenPostIds.has(p.id))
          .map(p => ({
            type: "post" as const,
            post: p,
            sortKey: p.algorithmScore?.toString() || p.createdAt
          })),
        ...activityItems,
      ];

      // Sort: everything by comparable score
      merged.sort((a, b) => {
        // For activity items, convert timestamp to score scale (recent activities rank high)
        const aScore = a.type === "post" && a.post.algorithmScore
          ? a.post.algorithmScore
          : calculatePostScore(a.post, HOME_WEIGHTS, new Date());
        const bScore = b.type === "post" && b.post.algorithmScore
          ? b.post.algorithmScore
          : calculatePostScore(b.post, HOME_WEIGHTS, new Date());

        return bScore - aScore;
      });
      setFeedItems(merged);
    } catch (err) {
      console.error("Tip activity error:", err);
      const rankedPosts = rankPersonalizedPosts(
        internalPosts,
        [],
        1,
        HOME_WEIGHTS,
        publicKey?.toString()
      );
      setFeedItems(rankedPosts.map(p => ({
        type: "post",
        post: p,
        sortKey: p.algorithmScore?.toString() || p.createdAt
      })));
    } finally {
      setLoadingTipActivity(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || internalPosts.length === 0) return;
    setIsLoadingMore(true);

    try {
      const oldestDate = internalPosts[internalPosts.length - 1].createdAt;

      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .is("reply_to_post_id", null)
        .lt("created_at", oldestDate)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const olderPosts = data.map(mapPostData);
        setInternalPosts(prev => {
          const uniquePosts = [...prev];
          for (const post of olderPosts) {
            if (!uniquePosts.find(p => p.id === post.id)) uniquePosts.push(post);
          }
          return uniquePosts;
        });
        if (data.length < 10) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Error loading more posts:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, internalPosts]);

  // Poll for new posts
  useEffect(() => {
    if (internalPosts.length === 0) return;
    const newestDate = internalPosts[0].createdAt;

    const pollTimer = setInterval(async () => {
      try {
        const { count } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .is("reply_to_post_id", null)
          .gt("created_at", newestDate);

        if (count && count > 0) {
          setNewPostsCount(count);
        }
      } catch (e) {
        // ignore
      }
    }, 30000);

    return () => clearInterval(pollTimer);
  }, [internalPosts]);

  if (feedItems.length === 0 && !loadingTipActivity) {
    return (
      <div className="text-center py-2xl text-on-surface-variant">
        No posts yet. Be the first to share!
      </div>
    );
  }

  const itemContent = useCallback((index: number, item: FeedItem) => {
    if (!item) return null;

    return (
      <div className="pb-md">
        {item.type === "activity" && item.activityType === "tip" ? (
          <PostCard
            post={item.post}
            tipActivity={{
              tipperUsername: item.actor?.username,
              tipperWallet: item.actor?.wallet || "",
              tipperAvatar: item.actor?.avatar_url,
              amount: item.amount || 0,
            }}
          />
        ) : (
          <PostCard post={item.post} />
        )}
      </div>
    );
  }, []);

  const Footer = useCallback(() => {
    if (isLoadingMore) return (
      <div className="flex justify-center items-center py-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
    if (!hasMore && feedItems.length > 0) {
      return (
        <div className="text-center py-xl border-t border-outline-variant mt-md">
          <p className="font-label-md font-bold text-on-surface">You&apos;re all caught up!</p>
          <p className="font-body-sm text-on-surface-variant mt-1">No more posts to show.</p>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "auto" });
              router.refresh();
            }}
            className="mt-4 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full font-label-sm transition-colors flex items-center gap-2 mx-auto"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Feed
          </button>
        </div>
      );
    }
    return null;
  }, [isLoadingMore, hasMore, feedItems.length, router]);

  return (
    <div className="relative">
      {/* New Posts Indicator – outside the list so it stays sticky */}
      {newPostsCount > 0 && (
        <div className="sticky top-[72px] z-30 flex justify-center mb-md pointer-events-none">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "auto" });
              router.refresh();
            }}
            className="pointer-events-auto bg-primary text-on-primary font-bold font-label-md px-6 py-2.5 rounded-full shadow-xl shadow-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            {newPostsCount} New {newPostsCount === 1 ? "Post" : "Posts"}
          </button>
        </div>
      )}

      <Virtuoso
        ref={virtuosoRef}
        useWindowScroll
        data={feedItems}
        computeItemKey={(index, item) => `${item.type}-${item.post.id}-${item.sortKey}`}
        endReached={loadMorePosts}
        overscan={2000}
        itemContent={itemContent}
        components={{ Footer }}
        initialTopMostItemIndex={getCache().index[pathname] || 0}
        rangeChanged={(range) => {
          getCache().index[pathname] = range.startIndex;
        }}
      />
    </div>
  );
}
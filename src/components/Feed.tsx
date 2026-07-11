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

interface FeedItem {
  type: "post" | "tip_activity";
  post: Post;
  sortKey: string;
  tipper?: { username?: string; avatar_url?: string; wallet: string };
  tipAmount?: number;
}

interface FeedProps {
  posts: Post[];
}

const getCache = () => {
  if (typeof window === 'undefined') return { index: {} as Record<string, number> };
  if (!(window as any)._feedCache) {
    (window as any)._feedCache = { index: {} };
  }
  return (window as any)._feedCache;
};

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

  useEffect(() => {
    if (!publicKey) {
      setFeedItems(internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
      return;
    }
    fetchTipActivity();
  }, [publicKey, internalPosts]);

  const fetchTipActivity = async () => {
    if (!publicKey) return;
    setLoadingTipActivity(true);

    try {
      const { data: followData } = await supabase
        .from("follows")
        .select("following_wallet")
        .eq("follower_wallet", publicKey.toString());

      const followedWallets = (followData || []).map((f: any) => f.following_wallet);
      if (followedWallets.length === 0) {
        setFeedItems(internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
        return;
      }

      const { data: tipNotifs } = await supabase
        .from("notifications")
        .select(`
          actor_wallet,
          post_id,
          amount,
          created_at,
          actor:users!notifications_actor_wallet_fkey(username, avatar_url)
        `)
        .eq("type", "tip")
        .in("actor_wallet", followedWallets)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!tipNotifs || tipNotifs.length === 0) {
        setFeedItems(internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
        return;
      }

      const postIds = [...new Set(tipNotifs.map((t: any) => t.post_id).filter(Boolean))];
      const { data: tippedPostsData } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .in("id", postIds);

      const tippedPostsMap = new Map<string, Post>();
      (tippedPostsData || []).forEach((p: any) => {
        tippedPostsMap.set(p.id, mapPostData(p));
      });

      const seenPostIds = new Set<string>();
      const tipItems: FeedItem[] = [];

      for (const notif of tipNotifs) {
        if (!notif.post_id || seenPostIds.has(notif.post_id)) continue;
        const post = tippedPostsMap.get(notif.post_id);
        if (!post) continue;

        seenPostIds.add(notif.post_id);
        tipItems.push({
          type: "tip_activity",
          post,
          sortKey: notif.created_at,
          tipper: {
            username: (notif.actor as any)?.username,
            avatar_url: (notif.actor as any)?.avatar_url,
            wallet: notif.actor_wallet,
          },
          tipAmount: notif.amount,
        });
      }

      const merged: FeedItem[] = [
        ...internalPosts.map(p => ({ type: "post" as const, post: p, sortKey: p.createdAt })),
        ...tipItems,
      ];

      merged.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());
      setFeedItems(merged);
    } catch (err) {
      console.error("Tip activity error:", err);
      setFeedItems(internalPosts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
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
        {item.type === "tip_activity" ? (
          <PostCard
            post={item.post}
            tipActivity={{
              tipperUsername: item.tipper?.username,
              tipperWallet: item.tipper?.wallet || "",
              tipperAvatar: item.tipper?.avatar_url,
              amount: item.tipAmount || 0,
            }}
          />
        ) : (
          <PostCard post={item.post} />
        )}
      </div>
    );
  }, []);

  const Footer = useCallback(() => {
    if (isLoadingMore) return <PostSkeleton />;
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
        overscan={400}
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

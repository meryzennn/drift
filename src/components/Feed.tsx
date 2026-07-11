"use client";

import { Post } from "@/types";
import PostCard from "./PostCard";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import Link from "next/link";

interface FeedItem {
  type: "post" | "tip_activity";
  post: Post;
  sortKey: string;
  // tip activity metadata
  tipper?: { username?: string; avatar_url?: string; wallet: string };
  tipAmount?: number;
}

interface FeedProps {
  posts: Post[];
}

export default function Feed({ posts }: FeedProps) {
  const { publicKey } = useWallet();
  const [feedItems, setFeedItems] = useState<FeedItem[]>(
    posts.map(p => ({ type: "post", post: p, sortKey: p.createdAt }))
  );
  const [loadingTipActivity, setLoadingTipActivity] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      // No wallet: just show raw posts
      setFeedItems(posts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
      return;
    }
    fetchTipActivity();
  }, [publicKey, posts]);

  const fetchTipActivity = async () => {
    if (!publicKey) return;
    setLoadingTipActivity(true);

    try {
      // 1. Get list of people current user follows
      const { data: followData } = await supabase
        .from("follows")
        .select("following_wallet")
        .eq("follower_wallet", publicKey.toString());

      const followedWallets = (followData || []).map((f: any) => f.following_wallet);
      if (followedWallets.length === 0) {
        setFeedItems(posts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
        return;
      }

      // 2. Fetch tip notifications from followed users (recent 50)
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
        setFeedItems(posts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
        return;
      }

      // 3. Fetch those posts
      const postIds = [...new Set(tipNotifs.map((t: any) => t.post_id).filter(Boolean))];
      const { data: tippedPostsData } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .in("id", postIds);

      const tippedPostsMap = new Map<string, Post>();
      (tippedPostsData || []).forEach((p: any) => {
        tippedPostsMap.set(p.id, mapPostData(p));
      });

      // 4. Build tip activity feed items (deduplicate: one entry per post)
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

      // 5. Merge: posts + tip activities sorted by time
      // Like reposts, same post can appear with tip banner even if already in feed
      const merged: FeedItem[] = [
        ...posts.map(p => ({ type: "post" as const, post: p, sortKey: p.createdAt })),
        ...tipItems,
      ];

      merged.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());
      setFeedItems(merged);
    } catch (err) {
      console.error("Tip activity error:", err);
      setFeedItems(posts.map(p => ({ type: "post", post: p, sortKey: p.createdAt })));
    } finally {
      setLoadingTipActivity(false);
    }
  };

  if (feedItems.length === 0 && !loadingTipActivity) {
    return (
      <div className="text-center py-2xl text-on-surface-variant">
        No posts yet. Be the first to share!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {feedItems.map((item, index) => {
        if (item.type === "tip_activity") {
          return (
            <div key={`tip-${item.post.id}-${index}`}>
              {/* Tip Activity Banner */}
              <div className="flex items-center gap-xs px-lg pt-xs pb-0 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                <Link
                  href={`/profile/${item.tipper?.username || item.tipper?.wallet}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-label-sm hover:underline text-on-surface-variant hover:text-primary transition-colors"
                >
                  @{item.tipper?.username || `${item.tipper?.wallet?.slice(0, 6)}...`}
                </Link>
                <span className="font-label-sm text-on-surface-variant">
                  tipped <span className="text-primary font-bold">{item.tipAmount} SOL</span>
                </span>
              </div>
              <PostCard post={item.post} />
            </div>
          );
        }
        return (
          <PostCard key={`post-${item.post.id}-${item.post.isRepost ? "repost" : "post"}-${index}`} post={item.post} />
        );
      })}
    </div>
  );
}

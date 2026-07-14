"use client";

import { Post } from "@/types";
import PostCard from "@/components/PostCard";
import SearchBar from "@/components/SearchBar";
import { useEffect, useState, useCallback, Suspense } from "react";
import { supabase } from "@/utils/supabase";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Virtuoso } from "react-virtuoso";
import { rankPosts, EXPLORE_WEIGHTS } from "@/utils/feedAlgorithm";

interface UserResult {
  wallet_address: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

const getCache = () => {
  if (typeof window === 'undefined') return { index: {} as Record<string, number> };
  if (!(window as any)._feedCache) {
    (window as any)._feedCache = { index: {} };
  }
  return (window as any)._feedCache;
};

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const cacheKey = `${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const initialQuery = searchParams.get("q") || "";

  const [activeTab, setActiveTab] = useState("Trending");
  const [posts, setPosts] = useState<Post[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>(['Trending']);
  const [isLoadingHashtags, setIsLoadingHashtags] = useState(true);

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    setUserResults([]);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .is("reply_to_post_id", null)
        .gte("created_at", sevenDaysAgo.toISOString())
        .limit(200);

      const mappedPosts = (data || []).map(mapPostData);
      const rankedPosts = rankPosts(mappedPosts, EXPLORE_WEIGHTS);
      setPosts(rankedPosts.slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchByKeyword = useCallback(async (keyword: string) => {
    setIsLoading(true);
    try {
      const [{ data: postData }, { data: userData }] = await Promise.all([
        supabase
          .from("posts")
          .select(POST_SELECT_QUERY)
          .ilike("content", `%${keyword}%`)
          .is("reply_to_post_id", null)
          .limit(50),
        supabase
          .from("users")
          .select("wallet_address, username, display_name, avatar_url")
          .or(`username.ilike.%${keyword}%,display_name.ilike.%${keyword}%,wallet_address.ilike.%${keyword}%`)
          .limit(6),
      ]);

      const mappedPosts = (postData || []).map(mapPostData);
      const rankedPosts = rankPosts(mappedPosts, EXPLORE_WEIGHTS);
      setPosts(rankedPosts.slice(0, 20));
      setUserResults(userData || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchByHashtag = useCallback(async (hashtag: string) => {
    setIsLoading(true);
    setUserResults([]);
    try {
      const normalized = hashtag.replace(/^#/, '').toLowerCase();

      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', normalized)
        .single();

      if (!hashtagData) {
        setPosts([]);
        return;
      }

      const { data: postHashtags } = await supabase
        .from('post_hashtags')
        .select('post_id')
        .eq('hashtag_id', hashtagData.id);

      if (!postHashtags || postHashtags.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = postHashtags.map(ph => ph.post_id);

      const { data: postData } = await supabase
        .from('posts')
        .select(POST_SELECT_QUERY)
        .in('id', postIds)
        .is('reply_to_post_id', null)
        .limit(50);

      const mappedPosts = (postData || []).map(mapPostData);
      const rankedPosts = rankPosts(mappedPosts, EXPLORE_WEIGHTS);
      setPosts(rankedPosts.slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const res = await fetch('/api/hashtags/trending?limit=8');
        const data = await res.json();
        setTrendingHashtags(['Trending', ...data.hashtags.map((h: any) => h.display_tag)]);
      } catch (error) {
        console.error('Error fetching trending hashtags:', error);
        setTrendingHashtags(['Trending']);
      } finally {
        setIsLoadingHashtags(false);
      }
    };
    fetchTrendingHashtags();
  }, []);

  // Listen for post deletions
  useEffect(() => {
    const handlePostDeleted = (e: any) => {
      const { postId } = e.detail;
      setPosts(prev => prev.filter(p => p.id !== postId));
    };

    window.addEventListener("post-deleted", handlePostDeleted);
    return () => window.removeEventListener("post-deleted", handlePostDeleted);
  }, []);

  useEffect(() => {
    if (query) {
      const matchesHashtag = trendingHashtags.some(
        tag => tag.replace(/^#/, '').toLowerCase() === query.toLowerCase()
      );

      if (matchesHashtag) {
        fetchByHashtag(query);
      } else {
        fetchByKeyword(query);
      }
    } else {
      fetchTrending();
    }
  }, [query, trendingHashtags, fetchByHashtag, fetchByKeyword, fetchTrending]);

  // Sync with URL param
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "Trending") {
      router.push("/explore");
    } else {
      const normalized = tab.replace(/^#/, '');
      router.push(`/explore?q=${encodeURIComponent(normalized)}`);
    }
  };

  const handleSearch = (q: string) => {
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/explore");
    }
  };

  const itemContent = useCallback((index: number, post: Post) => {
    return (
      <div className="pb-md">
        <PostCard post={post} />
      </div>
    );
  }, []);

  return (
    <>
      <div className="sticky top-[64px] z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md mb-md">
        <div className="py-md">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-md">Explore</h2>
          {/* Search bar */}
          <SearchBar
            initialQuery={query}
            onSearch={handleSearch}
            fullWidth
          />
        </div>
        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-sm pb-sm mt-sm">
          {isLoadingHashtags ? (
            <div className="flex gap-sm">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 w-20 bg-surface-container-high rounded-full animate-pulse" />
              ))}
            </div>
          ) : (
            trendingHashtags.map((tab) => {
              const isActive = (tab === "Trending" && !query) ||
                               query?.toLowerCase() === tab.replace(/^#/, '').toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`px-md py-xs rounded-full font-label-md cursor-pointer whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? "bg-primary text-background"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  {tab}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* User results */}
      {userResults.length > 0 && (
        <div className="mb-md bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <p className="px-md pt-md pb-xs font-label-sm text-outline uppercase tracking-wider">People</p>
          {userResults.map((u) => (
            <Link
              key={u.wallet_address}
              href={`/profile/${u.username || u.wallet_address}`}
              className="flex items-center gap-md px-md py-sm hover:bg-surface-container-high transition-colors border-t border-outline-variant/30 first:border-0"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden shrink-0 border border-outline-variant">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[20px] text-primary flex items-center justify-center h-full">person</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-label-md text-on-surface font-bold truncate">{u.display_name || u.username}</p>
                <p className="font-mono text-[12px] text-on-surface-variant truncate">
                  @{u.username || `${u.wallet_address.slice(0, 10)}...`}
                </p>
              </div>
              <span className="material-symbols-outlined text-outline ml-auto">chevron_right</span>
            </Link>
          ))}
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="flex justify-center py-2xl">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-2xl">
          <span className="material-symbols-outlined text-[48px] text-outline block mb-sm">search_off</span>
          <p className="text-on-surface-variant font-body-md">
            {query ? `No posts found for "${query}"` : "No posts yet"}
          </p>
        </div>
      ) : (
        <div className="relative">
          {query && (
            <p className="font-body-sm text-on-surface-variant px-xs mb-md">
              Posts matching <span className="text-on-surface font-bold">&ldquo;{query}&rdquo;</span>
            </p>
          )}
          <Virtuoso
            useWindowScroll
            data={posts}
            computeItemKey={(index, post) => post.id}
            overscan={400}
            itemContent={itemContent}
            initialTopMostItemIndex={getCache().index[cacheKey] || 0}
            rangeChanged={(range) => {
              getCache().index[cacheKey] = range.startIndex;
            }}
          />
        </div>
      )}
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}

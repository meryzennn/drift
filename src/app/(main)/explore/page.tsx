"use client";

import { Post } from "@/types";
import PostCard from "@/components/PostCard";
import SearchBar from "@/components/SearchBar";
import { useEffect, useState, useCallback, Suspense } from "react";
import { supabase } from "@/utils/supabase";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const TABS = ["Trending", "DeFi", "NFTs", "Infrastructure", "Airdrop", "dApp"];

interface UserResult {
  wallet_address: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [activeTab, setActiveTab] = useState("Trending");
  const [posts, setPosts] = useState<Post[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    setUserResults([]);
    try {
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .is("reply_to_post_id", null)
        .order("likes", { ascending: false })
        .limit(20);
      setPosts((data || []).map(mapPostData));
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
          .order("likes", { ascending: false })
          .limit(20),
        supabase
          .from("users")
          .select("wallet_address, username, display_name, avatar_url")
          .or(`username.ilike.%${keyword}%,display_name.ilike.%${keyword}%,wallet_address.ilike.%${keyword}%`)
          .limit(6),
      ]);
      setPosts((postData || []).map(mapPostData));
      setUserResults(userData || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      fetchByKeyword(query);
    } else {
      fetchTrending();
    }
  }, [query, fetchTrending, fetchByKeyword]);

  // Sync with URL param
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    const keyword = tab === "Trending" ? "" : tab;
    if (keyword) {
      router.push(`/explore?q=${encodeURIComponent(keyword)}`);
    } else {
      router.push("/explore");
    }
  };

  const handleSearch = (q: string) => {
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/explore");
    }
  };

  return (
    <>
      <div className="sticky top-16 md:top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md mb-md">
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
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-md py-xs rounded-full font-label-md cursor-pointer whitespace-nowrap transition-colors shrink-0 ${
                (tab === "Trending" && !query) || query?.toLowerCase() === tab.toLowerCase()
                  ? "bg-primary text-background"
                  : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              {tab}
            </button>
          ))}
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
        <div className="flex flex-col gap-md">
          {query && (
            <p className="font-body-sm text-on-surface-variant px-xs">
              Posts matching <span className="text-on-surface font-bold">&ldquo;{query}&rdquo;</span>
            </p>
          )}
          {posts.map((post, i) => (
            <PostCard key={`${post.id}-${i}`} post={post} />
          ))}
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

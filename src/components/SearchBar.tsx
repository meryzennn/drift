"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

interface UserResult {
  wallet_address: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface PostResult {
  id: string;
  content: string;
  author_wallet: string;
  users?: { username: string; display_name: string; avatar_url?: string };
}

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
  fullWidth?: boolean;
}

export default function SearchBar({ initialQuery = "", onSearch, autoFocus, fullWidth }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      setIsOpen(false);
      return;
    }
    const debounce = setTimeout(() => doSearch(query.trim()), 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const doSearch = async (q: string) => {
    setIsLoading(true);
    setIsOpen(true);
    try {
      const [{ data: userData }, { data: postData }] = await Promise.all([
        // Search users by username, display_name, or wallet
        supabase
          .from("users")
          .select("wallet_address, username, display_name, avatar_url")
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,wallet_address.ilike.%${q}%`)
          .limit(5),
        // Search posts by content keyword
        supabase
          .from("posts")
          .select("id, content, author_wallet, users!posts_author_wallet_fkey(username, display_name, avatar_url)")
          .ilike("content", `%${q}%`)
          .is("reply_to_post_id", null)
          .order("likes", { ascending: false })
          .limit(4),
      ]);

      setUsers(userData || []);
      setPosts((postData || []).map((p: any) => ({
        ...p,
        users: Array.isArray(p.users) ? p.users[0] : p.users,
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    if (onSearch) {
      onSearch(query.trim());
    } else {
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const hasResults = users.length > 0 || posts.length > 0;

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setIsOpen(true)}
            placeholder="Search users, posts, keywords…"
            autoFocus={autoFocus}
            className="w-full bg-surface-container-high text-on-surface rounded-full py-2 pl-10 pr-10 outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary transition-all font-body-sm placeholder:text-outline"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setIsOpen(false); if (onSearch) onSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </form>

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && !hasResults && (
            <div className="py-6 text-center text-on-surface-variant font-body-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!isLoading && users.length > 0 && (
            <div>
              <div className="px-md pt-md pb-xs font-label-sm text-outline uppercase tracking-wider">People</div>
              {users.map((u) => (
                <Link
                  key={u.wallet_address}
                  href={`/profile/${u.username || u.wallet_address}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-sm px-md py-sm hover:bg-surface-container-highest transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden shrink-0 border border-outline-variant">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px] text-primary flex items-center justify-center h-full">person</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md text-on-surface truncate">{u.display_name || u.username}</p>
                    <p className="font-mono text-[12px] text-on-surface-variant truncate">
                      @{u.username || `${u.wallet_address.slice(0, 8)}...`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && posts.length > 0 && (
            <div className={users.length > 0 ? "border-t border-outline-variant/50" : ""}>
              <div className="px-md pt-md pb-xs font-label-sm text-outline uppercase tracking-wider">Posts</div>
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/post/${p.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-sm px-md py-sm hover:bg-surface-container-highest transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-outline mt-0.5 shrink-0">article</span>
                  <div className="min-w-0">
                    <p className="font-body-sm text-on-surface line-clamp-2">{p.content}</p>
                    <p className="font-mono text-[11px] text-outline mt-xs">
                      by @{p.users?.username || p.author_wallet.slice(0, 8)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* View all results */}
          {!isLoading && hasResults && (
            <div className="border-t border-outline-variant/50">
              <button
                onClick={handleSubmit}
                className="w-full py-sm px-md text-primary font-label-sm hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">search</span>
                See all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

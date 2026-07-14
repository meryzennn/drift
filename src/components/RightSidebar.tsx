"use client";

import SearchBar from "./SearchBar";
import TrendingTokens from "./TrendingTokens";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";

export default function RightSidebar() {
  const { publicKey } = useWallet();
  const [trending, setTrending] = useState<Array<{tag: string; tweets: string; category: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [animatingFollows, setAnimatingFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/hashtags/trending?limit=5');
        const data = await res.json();
        setTrending(data.hashtags.map((h: any) => ({
          tag: h.display_tag,
          tweets: `${(h.usage_count / 1000).toFixed(1)}K`,
          category: h.category || 'Web3'
        })));
      } catch (error) {
        console.error('Error fetching trending:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!publicKey) return;

      try {
        const res = await fetch(`/api/users/suggestions?wallet=${publicKey.toString()}&limit=3`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);

        const { data: following } = await supabase
          .from('follows')
          .select('following_wallet')
          .eq('follower_wallet', publicKey.toString());

        setFollowingSet(new Set(following?.map(f => f.following_wallet) || []));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };
    fetchSuggestions();
  }, [publicKey]);

  const handleFollow = async (walletAddress: string) => {
    if (!publicKey) return;

    setAnimatingFollows(prev => new Set(prev).add(walletAddress));

    setTimeout(async () => {
      try {
        await supabase.from('follows').insert({
          follower_wallet: publicKey.toString(),
          following_wallet: walletAddress
        });

        setFollowingSet(prev => new Set(prev).add(walletAddress));

        await supabase.from('notifications').insert({
          user_wallet: walletAddress,
          actor_wallet: publicKey.toString(),
          type: 'follow'
        });
      } catch (error) {
        console.error('Error following user:', error);
      } finally {
        setAnimatingFollows(prev => {
          const next = new Set(prev);
          next.delete(walletAddress);
          return next;
        });
      }
    }, 300);
  };

  return (
    <aside className="hidden xl:flex flex-col gap-lg w-[320px] shrink-0 sticky top-[64px] pb-lg h-[calc(100vh-64px)] overflow-y-auto hide-scrollbar relative">
      
      {/* Search Bar - Sticky at top */}
      <div className="sticky top-0 pt-md pb-xs bg-background z-20">
        <SearchBar fullWidth />
      </div>

      {/* Trending Tokens Section */}
      <TrendingTokens />

      {/* Who to follow Section */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-md px-xs">Who to follow</h3>
        <div className="flex flex-col gap-sm">
          {suggestions.length > 0 ? suggestions.map((user) => (
            <div key={user.wallet_address} className="flex justify-between items-center hover:bg-surface-container-high p-sm rounded-lg transition-colors">
              <Link href={`/profile/${user.username || user.wallet_address}`} className="flex items-center gap-xs overflow-hidden flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden shrink-0 border border-outline-variant">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-primary flex items-center justify-center h-full">person</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="font-label-md text-on-surface font-bold truncate hover:underline">{user.display_name || user.username}</div>
                  <div className="font-mono text-[12px] text-on-surface-variant truncate">
                    {user.followed_by?.length > 0 ? `Followed by ${user.followed_by[0]}` : `@${user.username}`}
                  </div>
                </div>
              </Link>
              {!followingSet.has(user.wallet_address) && (
                <button
                  onClick={() => handleFollow(user.wallet_address)}
                  className={`bg-primary text-background font-label-sm font-bold px-sm py-1.5 rounded-full hover:bg-primary/90 transition-all shrink-0 ${
                    animatingFollows.has(user.wallet_address) ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
                  }`}
                >
                  Follow
                </button>
              )}
            </div>
          )) : (
            <div className="text-center py-md text-on-surface-variant font-body-sm">
              {publicKey ? 'No suggestions yet' : 'Connect wallet to see suggestions'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-md flex flex-wrap gap-x-3 gap-y-1 font-mono text-outline text-[12px] items-center">
        <Link className="hover:underline hover:text-primary transition-colors" href="/terms">Terms of Service</Link>
        <Link className="hover:underline hover:text-primary transition-colors" href="/privacy">Privacy Policy</Link>
        <Link className="hover:underline hover:text-primary transition-colors" href="/cookie">Cookie Policy</Link>
        <span>© 2026 Drift</span>
      </div>
    </aside>
  );
}

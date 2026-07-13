"use client";

import SearchBar from "./SearchBar";
import { useState, useEffect } from "react";
import Link from "next/link";

const ALL_TRENDING_TOPICS = [
  { tag: "#Solana", tweets: "124K", category: "Technology" },
  { tag: "$JUP", tweets: "89K", category: "DeFi" },
  { tag: "Breakpoint 2026", tweets: "45K", category: "Events" },
  { tag: "NFTs", tweets: "34K", category: "Art" },
  { tag: "#Drift", tweets: "21K", category: "Social" },
  { tag: "Crypto", tweets: "19K", category: "Finance" },
  { tag: "Blink", tweets: "15K", category: "Technology" },
  { tag: "$DRIFT", tweets: "12K", category: "Token" },
  { tag: "Airdrops", tweets: "9K", category: "Finance" },
  { tag: "Web3", tweets: "55K", category: "Technology" },
  { tag: "Metaverse", tweets: "8K", category: "Gaming" },
  { tag: "DePIN", tweets: "14K", category: "Infrastructure" },
];

export default function RightSidebar() {
  const [trending, setTrending] = useState<typeof ALL_TRENDING_TOPICS>([]);

  useEffect(() => {
    const shuffled = [...ALL_TRENDING_TOPICS].sort(() => 0.5 - Math.random());
    setTrending(shuffled.slice(0, 5));
  }, []);

  return (
    <aside className="hidden xl:flex flex-col gap-lg w-[320px] shrink-0 sticky top-[64px] pb-lg h-[calc(100vh-64px)] overflow-y-auto hide-scrollbar relative">
      
      {/* Search Bar - Sticky at top */}
      <div className="sticky top-0 pt-md pb-xs bg-background z-20">
        <SearchBar fullWidth />
      </div>

      {/* Trending Section */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-md px-xs">Trending in Web3</h3>
        <div className="flex flex-col gap-sm">
          {trending.length > 0 ? trending.map((item, i) => (
            <div key={i} className="hover:bg-surface-container-high p-sm rounded-lg cursor-pointer transition-colors">
              <div className="flex justify-between items-start">
                <div className="text-outline text-[12px] font-body-sm">{item.category} · Trending</div>
                <span className="material-symbols-outlined text-outline text-[16px] hover:text-primary">more_horiz</span>
              </div>
              <div className="font-label-lg font-bold text-on-surface my-0.5">{item.tag}</div>
              <div className="text-outline text-[12px] font-body-sm">{item.tweets} posts</div>
            </div>
          )) : (
            <div className="animate-pulse space-y-4 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-surface-container-highest rounded-lg"></div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Who to follow Section */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-md px-xs">Who to follow</h3>
        <div className="flex flex-col gap-sm">
          {[
            { name: "Solana Foundation", handle: "@solanaFndn", initials: "SF" },
            { name: "Drift Protocol", handle: "@driftprotocol", initials: "DP" },
            { name: "Anatoly Yakovenko", handle: "@aeyakovenko", initials: "AY" },
          ].map((user, i) => (
            <div key={i} className="flex justify-between items-center hover:bg-surface-container-high p-sm rounded-lg cursor-pointer transition-colors">
              <div className="flex items-center gap-xs overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-on-surface shrink-0">
                  {user.initials}
                </div>
                <div className="overflow-hidden">
                  <div className="font-label-md text-on-surface font-bold truncate">{user.name}</div>
                  <div className="font-mono text-[12px] text-on-surface-variant truncate">{user.handle}</div>
                </div>
              </div>
              <button className="bg-primary text-background font-label-sm font-bold px-sm py-1.5 rounded-full hover:bg-primary/90 transition-colors shrink-0">
                Follow
              </button>
            </div>
          ))}
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

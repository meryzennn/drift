"use client";

import { Post } from "@/types";
import Feed from "@/components/Feed";

const MOCK_EXPLORE_POSTS: Post[] = [
  {
    id: "e1",
    authorPublicKey: "zkLab3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q",
    content: "Zero-Knowledge proofs are revolutionizing how we handle privacy on public ledgers. Our latest rollup achieves 10k TPS with full EVM compatibility.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes: 892,
  },
  {
    id: "e2",
    authorPublicKey: "9XxB3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q",
    content: "NFTs are more than JPEGs. The new metadata standards allow for dynamic state changes on-chain.",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1000",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    likes: 412,
  }
];

export default function ExplorePage() {
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

      <Feed posts={MOCK_EXPLORE_POSTS} />
    </>
  );
}

"use client";

import Image from "next/image";
import { Post } from "@/types";
import PostCard from "@/components/PostCard";

const MOCK_PROFILE_POSTS: Post[] = [
  {
    id: "p1",
    authorPublicKey: "AxL9Gz3q3K3ZJm1Tz7oM7qF2p",
    content: "Just deployed the new smart contract for automated yield routing. Gas costs reduced by 40%. The technical breakdown is up on the blog. #Solana #DeFi",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    likes: 148,
  },
  {
    id: "p2",
    authorPublicKey: "AxL9Gz3q3K3ZJm1Tz7oM7qF2p",
    content: "Market conditions are perfect for testing the new liquidity pools. Stay safe out there.",
    imageUrl: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&q=80&w=1000",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    likes: 45,
  }
];

export default function ProfilePage() {
  return (
    <div className="flex flex-col border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
      {/* Header Banner */}
      <div className="h-48 md:h-64 w-full bg-surface-container-high relative border-b border-outline-variant">
        <div 
          className="w-full h-full bg-cover bg-center opacity-80" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')" }}
        ></div>
        {/* Avatar */}
        <div className="absolute -bottom-16 left-4 md:left-6 rounded-full border-4 border-background bg-surface-bright w-32 h-32 overflow-hidden shadow-none flex items-center justify-center text-4xl font-bold text-on-surface">
          AM
        </div>
      </div>
      
      {/* Profile Info Section */}
      <div className="pt-20 px-4 md:px-6 pb-6 border-b border-outline-variant">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg md:text-headline-lg text-on-background font-bold tracking-tight">Alex Mercer</h1>
            <p className="font-mono text-[14px] text-outline mt-1 flex items-center gap-1">
              @AxL9...F2p
              <span className="material-symbols-outlined text-[14px] text-surface-tint cursor-pointer">content_copy</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-lg font-label-md transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">toll</span>
              Tip
            </button>
            <button className="px-6 py-2 bg-primary-container hover:brightness-110 text-on-primary-container rounded-lg font-label-md transition-colors">
              Follow
            </button>
          </div>
        </div>
        <p className="font-body-md text-on-surface-variant mb-6 leading-relaxed max-w-2xl">
          Building the next generation of DeFi. Gas optimization is my passion.
        </p>
        
        {/* Stats */}
        <div className="flex gap-6 mb-2">
          <a className="flex gap-1 items-baseline hover:underline" href="#">
            <span className="font-label-md text-on-background font-bold">1,204</span>
            <span className="font-body-sm text-outline">Following</span>
          </a>
          <a className="flex gap-1 items-baseline hover:underline" href="#">
            <span className="font-label-md text-on-background font-bold">8,492</span>
            <span className="font-body-sm text-outline">Followers</span>
          </a>
          <div className="flex gap-1 items-baseline ml-auto">
            <span className="material-symbols-outlined text-[16px] text-surface-tint translate-y-0.5">payments</span>
            <span className="font-label-md text-surface-tint font-bold">14.2 SOL</span>
            <span className="font-body-sm text-outline">Total Tipped</span>
          </div>
        </div>
      </div>
      
      {/* Profile Tabs */}
      <div className="flex border-b border-outline-variant px-4 md:px-6 overflow-x-auto hide-scrollbar sticky top-16 md:top-0 bg-background z-30">
        <button className="px-4 py-4 font-label-md font-bold text-primary border-b-2 border-primary whitespace-nowrap">
          Posts
        </button>
        <button className="px-4 py-4 font-label-md text-outline hover:text-on-surface transition-colors whitespace-nowrap">
          Replies
        </button>
        <button className="px-4 py-4 font-label-md text-outline hover:text-on-surface transition-colors whitespace-nowrap">
          Media
        </button>
        <button className="px-4 py-4 font-label-md text-outline hover:text-on-surface transition-colors whitespace-nowrap">
          Tips Received
        </button>
        <button className="px-4 py-4 font-label-md text-outline hover:text-on-surface transition-colors whitespace-nowrap">
          Transactions
        </button>
      </div>

      {/* Feed Content */}
      <div className="p-md bg-background">
        <div className="flex flex-col gap-md">
          {MOCK_PROFILE_POSTS.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}

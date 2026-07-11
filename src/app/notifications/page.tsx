"use client";

import Image from "next/image";

export default function NotificationsPage() {
  return (
    <>
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md">
        <div className="py-md">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Notifications</h2>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar">
          <button className="flex-1 py-sm px-md text-center font-label-md text-label-md text-primary border-b-2 border-primary-container hover:bg-surface-container-low transition-colors">
            All
          </button>
          <button className="flex-1 py-sm px-md text-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors">
            Verified
          </button>
          <button className="flex-1 py-sm px-md text-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors">
            Mentions
          </button>
        </div>
      </div>

      <div className="flex flex-col border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
        {/* Web3 Tip Notification */}
        <article className="p-md border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer flex gap-md items-start last:border-b-0">
          <div className="mt-sm">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-sm mb-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-[12px]">V</div>
            </div>
            <p className="font-body-md text-body-md text-on-surface">
              <span className="font-bold">@VnDao...X1m</span> sent you a tip of <span className="text-primary-container font-mono font-bold bg-primary-container/10 px-1 rounded">0.05 SOL</span>
            </p>
            <p className="font-body-sm text-body-sm text-outline mt-xs">For your post: "Scaling decentralized consensus models..."</p>
          </div>
        </article>

        {/* Social Like Notification */}
        <article className="p-md border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer flex gap-md items-start last:border-b-0">
          <div className="mt-sm">
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-sm mb-sm">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center font-bold text-on-surface text-[12px]">E</div>
            </div>
            <p className="font-body-md text-body-md text-on-surface">
              <span className="font-bold">Elena Rust</span> liked your post
            </p>
            <p className="font-body-sm text-body-sm text-outline mt-xs line-clamp-2">"Just deployed the new smart contract to mainnet. The gas optimizations reduced costs by 42%. Technical breakdown thread below 🧵"</p>
          </div>
        </article>

        {/* System / Web3 Tx Notification */}
        <article className="p-md border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer flex gap-md items-start last:border-b-0">
          <div className="mt-sm">
            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-body-md text-body-md text-on-surface font-bold">Transaction Confirmed</p>
              <span className="font-label-sm text-label-sm text-outline">2m ago</span>
            </div>
            <p className="font-body-sm text-body-sm text-outline mt-xs">New transaction confirmed on Solana network.</p>
            <div className="mt-sm flex gap-sm">
              <button className="text-primary-container border border-primary-container/30 px-md py-xs rounded-full font-label-sm text-label-sm hover:bg-primary-container/10 transition-colors">View on Explorer</button>
            </div>
          </div>
        </article>

        {/* Social Repost Notification */}
        <article className="p-md border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer flex gap-md items-start last:border-b-0">
          <div className="mt-sm">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>repeat</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-sm mb-sm">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center font-bold text-on-surface text-[12px]">A</div>
            </div>
            <p className="font-body-md text-body-md text-on-surface">
              <span className="font-bold">Alex Mercer</span> reposted your post
            </p>
            <p className="font-body-sm text-body-sm text-outline mt-xs line-clamp-2">"The UX of Web3 needs to evolve beyond generic wallet prompts. We need contextual signing that feels invisible yet secure."</p>
          </div>
        </article>
      </div>
    </>
  );
}

"use client";

import { Post } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useWallet } from "@solana/wallet-adapter-react";
import { sendTip } from "@/utils/solanaUtils";
import { useState } from "react";
import SendTipModal from "./SendTipModal";
import { supabase } from "@/utils/supabase";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { publicKey, sendTransaction } = useWallet();
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);

  const handleTipClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey) {
      alert("Please connect your wallet first to send a tip.");
      return;
    }
    setIsTipModalOpen(true);
  };

  const confirmTip = async (amount: number) => {
    if (!publicKey) return;
    
    try {
      await sendTip(publicKey, post.authorPublicKey, amount, sendTransaction);
      
      // Save tip to Supabase
      const { error: dbError } = await supabase.from("tips").insert([
        {
          from_wallet: publicKey.toString(),
          to_wallet: post.authorPublicKey,
          amount: amount,
        }
      ]);
      
      if (dbError) {
        console.error("Tip saved on chain but failed to record in DB:", dbError);
      }

      alert(`Tip of ${amount} SOL sent successfully!`);
      setIsTipModalOpen(false);
    } catch (error) {
      console.error("Tip failed:", error);
      alert("Failed to send tip. See console for details.");
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <article className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-md hover:bg-surface-container-low transition-colors duration-200 cursor-pointer mb-md">
      <div className="flex items-start gap-md">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center font-bold text-primary">
          {post.authorPublicKey.slice(0, 2)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-sm flex-wrap">
            <span className="font-label-md text-on-surface">{post.authorProfile?.displayName || "Anonymous User"}</span>
            <span className="material-symbols-outlined text-[14px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="font-mono text-[14px] text-on-surface-variant">@{post.authorProfile?.username || formatAddress(post.authorPublicKey)}</span>
            <span className="text-on-surface-variant text-sm px-xs">•</span>
            <span className="font-body-sm text-on-surface-variant">
              {formatDistanceToNow(new Date(post.createdAt))}
            </span>
          </div>
          
          <div className="mt-xs font-body-md text-on-surface whitespace-pre-wrap">
            {post.content}
          </div>
          
          {post.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-outline-variant mt-md h-48 bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={post.imageUrl} 
                alt="Post content" 
                className="object-cover w-full h-full"
              />
            </div>
          )}
          
          <div className="mt-md flex justify-between items-center text-on-surface-variant max-w-[28rem]">
            <button className="flex items-center gap-xs hover:text-primary transition-colors group">
              <span className="material-symbols-outlined text-[20px] group-hover:bg-primary/10 rounded-full p-xs">chat_bubble</span>
              <span className="font-body-sm">0</span>
            </button>
            
            <button className="flex items-center gap-xs hover:text-secondary transition-colors group">
              <span className="material-symbols-outlined text-[20px] group-hover:bg-secondary/10 rounded-full p-xs">repeat</span>
              <span className="font-body-sm">0</span>
            </button>
            
            <button className="flex items-center gap-xs hover:text-error transition-colors group">
              <span className="material-symbols-outlined text-[20px] group-hover:bg-error/10 rounded-full p-xs">favorite</span>
              <span className="font-body-sm">{post.likes}</span>
            </button>
            
            <button 
              onClick={handleTipClick}
              className="flex items-center gap-xs text-primary-container border border-outline-variant rounded-full px-sm py-xs hover:bg-primary-container/10 transition-colors ml-auto"
            >
              <span className="material-symbols-outlined text-[16px]">toll</span>
              <span className="font-label-sm">Send Tip</span>
            </button>
          </div>
        </div>
      </div>

      <SendTipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        recipientAddress={post.authorPublicKey}
        onConfirm={confirmTip}
      />
    </article>
  );
}

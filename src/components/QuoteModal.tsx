"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import toast from "react-hot-toast";
import { Post } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { createPortal } from "react-dom";

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotedPost: Post;
}

export default function QuoteModal({ isOpen, onClose, quotedPost }: QuoteModalProps) {
  const { publicKey } = useWallet();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch current user's profile for the avatar
  useEffect(() => {
    if (publicKey && isOpen) {
      supabase
        .from("users")
        .select("*")
        .eq("wallet_address", publicKey.toString())
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUserProfile(data);
        });
    }
  }, [publicKey, isOpen]);

  if (!isOpen) return null;
  
  if (typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter some text");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create new post with quote_post_id
      const { error: postError } = await supabase.from("posts").insert([
        {
          author_wallet: publicKey.toString(),
          content: content.trim(),
          quote_post_id: quotedPost.id,
        },
      ]);

      if (postError) throw postError;


      toast.success("Quoted successfully!");
      setContent("");
      onClose();
    } catch (error: any) {
      console.error("Quote error:", error);
      toast.error(error.message || "Failed to quote post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-surface-container-high border border-outline-variant rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ width: '500px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-md border-b border-outline-variant">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="flex gap-2">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="bg-primary text-on-primary font-label-md px-4 py-1.5 rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        <div className="p-md flex gap-md">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 overflow-hidden border border-outline-variant">
            {userProfile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-outline">person</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-transparent text-on-surface font-body-lg resize-none min-h-[100px] outline-none placeholder:text-outline-variant"
              autoFocus
            />
            
            {/* Embedded Quote Preview */}
            <div className="border border-outline-variant rounded-xl p-md mt-sm bg-surface-container flex flex-col gap-sm pointer-events-none opacity-80">
              <div className="flex items-center gap-sm">
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {quotedPost.authorProfile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={quotedPost.authorProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    quotedPost.authorPublicKey.slice(0, 2)
                  )}
                </div>
                <span className="font-label-md text-on-surface">
                  {quotedPost.authorProfile?.displayName || "Anonymous User"}
                </span>
                <span className="font-mono text-[12px] text-on-surface-variant">
                  @{quotedPost.authorProfile?.username || `${quotedPost.authorPublicKey.slice(0,4)}...`}
                </span>
                <span className="text-on-surface-variant text-sm px-xs">•</span>
                <span className="font-body-sm text-on-surface-variant" suppressHydrationWarning>
                  {formatDistanceToNow(new Date(quotedPost.createdAt))}
                </span>
              </div>
              <div className="font-body-sm text-on-surface line-clamp-3">
                {quotedPost.content}
              </div>
              {quotedPost.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-outline-variant max-h-[300px] mt-xs flex items-center justify-center bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={quotedPost.imageUrl} alt="" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

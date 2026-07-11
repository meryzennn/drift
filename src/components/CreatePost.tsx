"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function CreatePost() {
  const { connected } = useWallet();
  const [content, setContent] = useState("");

  if (!connected) {
    return (
      <div className="p-6 bg-surface-container rounded-xl border border-outline-variant text-center mb-md">
        <p className="text-on-surface-variant font-body-md">Connect your wallet to share your thoughts.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    // TODO: Implement Supabase upload
    console.log("Posting:", content);
    setContent("");
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex gap-md mb-md">
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center text-primary font-bold">
        U
      </div>
      <div className="flex-1">
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant font-body-lg resize-none focus:ring-0 p-0 min-h-[80px] outline-none"
            placeholder="What's happening in Web3?"
          ></textarea>
          <div className="flex justify-between items-center mt-sm pt-sm border-t border-outline-variant">
            <div className="flex gap-sm text-primary">
              <button type="button" className="p-xs hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">image</span>
              </button>
              <button type="button" className="p-xs hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">gif_box</span>
              </button>
              <button type="button" className="p-xs hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">poll</span>
              </button>
            </div>
            <button
              type="submit"
              disabled={!content.trim()}
              className="bg-primary-container text-on-primary-container px-lg py-xs rounded-full font-label-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

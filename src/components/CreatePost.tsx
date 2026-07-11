"use client";

import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CreatePost() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!connected) {
    return (
      <div className="p-6 bg-surface-container rounded-xl border border-outline-variant text-center mb-md">
        <p className="text-on-surface-variant font-body-md">Connect your wallet to share your thoughts.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !file) || !publicKey) return;
    
    setLoading(true);
    let mediaUrl = null;

    try {
      // 1. Upload image if exists
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Failed to upload image");
        const data = await res.json();
        mediaUrl = data.url;
      }

      // 2. Insert into Supabase
      const { error } = await supabase.from("posts").insert([
        {
          author_wallet: publicKey.toString(),
          content,
          media_url: mediaUrl,
        }
      ]);

      if (error) throw error;

      // 3. Reset and Refresh
      setContent("");
      setFile(null);
      toast.success("Post created successfully!");
      router.refresh(); // Reload server components (Feed)
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. See console.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex gap-md mb-md">
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center text-primary font-bold">
        {publicKey?.toString().slice(0, 2)}
      </div>
      <div className="flex-1">
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant font-body-lg resize-none focus:ring-0 p-0 min-h-[80px] outline-none"
            placeholder="What's happening in Web3?"
          ></textarea>
          
          {file && (
            <div className="relative inline-block mt-sm mb-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-48 rounded-lg border border-outline-variant" />
              <button 
                type="button" 
                onClick={() => setFile(null)}
                className="absolute top-xs right-xs bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-sm pt-sm border-t border-outline-variant">
            <div className="flex gap-sm text-primary">
              <input 
                type="file" 
                accept="image/*,video/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-xs hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center"
              >
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
              disabled={(!content.trim() && !file) || loading}
              className="bg-primary-container text-on-primary-container px-lg py-xs rounded-full font-label-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

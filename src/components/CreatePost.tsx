"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import MediaPickerModal from "./MediaPickerModal";

export default function CreatePost({ onSuccess }: { onSuccess?: () => void }) {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!publicKey) return;
      const { data } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("wallet_address", publicKey.toString())
        .maybeSingle();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [publicKey]);

  if (!connected) {
    return (
      <div className="p-6 bg-surface-container rounded-xl border border-outline-variant text-center mb-md">
        <p className="text-on-surface-variant font-body-md">Connect your wallet to share your thoughts.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !file && !gifUrl) || !publicKey) return;
    
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
      } else if (gifUrl) {
        mediaUrl = gifUrl;
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
      setGifUrl(null);
      toast.success("Post created successfully!");
      router.refresh(); // Reload server components (Feed)
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. See console.");
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith("video/")) {
      if (selectedFile.type !== "video/mp4") {
        toast.error("Only MP4 videos are allowed.");
        return false;
      }
      if (selectedFile.size > 30 * 1024 * 1024) {
        toast.error("Video size must be less than 30MB.");
        return false;
      }
    } else if (selectedFile.type.startsWith("image/")) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB.");
        return false;
      }
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setGifUrl(null); // Clear GIF if file is picked
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMediaPickerFile = (pickedFile: File) => {
    if (validateFile(pickedFile)) {
      setFile(pickedFile);
      setGifUrl(null);
      setIsMediaPickerOpen(false);
    }
  };

  const handleMediaPickerGif = (url: string) => {
    setGifUrl(url);
    setFile(null);
    setIsMediaPickerOpen(false);
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex gap-md mb-md w-full">
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center text-primary font-bold">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          publicKey?.toString().slice(0, 2)
        )}
      </div>
      <div className="flex-1">
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 255))}
            maxLength={255}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant font-body-lg resize-none focus:ring-0 p-0 min-h-[80px] outline-none"
            placeholder="What's happening in Web3?"
          ></textarea>
          
          {(file || gifUrl) && (
            <div className="relative inline-block mt-sm mb-xs">
              {file && file.type === "video/mp4" ? (
                <video src={URL.createObjectURL(file)} controls className="max-h-48 rounded-lg border border-outline-variant bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file ? URL.createObjectURL(file) : gifUrl!} alt="Preview" className="max-h-48 rounded-lg border border-outline-variant" />
              )}
              <button 
                type="button" 
                onClick={() => { setFile(null); setGifUrl(null); }}
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
                accept="image/*,video/mp4" 
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
              <button 
                type="button" 
                onClick={() => setIsMediaPickerOpen(true)}
                className="p-xs hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">gif_box</span>
              </button>
              <button type="button" className="p-xs hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">poll</span>
              </button>
            </div>
            <div className="flex items-center gap-md">
              <span className={`font-body-sm ${content.length >= 240 ? 'text-error' : 'text-on-surface-variant'}`}>
                {content.length}/255
              </span>
              <button
                type="submit"
                disabled={(!content.trim() && !file && !gifUrl) || loading || content.length > 255}
                className="bg-primary-container text-on-primary-container px-lg py-xs rounded-full font-label-md hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isMediaPickerOpen && (
        <MediaPickerModal
          type="post"
          maxMB={10}
          onFile={handleMediaPickerFile}
          onGif={handleMediaPickerGif}
          onClose={() => setIsMediaPickerOpen(false)}
          defaultTab="gif"
          hideTabs={true}
        />
      )}
    </div>
  );
}

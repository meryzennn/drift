"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import MediaPickerModal from "./MediaPickerModal";
import { useMentionAutocomplete } from "@/hooks/useMentionAutocomplete";

export default function CreatePost({ onSuccess }: { onSuccess?: () => void }) {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (gifUrl) {
      setPreviewUrl(gifUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [file, gifUrl]);

  const { suggestions, showDropdown, handleSelect } = useMentionAutocomplete(
    content,
    cursorPos,
    setContent,
    currentUsername
  );

  useEffect(() => {
    const fetchUserData = async () => {
      if (!publicKey) return;
      const { data } = await supabase
        .from("users")
        .select("avatar_url, username")
        .eq("wallet_address", publicKey.toString())
        .maybeSingle();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setCurrentUsername(data.username);
      }
    };
    fetchUserData();
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
        let fileToUpload: File | Blob = file;
        
        // Compress if it's an image
        if (file.type.startsWith("image/")) {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            };
            fileToUpload = await imageCompression(file, options);
          } catch (error) {
            console.error("Image compression error:", error);
            // Fallback to original file if compression fails
          }
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);

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
      const { data, error } = await supabase.from("posts").insert([
        {
          author_wallet: publicKey.toString(),
          content,
          media_url: mediaUrl,
        }
      ]).select('id').single();

      if (error) throw error;

      // Handle mentions
      const mentions = Array.from(new Set(content.match(/@([a-zA-Z0-9_]+)/g)?.map(m => m.slice(1)) || []));
      if (mentions.length > 0) {
        const { data: users } = await supabase.from('users').select('wallet_address, username').in('username', mentions);
        if (users && users.length > 0) {
          const notifications = users.map(u => ({
            user_wallet: u.wallet_address,
            actor_wallet: publicKey.toString(),
            type: "mention",
            post_id: data.id
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith("image/") || item.type === "video/mp4") {
        const pastedFile = item.getAsFile();
        if (pastedFile) {
          if (pastedFile.type === "video/mp4" && pastedFile.size > 30 * 1024 * 1024) {
            toast.error("Video must be less than 30MB");
            return;
          }
          if (pastedFile.type.startsWith("image/") && pastedFile.size > 10 * 1024 * 1024) {
            toast.error("Image must be less than 10MB");
            return;
          }
          setFile(pastedFile);
          setGifUrl(null);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((content.trim() || file || gifUrl) && !loading && content.length <= 255) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const updateCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart);
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
      <div className="flex-1 relative">
        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value.slice(0, 255));
              updateCursor(e);
            }}
            onClick={updateCursor}
            onKeyUp={updateCursor}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            maxLength={255}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant font-body-lg resize-none focus:ring-0 p-0 min-h-[80px] outline-none"
            placeholder="What's happening in Web3?"
          ></textarea>
          
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 bg-surface-container border border-outline-variant rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto mt-1">
              {suggestions.map((user) => (
                <button
                  key={user.username}
                  type="button"
                  onClick={() => handleSelect(user.username, textareaRef)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 shrink-0">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                        {user.username.slice(0,2)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-label-md text-on-surface truncate">{user.display_name || user.username}</span>
                    <span className="font-body-sm text-on-surface-variant truncate">@{user.username}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {previewUrl && (
            <div className="relative inline-block mt-sm mb-xs max-w-full w-fit">
              {file && file.type === "video/mp4" ? (
                <video src={previewUrl} controls className="max-h-[300px] max-w-full object-contain rounded-lg border border-outline-variant bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="max-h-[300px] max-w-full object-contain rounded-lg border border-outline-variant" />
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
            <div className="flex flex-col items-end gap-1">
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
              <span className="text-[10px] text-on-surface-variant/70 hidden sm:block">Press Enter to post, Shift+Enter for new line</span>
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

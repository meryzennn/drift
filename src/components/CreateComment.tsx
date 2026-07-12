"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import MediaPickerModal from "./MediaPickerModal";
import { useMentionAutocomplete } from "@/hooks/useMentionAutocomplete";
import { uploadFileToR2, validateVideoFile } from "@/utils/upload";
import imageCompression from "browser-image-compression";

export default function CreateComment({ postId, postAuthor, onSuccess }: { postId: string, postAuthor?: string, onSuccess?: () => void }) {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { suggestions, showDropdown, handleSelect } = useMentionAutocomplete(
    content,
    cursorPos,
    setContent
  );

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
      <div className="p-4 bg-surface-container rounded-xl border border-outline-variant text-center mb-md">
        <p className="text-on-surface-variant font-body-sm">Connect your wallet to reply.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !file && !gifUrl) || !publicKey) return;
    
    setLoading(true);
    let mediaUrl = null;

    try {
      if (file) {
        let fileToUpload: File | Blob = file;
        
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
            throw new Error("Failed to compress image. Upload aborted.");
          }
        }
        mediaUrl = await uploadFileToR2(fileToUpload, file.name, fileToUpload.type || file.type);
      } else if (gifUrl) {
        mediaUrl = gifUrl;
      }

      const { data, error } = await supabase.from("posts").insert([
        {
          reply_to_post_id: postId,
          author_wallet: publicKey.toString(),
          content,
          media_url: mediaUrl,
        }
      ]).select('id').single();

      if (error) throw error;
      
      // Notify original post author
      if (postAuthor && publicKey.toString() !== postAuthor) {
        await supabase.from("notifications").insert([{
          user_wallet: postAuthor,
          actor_wallet: publicKey.toString(),
          type: "reply",
          post_id: data.id // The new reply post ID
        }]);
      }

      // Handle mentions
      const mentions = Array.from(new Set(content.match(/@([a-zA-Z0-9_]+)/g)?.map(m => m.slice(1)) || []));
      if (mentions.length > 0) {
        const { data: users } = await supabase.from('users').select('wallet_address, username').in('username', mentions);
        if (users && users.length > 0) {
          // Filter out the post author if they were already notified for the reply
          const mentionUsers = users.filter(u => u.wallet_address !== postAuthor);
          if (mentionUsers.length > 0) {
            const notifications = mentionUsers.map(u => ({
              user_wallet: u.wallet_address,
              actor_wallet: publicKey.toString(),
              type: "mention",
              post_id: data.id
            }));
            await supabase.from('notifications').insert(notifications);
          }
        }
      }

      setContent("");
      setFile(null);
      setGifUrl(null);
      toast.success("Reply posted!");
      router.refresh(); 
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("Failed to post reply.");
    } finally {
      setLoading(false);
    }
  };

  const validateFile = async (selectedFile: File) => {
    if (selectedFile.type.startsWith("video/")) {
      if (selectedFile.type !== "video/mp4") {
        toast.error("Only MP4 videos are allowed.");
        return false;
      }
      
      toast.loading("Validating video...", { id: "video-validate" });
      const errorMsg = await validateVideoFile(selectedFile);
      toast.dismiss("video-validate");
      
      if (errorMsg) {
        toast.error(errorMsg);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const isValid = await validateFile(selectedFile);
      if (isValid) {
        setFile(selectedFile);
        setGifUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMediaPickerFile = async (pickedFile: File) => {
    const isValid = await validateFile(pickedFile);
    if (isValid) {
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
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex gap-md w-full my-sm shadow-sm transition-colors focus-within:bg-surface-container focus-within:border-primary/50">
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
            className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant font-body-md resize-none focus:ring-0 p-0 min-h-[60px] outline-none"
            placeholder="Post your reply"
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

          <div className="flex flex-col gap-2 mt-sm pt-sm border-t border-outline-variant">
            <div className="flex justify-between items-center">
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
              </div>
              <div className="flex items-center gap-md">
                <span className={`font-body-sm ${content.length >= 240 ? 'text-error' : 'text-on-surface-variant'}`}>
                  {content.length}/255
                </span>
                <button
                  type="submit"
                  disabled={(!content.trim() && !file && !gifUrl) || loading || content.length > 255}
                  className="bg-primary-container text-on-primary-container px-lg py-1.5 rounded-full font-label-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {loading ? "Replying..." : "Reply"}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-on-surface-variant/50 hidden sm:block">Max: 10MB Image, 30MB Video (720p, 60s)</span>
              <span className="text-[10px] text-on-surface-variant/70 hidden sm:block">Press Enter to reply, Shift+Enter for new line</span>
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

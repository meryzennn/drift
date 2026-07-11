"use client";

import { Post } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useWallet } from "@solana/wallet-adapter-react";
import { sendTip } from "@/utils/solanaUtils";
import { useState } from "react";
import SendTipModal from "./SendTipModal";
import { supabase } from "@/utils/supabase";
import toast from "react-hot-toast";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import QuoteModal from "./QuoteModal";
import { useEffect } from "react";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import VideoPlayer from "./VideoPlayer";
import TipLeaderboardModal from "./TipLeaderboardModal";

interface PostCardProps {
  post: Post;
  isDetail?: boolean;
  hideReplyIndicator?: boolean;
  isHighlighted?: boolean;
  tipActivity?: {
    tipperUsername?: string;
    tipperWallet: string;
    tipperAvatar?: string;
    amount: number;
  };
}

export default function PostCard({ post, isDetail = false, hideReplyIndicator = false, isHighlighted = false, tipActivity }: PostCardProps) {
  const router = useRouter();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRepostMenuOpen, setIsRepostMenuOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [displayContent, setDisplayContent] = useState(post.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isImageViewerMenuOpen, setIsImageViewerMenuOpen] = useState(false);

  const [isLikedByMe, setIsLikedByMe] = useState(false);
  const [isRepostedByMe, setIsRepostedByMe] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes || 0);
  const [localRepostsCount, setLocalRepostsCount] = useState(post.repostsCount || 0);
  const [localQuotePost, setLocalQuotePost] = useState<Post | undefined>(post.quotePost);
  const [tipSummary, setTipSummary] = useState<{ total: number; tippers: { username: string; avatar_url?: string; amount: number }[] } | null>(null);
  const [isTipLeaderboardOpen, setIsTipLeaderboardOpen] = useState(false);
  const [isFetchingTips, setIsFetchingTips] = useState(false);

  const isOwner = connected && publicKey?.toString() === post.authorPublicKey;

  const fetchTipSummary = async () => {
    if (tipSummary || isFetchingTips) return;
    setIsFetchingTips(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("actor_wallet, amount, actor:users!notifications_actor_wallet_fkey(username, avatar_url)")
        .eq("user_wallet", post.authorPublicKey)
        .eq("type", "tip")
        .eq("post_id", post.id);

      if (data && data.length > 0) {
        const total = data.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        const tippers = data.map((t: any) => ({
          username: t.actor?.username || t.actor_wallet.slice(0, 6) + "...",
          avatar_url: t.actor?.avatar_url,
          amount: t.amount || 0,
        }));
        setTipSummary({ total, tippers });
      } else {
        setTipSummary({ total: 0, tippers: [] });
      }
    } finally {
      setIsFetchingTips(false);
    }
  };

  useEffect(() => {
    if (publicKey) {
      const checkInteractions = async () => {
        const [{ data: likeData }, { data: repostData }] = await Promise.all([
          supabase.from("post_likes").select("created_at").eq("post_id", post.id).eq("user_wallet", publicKey.toString()).maybeSingle(),
          supabase.from("reposts").select("created_at").eq("post_id", post.id).eq("user_wallet", publicKey.toString()).maybeSingle(),
        ]);
        if (likeData) setIsLikedByMe(true);
        if (repostData) setIsRepostedByMe(true);
      };
      checkInteractions();
    } else {
      setIsLikedByMe(false);
      setIsRepostedByMe(false);
    }
  }, [publicKey, post.id]);

  useEffect(() => {
    if (post.quotePostId && !localQuotePost) {
      const fetchQuote = async () => {
        const { data } = await supabase
          .from("posts")
          .select(`
            id, content, media_url, created_at, likes, author_wallet,
            users!posts_author_wallet_fkey ( username, display_name, avatar_url )
          `)
          .eq("id", post.quotePostId)
          .maybeSingle();
        
        if (data) {
          setLocalQuotePost(mapPostData(data));
        }
      };
      fetchQuote();
    }
  }, [post.quotePostId, localQuotePost]);

  // Eagerly fetch tip summary on mount so badge is populated immediately
  useEffect(() => {
    fetchTipSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleTipClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey) {
      toast.error("Please connect your wallet first to send a tip.");
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

      if (publicKey.toString() !== post.authorPublicKey) {
        await supabase.from("notifications").insert([{
          user_wallet: post.authorPublicKey,
          actor_wallet: publicKey.toString(),
          type: "tip",
          post_id: post.id,
          amount: amount
        }]);
      }

      toast.success(`Tip of ${amount} SOL sent successfully!`);
      setIsTipModalOpen(false);
    } catch (error) {
      console.error("Tip failed:", error);
      toast.error("Failed to send tip. See console for details.");
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatCount = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey) return toast.error("Connect wallet to like.");

    const wasLiked = isLikedByMe;
    setIsLikedByMe(!wasLiked);
    setLocalLikesCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));

    try {
      if (wasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_wallet", publicKey.toString());
        await supabase.from("posts").update({ likes: Math.max(0, localLikesCount - 1) }).eq("id", post.id);
      } else {
        await supabase.from("post_likes").insert([{ post_id: post.id, user_wallet: publicKey.toString() }]);
        await supabase.from("posts").update({ likes: localLikesCount + 1 }).eq("id", post.id);
        
        if (publicKey.toString() !== post.authorPublicKey) {
          await supabase.from("notifications").insert([{
            user_wallet: post.authorPublicKey,
            actor_wallet: publicKey.toString(),
            type: "like",
            post_id: post.id
          }]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
      setIsLikedByMe(wasLiked);
      setLocalLikesCount((prev) => (wasLiked ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleRepostClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey) {
      toast.error("Please connect your wallet first to repost.");
      return;
    }
    
    setIsRepostMenuOpen(false);

    if (isRepostedByMe) {
      // Undo repost
      setIsRepostedByMe(false);
      setLocalRepostsCount((prev) => Math.max(0, prev - 1));
      await supabase.from("reposts").delete().eq("post_id", post.id).eq("user_wallet", publicKey.toString());
      return;
    }

    // Do repost
    setIsRepostedByMe(true);
    setLocalRepostsCount((prev) => prev + 1);

    try {
      const { error: dbError } = await supabase.from("reposts").insert([
        {
          user_wallet: publicKey.toString(),
          post_id: post.id,
        }
      ]);
      
      if (dbError) throw dbError;
      
      if (publicKey.toString() !== post.authorPublicKey) {
        await supabase.from("notifications").insert([{
          user_wallet: post.authorPublicKey,
          actor_wallet: publicKey.toString(),
          type: "repost",
          post_id: post.id
        }]);
      }
      
      toast.success("Post reposted!");
    } catch (error) {
      console.error("Repost failed:", error);
      setIsRepostedByMe(false);
      setLocalRepostsCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleSaveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.imageUrl) return;
    
    // Save state to indicate loading (optional, but good UX)
    const toastId = toast.loading("Saving image...");
    try {
      // Use our proxy endpoint to bypass CORS
      const response = await fetch(`/api/download?url=${encodeURIComponent(post.imageUrl)}`);
      if (!response.ok) throw new Error("Failed to fetch image");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Get extension from mime type or default to jpg
      const ext = blob.type.split('/')[1] || 'jpg';
      link.download = `drift-image-${post.id}.${ext}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Image saved!", { id: toastId });
    } catch (err) {
      console.error("Save image error:", err);
      // Ultimate fallback: open in new tab
      window.open(post.imageUrl, '_blank');
      toast.dismiss(toastId);
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Media reported. Our team will review this shortly.");
    setIsImageViewerOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsConfirmDeleteOpen(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success("Link copied to clipboard!");
  };

  const renderActionBar = (isViewer = false) => (
    <div className={`${isViewer ? 'p-4 pb-6 flex justify-center w-full' : 'mt-md w-full'}`}>
      <div className={`flex items-center gap-sm w-full ${isViewer ? 'max-w-[500px] text-white/90 px-xs' : 'text-on-surface-variant'}`}>
        {/* Comments */}
        <button className={`flex items-center gap-xs transition-colors group shrink-0 ${isViewer ? 'hover:text-white' : 'hover:text-primary'}`}>
          <span className={`material-symbols-outlined text-[18px] rounded-full p-xs ${isViewer ? 'group-hover:bg-white/10' : 'group-hover:bg-primary/10'}`}>chat_bubble</span>
          <span className="font-body-sm text-[12px]">{formatCount(post.commentsCount || 0)}</span>
        </button>
        
        {/* Reposts */}
        <div className="relative shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsRepostMenuOpen(!isRepostMenuOpen); setIsMenuOpen(false); setIsImageViewerMenuOpen(false); }}
            className={`flex items-center gap-xs transition-colors group ${isRepostedByMe ? "text-[#00BA7C]" : isViewer ? "hover:text-[#00BA7C]" : "hover:text-[#00BA7C]"}`}
          >
            <span className={`material-symbols-outlined text-[18px] rounded-full p-xs group-hover:bg-[#00BA7C]/10 ${isRepostedByMe ? "bg-[#00BA7C]/10" : ""}`}>repeat</span>
            <span className="font-body-sm text-[12px]">{formatCount(localRepostsCount)}</span>
          </button>
          
          {isRepostMenuOpen && (
            <div 
              className={`absolute ${isViewer ? 'bottom-full mb-2' : 'bottom-10'} left-0 w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={handleRepostClick}
                className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-surface-container-highest text-on-surface font-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">repeat</span> {isRepostedByMe ? "Undo Repost" : "Repost"}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsQuoteModalOpen(true); setIsRepostMenuOpen(false); }}
                className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-surface-container-highest text-on-surface font-label-md transition-colors border-t border-outline-variant/50"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span> Quote
              </button>
            </div>
          )}
        </div>
        
        {/* Likes */}
        <button 
          onClick={handleLikeToggle}
          className={`flex items-center gap-xs transition-colors group shrink-0 ${isLikedByMe ? "text-[#F91880]" : isViewer ? "hover:text-[#F91880]" : "hover:text-[#F91880]"}`}
        >
          <span className={`material-symbols-outlined text-[18px] rounded-full p-xs group-hover:bg-[#F91880]/10 ${isLikedByMe ? "bg-[#F91880]/10" : ""}`} style={{ fontVariationSettings: isLikedByMe ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          <span className="font-body-sm text-[12px]">{formatCount(localLikesCount)}</span>
        </button>
        
        {/* Tip area & Share */}
        <div className="ml-auto flex items-center gap-xs shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); fetchTipSummary(); setIsTipLeaderboardOpen(true); }}
            className={`flex items-center justify-center border rounded-full p-xs transition-colors ${tipSummary && tipSummary.total > 0 ? (isViewer ? "text-primary border-primary/40 bg-primary/20" : "text-primary border-primary/40 bg-primary/5") : (isViewer ? "text-white/80 border-white/30 hover:bg-white/10" : "text-primary-container border-outline-variant hover:bg-primary/10")}`}
          >
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
          </button>
          <button
            onClick={handleTipClick}
            className={`flex items-center gap-xs border rounded-full px-sm py-xs transition-colors ${isViewer ? "text-white/80 border-white/30 hover:bg-white/10" : "text-primary-container border-outline-variant hover:bg-primary-container/10"}`}
          >
            <span className="material-symbols-outlined text-[15px]">send</span>
            <span className="font-label-sm text-[12px]">Tip</span>
          </button>
        </div>
      </div>
    </div>
  );

  const confirmDelete = async () => {
    setIsActionLoading(true);
    try {
      // 1. Try to delete the media from R2 if it exists
      if (post.imageUrl) {
        try {
          await fetch("/api/delete-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: post.imageUrl }),
          });
        } catch (err) {
          console.error("Failed to delete media from R2:", err);
          // We continue deleting the post even if media deletion fails
        }
      }

      // 2. Delete the post from Supabase
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      
      toast.success("Post deleted.");
      setIsDeleted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post.");
    } finally {
      setIsActionLoading(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  const handleEditSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim()) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from("posts").update({ content: editContent }).eq("id", post.id);
      if (error) throw error;
      setDisplayContent(editContent);
      setIsEditing(false);
      toast.success("Post updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update post.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isDeleted) return null;

  const handleCardClick = () => {
    if (isDetail) return;
    setIsMenuOpen(false);
    setIsRepostMenuOpen(false);
    router.push(`/post/${post.id}`);
  };

  return (
    <article 
      id={post.id}
      className={`bg-surface-container border rounded-xl p-lg flex flex-col gap-md transition-all duration-300 relative ${
        isHighlighted 
          ? 'border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] bg-primary/5 ring-1 ring-primary/30' 
          : 'border-outline-variant'
      } ${isDetail ? '' : 'hover:bg-surface-container-low cursor-pointer mb-md'}`} 
      onClick={handleCardClick}
    >
      {tipActivity && (
        <div className="flex items-center gap-xs text-on-surface-variant font-label-sm mb-[-4px]">
          <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
          <Link
            href={`/profile/${tipActivity.tipperUsername || tipActivity.tipperWallet}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline hover:text-primary transition-colors"
          >
            @{tipActivity.tipperUsername || `${tipActivity.tipperWallet.slice(0, 6)}...`}
          </Link>
          <span>tipped <span className="text-primary font-bold">{tipActivity.amount} SOL</span></span>
        </div>
      )}
      {post.isRepost && post.repostedBy && (
        <div className="flex items-center gap-xs text-on-surface-variant font-label-sm mb-[-8px]">
          <span className="material-symbols-outlined text-[16px]">repeat</span>
          <span>
            {connected && publicKey && post.reposterWallet === publicKey.toString() 
              ? "You" 
              : post.repostedBy} reposted
          </span>
        </div>
      )}
      {post.replyToPostId && !isDetail && !hideReplyIndicator && (
        <div className="flex items-center gap-xs text-on-surface-variant font-label-sm mb-[-8px]">
          <span className="material-symbols-outlined text-[16px]">reply</span>
          <Link href={`/post/${post.replyToPostId}`} className="hover:underline hover:text-primary" onClick={(e) => e.stopPropagation()}>
            Replying to a post
          </Link>
        </div>
      )}
      <div className="flex items-start gap-md">
        <Link 
          href={`/profile/${post.authorProfile?.username || post.authorPublicKey}`} 
          className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center font-bold text-primary hover:opacity-80 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {post.authorProfile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.authorProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            post.authorPublicKey.slice(0, 2)
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xs relative min-w-0">
            <Link 
              href={`/profile/${post.authorProfile?.username || post.authorPublicKey}`} 
              className="font-label-md text-on-surface hover:underline truncate max-w-[120px] shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {post.authorProfile?.displayName || "Anonymous User"}
            </Link>
            <span className="material-symbols-outlined text-[14px] text-primary-container shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <Link 
              href={`/profile/${post.authorProfile?.username || post.authorPublicKey}`} 
              className="font-mono text-[12px] text-on-surface-variant hover:underline truncate max-w-[90px] shrink"
              onClick={(e) => e.stopPropagation()}
            >
              @{post.authorProfile?.username || formatAddress(post.authorPublicKey)}
            </Link>
            <span className="text-on-surface-variant text-sm px-xs shrink-0">•</span>
            <span className="font-body-sm text-on-surface-variant shrink-0 whitespace-nowrap" suppressHydrationWarning>
              {formatDistanceToNow(new Date(post.createdAt))}
            </span>

            <div className="ml-auto relative flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); setIsRepostMenuOpen(false); }}
                className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
              
              {isMenuOpen && (
                <div 
                  className="absolute right-0 top-10 w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={(e) => { setIsMenuOpen(false); handleShare(e); }}
                    className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-surface-container-highest text-on-surface font-label-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">ios_share</span> Copy Link
                  </button>
                  {isOwner && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }}
                        className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-surface-container-highest text-on-surface font-label-md transition-colors border-t border-outline-variant/50"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                      </button>
                      <button 
                        onClick={handleDeleteClick}
                        disabled={isActionLoading}
                        className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-error/10 text-error font-label-md transition-colors border-t border-outline-variant/50"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="mt-xs">
              <textarea 
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-surface-container-low border border-primary text-on-surface p-sm rounded-lg min-h-[80px] focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <div className="flex justify-end gap-sm mt-sm">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditContent(displayContent); }}
                  className="px-4 py-1.5 rounded-full font-label-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditSave}
                  disabled={isActionLoading || !editContent.trim()}
                  className="px-4 py-1.5 rounded-full font-label-sm bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isActionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-xs font-body-md text-on-surface whitespace-pre-wrap break-words break-all">
              {displayContent}
            </div>
          )}
          
          {post.imageUrl && (
            <div 
              className="rounded-xl overflow-hidden border border-outline-variant mt-md bg-surface-container-low transition-opacity relative group"
            >
              {post.imageUrl.toLowerCase().endsWith(".mp4") ? (
                <VideoPlayer url={post.imageUrl} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={post.imageUrl} 
                  alt="Post content" 
                  className="w-full max-h-[600px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageViewerOpen(true); }}
                />
              )}
            </div>
          )}
          
          {/* QUOTE POST EMBED */}
          {localQuotePost && (
            <div 
              className="mt-md border border-outline-variant rounded-xl p-md bg-surface-container hover:bg-surface-container-highest transition-colors cursor-pointer flex flex-col gap-sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/post/${localQuotePost.id}`);
              }}
            >
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 overflow-hidden border border-outline-variant">
                  {localQuotePost.authorProfile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={localQuotePost.authorProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px] text-outline">person</span>
                  )}
                </div>
                <div className="flex items-center gap-xs text-sm min-w-0">
                  <span className="font-bold text-on-surface truncate max-w-[130px]">
                    {localQuotePost.authorProfile?.displayName || "Unknown"}
                  </span>
                  <span className="text-on-surface-variant truncate max-w-[100px]">
                    @{localQuotePost.authorProfile?.username || formatAddress(localQuotePost.authorPublicKey)}
                  </span>
                  <span className="text-on-surface-variant shrink-0">·</span>
                  <span className="text-on-surface-variant shrink-0 whitespace-nowrap">{formatDistanceToNow(new Date(localQuotePost.createdAt))}</span>
                </div>
              </div>
              
              <div className="text-on-surface font-body-md break-words">
                {localQuotePost.content}
              </div>

              {localQuotePost.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-outline-variant mt-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={localQuotePost.imageUrl} alt="" className="w-full max-h-[300px] object-cover" />
                </div>
              )}
            </div>
          )}
          
          {renderActionBar(false)}
        </div>
      </div>

      <SendTipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        recipientAddress={post.authorPublicKey}
        recipientName={post.authorProfile?.displayName || "Anonymous User"}
        recipientAvatar={post.authorProfile?.avatarUrl}
        onConfirm={confirmTip}
      />

      <QuoteModal 
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quotedPost={post}
      />

      <TipLeaderboardModal
        isOpen={isTipLeaderboardOpen}
        onClose={() => setIsTipLeaderboardOpen(false)}
        postId={post.id}
        postAuthorWallet={post.authorPublicKey}
      />

      {isConfirmDeleteOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[24rem] bg-surface-container-high border border-outline-variant rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="font-headline-sm font-bold text-on-surface">Delete Post?</h3>
            </div>
            <p className="font-body-md text-on-surface-variant">
              This action cannot be undone. Are you sure you want to permanently delete this post?
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsConfirmDeleteOpen(false); }}
                disabled={isActionLoading}
                className="px-5 py-2 rounded-full font-label-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); confirmDelete(); }}
                disabled={isActionLoading}
                className="px-5 py-2 rounded-full font-label-md bg-error text-onError hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isActionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isImageViewerOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[500] flex flex-col bg-black animate-in fade-in duration-200" 
          onClick={() => { setIsImageViewerMenuOpen(false); setIsRepostMenuOpen(false); }}
        >
          {/* Top Bar - Solid Black */}
          <div className="p-4 md:p-6 flex justify-between items-center z-20 bg-black shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsImageViewerOpen(false); }}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsImageViewerMenuOpen(!isImageViewerMenuOpen); setIsRepostMenuOpen(false); }}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">more_horiz</span>
              </button>
              {isImageViewerMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={(e) => { setIsImageViewerMenuOpen(false); handleSaveImage(e); }}
                    className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-surface-container-highest text-on-surface font-label-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span> Save Image
                  </button>
                  <button 
                    onClick={(e) => { setIsImageViewerMenuOpen(false); handleReport(e); }}
                    className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-error/10 text-error font-label-md transition-colors border-t border-outline-variant/50"
                  >
                    <span className="material-symbols-outlined text-[18px]">report</span> Report
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black px-2 md:px-6">
            <img 
              src={post.imageUrl} 
              alt="Full view" 
              className="max-w-full max-h-full object-contain select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Bottom Bar - Solid Black */}
          <div className="bg-black shrink-0">
            {renderActionBar(true)}
          </div>
        </div>,
        document.body
      )}
    </article>
  );
}

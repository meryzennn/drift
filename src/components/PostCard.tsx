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

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [displayContent, setDisplayContent] = useState(post.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const isOwner = connected && publicKey?.toString() === post.authorPublicKey;

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

  const handleRepostClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicKey) {
      toast.error("Please connect your wallet first to repost.");
      return;
    }
    
    try {
      const { error: dbError } = await supabase.from("reposts").insert([
        {
          user_wallet: publicKey.toString(),
          post_id: post.id,
        }
      ]);
      
      if (dbError) {
        if (dbError.code === '23505') { // Unique constraint violation
          toast.error("You have already reposted this!");
        } else {
          throw dbError;
        }
        return;
      }
      
      toast.success("Post reposted successfully!");
    } catch (error) {
      console.error("Repost failed:", error);
      toast.error("Failed to repost.");
    }
  };

  const handleSaveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.imageUrl) return;
    try {
      const response = await fetch(post.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `drift-image-${post.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image saved!");
    } catch (err) {
      toast.error("Failed to save image.");
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

  const confirmDelete = async () => {
    setIsActionLoading(true);
    try {
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

  return (
    <article className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-md hover:bg-surface-container-low transition-colors duration-200 cursor-pointer mb-md relative" onClick={() => setIsMenuOpen(false)}>
      <div className="flex items-start gap-md">
        <Link href={`/profile/${post.authorProfile?.username || post.authorPublicKey}`} className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center font-bold text-primary hover:opacity-80 transition-opacity">
          {post.authorProfile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.authorProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            post.authorPublicKey.slice(0, 2)
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm flex-wrap relative">
            <Link href={`/profile/${post.authorProfile?.username || post.authorPublicKey}`} className="font-label-md text-on-surface hover:underline">{post.authorProfile?.displayName || "Anonymous User"}</Link>
            <span className="material-symbols-outlined text-[14px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <Link href={`/profile/${post.authorProfile?.username || post.authorPublicKey}`} className="font-mono text-[14px] text-on-surface-variant hover:underline">@{post.authorProfile?.username || formatAddress(post.authorPublicKey)}</Link>
            <span className="text-on-surface-variant text-sm px-xs">•</span>
            <span className="font-body-sm text-on-surface-variant">
              {formatDistanceToNow(new Date(post.createdAt))}
            </span>

            {isOwner && (
              <div className="ml-auto relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                  className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 top-10 w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-md py-3 flex items-center gap-3 hover:bg-surface-container-highest text-on-surface font-label-md transition-colors"
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
                  </div>
                )}
              </div>
            )}
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
              className="rounded-xl overflow-hidden border border-outline-variant mt-md bg-surface-container-low cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageViewerOpen(true); }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={post.imageUrl} 
                alt="Post content" 
                className="w-full max-h-[512px] object-contain bg-black/5"
              />
            </div>
          )}
          
          <div className="mt-md flex justify-between items-center text-on-surface-variant max-w-[28rem]">
            <button className="flex items-center gap-xs hover:text-primary transition-colors group">
              <span className="material-symbols-outlined text-[20px] group-hover:bg-primary/10 rounded-full p-xs">chat_bubble</span>
              <span className="font-body-sm">0</span>
            </button>
            
            <button 
              onClick={handleRepostClick}
              className="flex items-center gap-xs hover:text-secondary transition-colors group"
            >
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 animate-in fade-in duration-200">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsImageViewerOpen(false); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 rounded-full bg-surface-container-high/50 hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-colors z-10"
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
          
          <img 
            src={post.imageUrl} 
            alt="Full view" 
            className="max-w-[100vw] max-h-[100vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-6 flex gap-4 z-10">
            <button 
              onClick={handleSaveImage}
              className="px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg rounded-full flex items-center gap-2 transition-colors shadow-lg border border-outline-variant/50"
            >
              <span className="material-symbols-outlined">download</span>
              Save Image
            </button>
            <button 
              onClick={handleReport}
              className="px-6 py-3 bg-error/10 hover:bg-error/20 text-error font-label-lg rounded-full flex items-center gap-2 transition-colors shadow-lg border border-error/20"
            >
              <span className="material-symbols-outlined">report</span>
              Report
            </button>
          </div>
        </div>,
        document.body
      )}
    </article>
  );
}

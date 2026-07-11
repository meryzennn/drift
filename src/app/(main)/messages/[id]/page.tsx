"use client";

import { useState, useEffect, useRef, use } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { encryptMessage, decryptMessage } from "@/utils/encryption";
import Link from "next/link";
import toast from "react-hot-toast";
import MediaPickerModal from "@/components/MediaPickerModal";
import ImageLightbox from "@/components/ImageLightbox";
import SendTipModal from "@/components/SendTipModal";
import { sendTip } from "@/utils/solanaUtils";

const getLastSeenText = (lastSeenISO: string | undefined) => {
  if (!lastSeenISO) return null;
  const lastSeenDate = new Date(lastSeenISO);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  
  // Show online if active within the last 60 seconds
  if (diffMs < 60000) return "Online";
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `Last seen ${diffMins} mins ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Last seen ${diffHours} hours ago`;
  if (diffHours < 48) return "Last seen yesterday";
  
  return `Last seen ${lastSeenDate.toLocaleDateString()}`;
};

export default function ChatRoom({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const convoId = unwrappedParams.id;
  
  const { publicKey, connected, sendTransaction } = useWallet();
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [mySecret, setMySecret] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [otherPubkey, setOtherPubkey] = useState<string | null>(null);
  
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isMutual, setIsMutual] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  
  // Reply & Select State
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [swipeState, setSwipeState] = useState<{ id: string, startX: number, currentX: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: any } | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<{ singleId?: string, multiple?: boolean } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const swipeThreshold = 60;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ id: string, time: number } | null>(null);

  // Check Authsession key
  useEffect(() => {
    if (publicKey) {
      const secret = sessionStorage.getItem(`drift_chat_secret_${publicKey.toString()}`);
      if (secret) {
        setMySecret(secret);
      } else {
        router.push("/messages"); // Force auth
      }
    }
  }, [publicKey, router]);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    document.addEventListener("click", closeContextMenu);
    return () => document.removeEventListener("click", closeContextMenu);
  }, []);

  // Timer to force re-render for relative timestamps (like "Online" -> "Last seen")
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Conversation & Users
  useEffect(() => {
    if (!publicKey || !mySecret) return;

    const fetchConvo = async () => {
      try {
        const { data: convo, error } = await supabase
          .from("conversations")
          .select(`
            *,
            user1:users!conversations_user1_wallet_fkey(wallet_address, username, display_name, avatar_url, chat_pubkey),
            user2:users!conversations_user2_wallet_fkey(wallet_address, username, display_name, avatar_url, chat_pubkey)
          `)
          .eq("id", convoId)
          .single();

        if (error) throw error;

        if (convo.user1_wallet !== publicKey.toString() && convo.user2_wallet !== publicKey.toString()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const isUser1 = convo.user1_wallet === publicKey.toString();
        const other = isUser1 ? convo.user2 : convo.user1;
        setOtherUser(other);
        
        // Check mutual follow
        const [{ data: follow1 }, { data: follow2 }] = await Promise.all([
          supabase.from("follows").select("created_at").eq("follower_wallet", publicKey.toString()).eq("following_wallet", other.wallet_address).maybeSingle(),
          supabase.from("follows").select("created_at").eq("follower_wallet", other.wallet_address).eq("following_wallet", publicKey.toString()).maybeSingle()
        ]);
        
        setIsMutual(!!follow1 && !!follow2);
        
        if (other.chat_pubkey) {
          setOtherPubkey(other.chat_pubkey);
        } else {
          toast.error("User hasn't enabled DMs yet (No pubkey)");
        }
        
        // Mark message notifications as read
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_wallet", publicKey.toString())
          .eq("actor_wallet", other.wallet_address)
          .eq("type", "message");
        
        // Try to fetch last_seen safely
        try {
          const { data: userPresence } = await supabase
            .from("users")
            .select("last_seen")
            .eq("wallet_address", other.wallet_address)
            .maybeSingle();
          if (userPresence && userPresence.last_seen) {
            setOtherUser((prev: any) => ({ ...prev, last_seen: userPresence.last_seen }));
          }
        } catch (e) {
          // Ignore if column doesn't exist
        }

        // Try to mark messages as read
        try {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", convoId)
            .eq("sender_wallet", other.wallet_address)
            .eq("is_read", false);
        } catch (e) {
          // Ignore if column doesn't exist
        }
        
        fetchMessages(other.chat_pubkey);
      } catch (err) {
        console.error("Convo fetch error:", err);
        setNotFound(true);
        setLoading(false);
      }
    };

    fetchConvo();
  }, [publicKey, mySecret, convoId]);

  const fetchMessages = async (recipientPubkey: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const decrypted = data.map(msg => processIncomingMessage(msg, recipientPubkey));
      setMessages(decrypted);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const processIncomingMessage = (msg: any, recipientPubkey: string) => {
    if (!mySecret || !recipientPubkey) return { ...msg, decryptedText: "Decryption error", decryptedMedia: null };
    
    const decryptedText = decryptMessage(msg.content, mySecret, recipientPubkey);
    let decryptedMedia = null;
    if (msg.media_url) {
      decryptedMedia = decryptMessage(msg.media_url, mySecret, recipientPubkey);
    }
    
    return {
      ...msg,
      decryptedText: decryptedText !== null ? decryptedText : "[Encrypted Message]",
      decryptedMedia: decryptedMedia
    };
  };

  // Realtime subscription
  useEffect(() => {
    if (!otherPubkey || !mySecret || !publicKey || !otherUser) return;
    
    const channel = supabase
      .channel(`chat_${convoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${convoId}`
      }, async (payload) => {
        const processed = processIncomingMessage(payload.new, otherPubkey);
        setMessages(prev => [...prev, processed]);
        scrollToBottom();

        // Mark as read immediately if we receive a message while looking at this chat
        if (payload.new.sender_wallet === otherUser.wallet_address) {
          await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_wallet", publicKey.toString())
            .eq("actor_wallet", otherUser.wallet_address)
            .eq("type", "message")
            .eq("is_read", false);
        }
        // Try to mark message as read
        if (payload.new.sender_wallet === otherUser.wallet_address) {
          try {
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", payload.new.id);
          } catch (e) {}
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convoId}`
      }, (payload) => {
        setMessages(prev => prev.map(msg => msg.id === payload.new.id ? { ...msg, is_read: payload.new.is_read } : msg));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user !== publicKey.toString()) {
          setIsOtherTyping(payload.payload.isTyping);
        }
      })
      .on('broadcast', { event: 'confetti' }, () => {
        triggerConfetti();
      })
      .subscribe();
      
    channelRef.current = channel;
      
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [otherPubkey, mySecret, convoId, publicKey, otherUser]);

  // Realtime subscription for user presence
  useEffect(() => {
    if (!otherUser?.wallet_address) return;
    
    const presenceChannel = supabase
      .channel(`presence_${otherUser.wallet_address}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `wallet_address=eq.${otherUser.wallet_address}`
      }, (payload) => {
        if (payload.new.last_seen) {
          setOtherUser((prev: any) => ({ ...prev, last_seen: payload.new.last_seen }));
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [otherUser?.wallet_address]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 4000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    if (channelRef.current && publicKey) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user: publicKey.toString(), isTyping: true }
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user: publicKey.toString(), isTyping: false }
          });
        }
      }, 2000);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Image too large (max 10MB)");
          return;
        }

        toast.loading("Uploading pasted image...");
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "post");
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          toast.dismiss();
          handleSend("", data.url);
        } catch (err) {
          toast.dismiss();
          toast.error("Failed to upload pasted image");
        }
        return;
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedMessageIds.size === 0) return;
    setDeletePrompt({ multiple: true });
  };

  const confirmDelete = async () => {
    try {
      if (deletePrompt?.singleId) {
        const msgToDelete = messages.find(m => m.id === deletePrompt.singleId);
        if (msgToDelete?.decryptedMedia) {
          fetch("/api/delete-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: msgToDelete.decryptedMedia }) }).catch(() => {});
        }
        const { error } = await supabase.from("messages").delete().eq("id", deletePrompt.singleId);
        if (error) throw error;
        setMessages(prev => prev.filter(msg => msg.id !== deletePrompt.singleId));
      } else if (deletePrompt?.multiple) {
        const idsToDelete = Array.from(selectedMessageIds);
        // Delete media from R2 for each message that has media
        const msgsToDelete = messages.filter(m => idsToDelete.includes(m.id) && m.decryptedMedia);
        msgsToDelete.forEach(m => {
          fetch("/api/delete-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: m.decryptedMedia }) }).catch(() => {});
        });
        const { error } = await supabase.from("messages").delete().in("id", idsToDelete);
        if (error) throw error;
        setMessages(prev => prev.filter(msg => !idsToDelete.includes(msg.id)));
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
      }
      setDeletePrompt(null);
    } catch (e: any) {
      toast.error("Failed to delete message: " + (e.message || "Unknown error"));
      setDeletePrompt(null);
    }
  };

  const handleTouchStart = (msg: any, e: React.TouchEvent) => {
    if (isSelectionMode) return;
    longPressTimerRef.current = setTimeout(() => {
       setIsSelectionMode(true);
       toggleSelection(msg.id);
    }, 500);
    setSwipeState({ id: msg.id, startX: e.touches[0].clientX, currentX: e.touches[0].clientX });
  };

  const handleTouchMove = (msg: any, e: React.TouchEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (swipeState?.id === msg.id) {
      setSwipeState(prev => prev ? { ...prev, currentX: e.touches[0].clientX } : null);
    }
  };

  const handleTouchEnd = (msg: any) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (swipeState?.id === msg.id) {
      const diff = swipeState!.currentX - swipeState!.startX;
      if (diff > swipeThreshold && !isSelectionMode) {
        setReplyingTo(msg);
      } else if (Math.abs(diff) < 10 && !isSelectionMode && msg.sender_wallet === publicKey?.toString()) {
        const now = Date.now();
        if (lastTapRef.current && lastTapRef.current.id === msg.id && (now - lastTapRef.current.time < 300)) {
          setDeletePrompt({ singleId: msg.id });
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { id: msg.id, time: now };
        }
      }
      setSwipeState(null);
    }
  };

  const handleSend = async (text: string, mediaUrl?: string, tipAmount?: number) => {
    if ((!text && !mediaUrl && !tipAmount) || !publicKey || !mySecret || !otherPubkey) return;

    let defaultText = "";
    if (!text && tipAmount) defaultText = "Sent a tip";
    const encText = encryptMessage(text || defaultText, mySecret, otherPubkey);
    const encMedia = mediaUrl ? encryptMessage(mediaUrl, mySecret, otherPubkey) : null;
    
    setInputText("");
    const currentReplyId = replyingTo?.id;
    setReplyingTo(null);

    try {
      await supabase.from("messages").insert({
        conversation_id: convoId,
        sender_wallet: publicKey.toString(),
        content: encText,
        media_url: encMedia,
        is_tip: !!tipAmount,
        tip_amount: tipAmount || null,
        reply_to_id: currentReplyId || null
      });
      
      // Update convo last message
      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString()
      }).eq("id", convoId);
      
      // Send notification to the other user
      if (otherUser?.wallet_address) {
        await supabase.from("notifications").insert([{
          user_wallet: otherUser.wallet_address,
          actor_wallet: publicKey.toString(),
          type: "message"
        }]);
      }
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to send");
    }
  };
  
  const handleSendTip = async (amount: number, message?: string) => {
    if (!publicKey || !otherUser) return;
    try {
      const signature = await sendTip(publicKey, otherUser.wallet_address, amount, sendTransaction);
      if (signature) {
        toast.success(`Successfully tipped ${amount} SOL! 🎉`);
        setIsTipOpen(false);
        handleSend(message || "", undefined, amount);
        // Trigger confetti locally and broadcast to the other user
        triggerConfetti();
        channelRef.current?.send({ type: 'broadcast', event: 'confetti', payload: {} });
      }
    } catch (err: any) {
      if (err?.message?.includes("User rejected") || err?.name === "WalletSendTransactionError" || err?.message?.includes("cancelled")) {
        toast("Tip cancelled", { icon: "ℹ️" });
      } else {
        console.error("Tip error:", err);
        toast.error("Failed to tip");
      }
    }
  };

  if (!publicKey) {
    return (
      <div className="flex flex-col h-[calc(100dvh-152px)] md:h-[calc(100vh-112px)] w-full items-center justify-center bg-surface-container-lowest border border-outline-variant/50 rounded-2xl mx-auto" style={{ minWidth: 'min(100%, 500px)' }}>
        <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">lock</span>
        <h2 className="text-xl font-bold text-on-surface">Authentication Required</h2>
        <p className="text-on-surface-variant mb-6 text-center mt-2 px-4 max-w-[300px]">
          Please connect your wallet to view messages.
        </p>
      </div>
    );
  }

  if (!mySecret) {
    return (
      <div className="flex flex-col h-[calc(100dvh-152px)] md:h-[calc(100vh-112px)] w-full items-center justify-center bg-surface-container-lowest border border-outline-variant/50 rounded-2xl mx-auto" style={{ minWidth: 'min(100%, 500px)' }}>
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col h-[calc(100dvh-152px)] md:h-[calc(100vh-112px)] w-full items-center justify-center bg-surface-container-lowest border border-outline-variant/50 rounded-2xl mx-auto" style={{ minWidth: 'min(100%, 500px)' }}>
        <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">chat_bubble_off</span>
        <h2 className="text-xl font-bold text-on-surface">Conversation Not Found</h2>
        <p className="text-on-surface-variant mb-6 text-center mt-2 px-4 max-w-[300px]">
          This conversation doesn't exist or you don't have permission to view it.
        </p>
        <button onClick={() => router.push("/messages")} className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors">
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <>
    <div 
      className="fixed top-[64px] bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex flex-col bg-surface-container-lowest md:relative md:top-auto md:bottom-auto md:left-auto md:right-auto md:z-auto md:flex-none md:h-[calc(100vh-152px)] lg:h-[calc(100vh-112px)] w-full border-0 md:border border-outline-variant/50 rounded-none md:rounded-2xl overflow-hidden md:shadow-lg mx-auto" 
      style={{ minWidth: 'min(100%, 500px)' }}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center gap-4 bg-surface-container-low border-b border-outline-variant/50 shrink-0">
        <button onClick={() => router.push("/messages")} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        {otherUser ? (
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant">
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/20">
                  {otherUser.display_name?.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
              <div className="flex flex-col">
                <span className="font-headline-sm font-bold text-on-surface">{otherUser.display_name || "User"}</span>
                <div className="flex items-center gap-1.5">
                  {getLastSeenText(otherUser.last_seen) === "Online" && (
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  )}
                  <span className="font-body-sm text-on-surface-variant">
                    {getLastSeenText(otherUser.last_seen) || `@${otherUser.username || `${otherUser.wallet_address.slice(0, 10)}...`}`}
                  </span>
                </div>
              </div>
          </Link>
        ) : (
          <div className="w-32 h-10 bg-surface-container-highest rounded-xl animate-pulse"></div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMine = msg.sender_wallet === publicKey.toString();
              
              const msgDate = new Date(msg.created_at);
              const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].created_at) : null;
              const isNewDay = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();
              
              let dateLabel = "";
              if (isNewDay) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (msgDate.toDateString() === today.toDateString()) {
                  dateLabel = "Today";
                } else if (msgDate.toDateString() === yesterday.toDateString()) {
                  dateLabel = "Yesterday";
                } else {
                  dateLabel = msgDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                }
              }

              return (
                <div key={msg.id} id={`msg-${msg.id}`} className="w-full flex flex-col gap-3 group relative">
                  {isNewDay && (
                    <div className="flex justify-center mt-2 mb-1 w-full">
                      <div className="bg-surface-container-high px-3 py-1 rounded-full text-[11px] font-label-md text-on-surface-variant font-bold">
                        {dateLabel}
                      </div>
                    </div>
                  )}
                  <div className={`w-full flex items-center ${isMine ? "justify-end" : "justify-start"}`}>
                    
                    {isSelectionMode && (
                      <div className="mr-3 shrink-0 cursor-pointer" onClick={() => toggleSelection(msg.id)}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedMessageIds.has(msg.id) ? "bg-primary border-primary text-on-primary" : "border-outline-variant"}`}>
                          {selectedMessageIds.has(msg.id) && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </div>
                      </div>
                    )}

                    <div 
                      className={`flex flex-col max-w-[75%] relative ${isMine ? "items-end" : "items-start"}`}
                      onTouchStart={(e) => handleTouchStart(msg, e)}
                      onTouchMove={(e) => handleTouchMove(msg, e)}
                      onTouchEnd={() => handleTouchEnd(msg)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, msg });
                      }}
                      style={{ 
                        transform: swipeState?.id === msg.id ? `translateX(${Math.max(0, swipeState!.currentX - swipeState!.startX)}px)` : 'none', 
                        transition: swipeState?.id === msg.id ? 'none' : 'transform 0.2s' 
                      }}
                    >
                      {/* Unified Message Bubble */}
                      <div className={`flex flex-col rounded-2xl text-[15px] overflow-hidden ${isMine ? "bg-primary text-on-primary rounded-tr-sm" : "bg-surface-container text-on-surface rounded-tl-sm border border-outline-variant/50"}`}>
                          
                          {/* Reply Snippet */}
                          {msg.reply_to_id && (
                            <div 
                              className={`m-1.5 mb-0 p-2 rounded-xl text-sm border-l-4 cursor-pointer opacity-90 hover:opacity-100 transition-opacity overflow-hidden ${isMine ? "bg-black/10 border-on-primary text-on-primary" : "bg-black/20 border-primary text-on-surface"}`}
                              onClick={() => {
                                const el = document.getElementById(`msg-${msg.reply_to_id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                            >
                              <div className={`font-bold text-xs mb-0.5 ${isMine ? "text-on-primary" : "text-primary"}`}>
                                {(() => {
                                  const rMsg = messages.find(m => m.id === msg.reply_to_id);
                                  if (!rMsg) return "Unknown";
                                  return rMsg.sender_wallet === publicKey?.toString() ? "You" : otherUser?.display_name;
                                })()}
                              </div>
                              <div className="truncate text-xs opacity-90">
                                {(() => {
                                  const rMsg = messages.find(m => m.id === msg.reply_to_id);
                                  if (!rMsg) return "Message deleted or not loaded";
                                  return rMsg.decryptedText || "Media";
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Tip Card */}
                          {msg.is_tip && (
                            <div className={`flex items-center gap-2 px-3 py-2 ${
                              isMine
                                ? "bg-yellow-400/20 border-b border-yellow-400/30"
                                : "bg-yellow-500/15 border-b border-yellow-500/20"
                            }`}>
                              <span className="material-symbols-outlined text-yellow-400 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                              <div>
                                <div className="text-xs font-bold text-yellow-400">Tip Sent</div>
                                <div className="text-sm font-bold">{msg.tip_amount} SOL</div>
                              </div>
                            </div>
                          )}
                        
                          {/* Media */}
                          {msg.decryptedMedia && (
                            <div 
                              className="overflow-hidden max-w-[250px] max-h-[250px] cursor-zoom-in"
                              onClick={() => !msg.decryptedMedia?.endsWith('.mp4') && setLightboxSrc(msg.decryptedMedia)}
                            >
                              {msg.decryptedMedia.endsWith('.mp4') ? (
                                <video src={msg.decryptedMedia} autoPlay loop muted className="w-full h-full object-cover" />
                              ) : (
                                <img src={msg.decryptedMedia} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          )}
                          
                          {/* Text */}
                          {msg.decryptedText && (!msg.is_tip || (msg.is_tip && msg.decryptedText !== "Sent a tip")) && (
                            <div className={`px-3 py-2 ${msg.decryptedMedia || msg.reply_to_id || msg.is_tip ? "" : ""}`}>
                              {msg.decryptedText}
                            </div>
                          )}
                        </div>
                      
                      <div className={`text-[11px] text-on-surface-variant mt-1 px-1 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMine && (
                          <span className={`material-symbols-outlined text-[14px] ${msg.is_read ? "text-[#3B82F6]" : "text-outline-variant"}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>
                            done_all
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {isOtherTyping && (
              <div className="w-full flex flex-col gap-3">
                <div className="flex self-start items-start max-w-[75%]">
                  <div className="px-4 py-3 rounded-2xl bg-surface-container text-on-surface rounded-tl-sm border border-outline-variant/50 flex items-center h-[42px]">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-outline-variant animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 rounded-full bg-outline-variant animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 rounded-full bg-outline-variant animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-surface-container-low border-t border-outline-variant shrink-0 flex flex-col gap-2">
        {!isMutual ? (
          <div className="text-center p-3 text-on-surface-variant font-label-md bg-surface-container rounded-xl border border-outline-variant/50">
            You must follow each other to send messages.
          </div>
        ) : !otherPubkey ? (
          <div className="text-center p-2 text-error font-label-md bg-error/10 rounded-xl">
            User hasn't enabled DMs yet. They need to unlock DMs in their inbox first.
          </div>
        ) : isSelectionMode ? (
          <div className="flex items-center justify-between w-full h-11 px-4 bg-surface-container rounded-full border border-outline-variant/50">
            <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds(new Set()); }} className="text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors">Cancel</button>
            <span className="font-bold text-sm">{selectedMessageIds.size} Selected</span>
            <button onClick={handleDeleteSelected} disabled={selectedMessageIds.size === 0} className="text-error font-bold text-sm disabled:opacity-50 hover:opacity-80 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">delete</span> Delete
            </button>
          </div>
        ) : (
          <>
            {replyingTo && (
              <div className="bg-surface-container-high p-2 px-3 rounded-xl flex justify-between items-center text-sm border-l-4 border-primary">
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="font-bold text-primary text-xs">{replyingTo.sender_wallet === publicKey?.toString() ? "You" : otherUser?.display_name}</span>
                  <span className="truncate text-on-surface-variant text-xs">{replyingTo.decryptedText || "Media"}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 shrink-0 hover:bg-surface-container-highest rounded-full text-on-surface-variant transition-colors">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
              className="flex items-center gap-2 bg-surface-container border border-outline-variant/50 rounded-full pl-4 pr-1 py-1 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all w-full"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => handleInputChange(e as any)}
                onPaste={handlePaste}
                placeholder="Message..."
                className="flex-1 bg-transparent border-none text-on-surface placeholder:text-on-surface-variant focus:outline-none min-w-0"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setIsMediaOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">image</span>
                </button>
                <button type="button" onClick={() => setIsTipOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                </button>
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-surface-container-highest border border-outline-variant shadow-xl rounded-xl py-1 min-w-[150px] flex flex-col"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-2 hover:bg-surface-container text-sm flex items-center gap-2"
            onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); }}
          >
            <span className="material-symbols-outlined text-[18px]">reply</span>
            Reply
          </button>
          {contextMenu.msg.sender_wallet === publicKey?.toString() && (
            <button 
              className="w-full text-left px-4 py-2 hover:bg-surface-container text-sm text-error flex items-center gap-2"
              onClick={() => { 
                setDeletePrompt({ singleId: contextMenu.msg.id }); 
                setContextMenu(null); 
              }}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          )}
        </div>
      )}


      {isMediaOpen && (
        <MediaPickerModal
          onClose={() => setIsMediaOpen(false)}
          type="post"
        maxMB={10}
        onFile={async (file) => {
          setIsMediaOpen(false);
          toast.loading("Uploading media...");
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "post");
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            toast.dismiss();
            handleSend("", data.url);
          } catch (err) {
            toast.dismiss();
            toast.error("Failed to upload media");
          }
        }}
          onGif={(url) => { handleSend("", url); setIsMediaOpen(false); }}
        />
      )}
      
      {otherUser && (
        <SendTipModal
          isOpen={isTipOpen}
          onClose={() => setIsTipOpen(false)}
          recipientAddress={otherUser.wallet_address}
          recipientName={otherUser.display_name}
          recipientAvatar={otherUser.avatar_url}
          onConfirm={handleSendTip}
          allowMessage={true}
        />
      )}
    </div>
    {mounted && deletePrompt && createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center" style={{ padding: '24px' }}>
        <div style={{ background: 'var(--color-surface-container, #1b1b1e)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>delete_forever</span>
            Hapus Pesan?
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Pesan ini akan dihapus untuk semua orang dan tidak bisa dikembalikan. Yakin?
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button 
              onClick={() => setDeletePrompt(null)}
              style={{ flex: 1, padding: '12px', fontWeight: 'bold', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
            >
              No
            </button>
            <button 
              onClick={confirmDelete}
              style={{ flex: 1, padding: '12px', fontWeight: 'bold', borderRadius: '9999px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    {mounted && showConfetti && createPortal(
      <div className="fixed inset-0 z-[99998] pointer-events-none overflow-hidden" aria-hidden>
        {Array.from({ length: 80 }).map((_, i) => {
          const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6FF2','#FFA500','#7C3AED'];
          const color = colors[i % colors.length];
          const left = Math.random() * 100;
          const delay = Math.random() * 2;
          const duration = 2 + Math.random() * 2;
          const size = 6 + Math.random() * 8;
          const rotate = Math.random() * 720;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-20px',
              width: `${size}px`,
              height: `${size * 0.6}px`,
              background: color,
              borderRadius: '2px',
              animation: `confettiFall ${duration}s ${delay}s ease-in forwards`,
              transform: `rotate(${rotate}deg)`,
            }} />
          );
        })}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>,
      document.body
    )}
    </>
  );
}

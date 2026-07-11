"use client";

import { useState, useEffect, useRef, use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { encryptMessage, decryptMessage } from "@/utils/encryption";
import Link from "next/link";
import toast from "react-hot-toast";
import MediaPickerModal from "@/components/MediaPickerModal";
import SendTipModal from "@/components/SendTipModal";
import { sendTip } from "@/utils/solanaUtils";

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session key
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

        const isUser1 = convo.user1_wallet === publicKey.toString();
        const other = isUser1 ? convo.user2 : convo.user1;
        setOtherUser(other);
        
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
        
        fetchMessages(other.chat_pubkey);
      } catch (err) {
        console.error(err);
        router.push("/messages");
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
    if (!otherPubkey || !mySecret) return;
    
    const channel = supabase
      .channel(`chat_${convoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${convoId}`
      }, (payload) => {
        const processed = processIncomingMessage(payload.new, otherPubkey);
        setMessages(prev => [...prev, processed]);
        scrollToBottom();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherPubkey, mySecret, convoId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (text: string, mediaUrl?: string, tipAmount?: number) => {
    if ((!text && !mediaUrl && !tipAmount) || !publicKey || !mySecret || !otherPubkey) return;

    let defaultText = "";
    if (!text && tipAmount) defaultText = "Sent a tip";
    const encText = encryptMessage(text || defaultText, mySecret, otherPubkey);
    const encMedia = mediaUrl ? encryptMessage(mediaUrl, mySecret, otherPubkey) : null;
    
    setInputText("");

    try {
      await supabase.from("messages").insert({
        conversation_id: convoId,
        sender_wallet: publicKey.toString(),
        content: encText,
        media_url: encMedia,
        is_tip: !!tipAmount,
        tip_amount: tipAmount || null
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
        toast.success(`Successfully tipped ${amount} SOL!`);
        setIsTipOpen(false);
        handleSend(message || "", undefined, amount);
      }
    } catch (err) {
      toast.error("Failed to tip");
    }
  };

  if (!publicKey || !mySecret) return null;

  return (
    <div className="flex flex-col h-[calc(100dvh-152px)] md:h-[calc(100vh-112px)] w-full bg-surface-container-lowest border-0 md:border border-outline-variant/50 rounded-none md:rounded-2xl overflow-hidden md:shadow-lg mx-auto" style={{ minWidth: 'min(100%, 500px)' }}>
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
            <div>
              <div className="font-label-lg font-bold text-on-surface">{otherUser.display_name}</div>
              <div className="font-body-sm text-on-surface-variant">@{otherUser.username}</div>
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
                <div key={msg.id} className="w-full flex flex-col gap-3">
                  {isNewDay && (
                    <div className="flex justify-center mt-2 mb-1 w-full">
                      <div className="bg-surface-container-high px-3 py-1 rounded-full text-[11px] font-label-md text-on-surface-variant font-bold">
                        {dateLabel}
                      </div>
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isMine ? "self-end items-end" : "self-start items-start"}`}>
                    
                    {msg.is_tip && (
                      <div className={`mb-1 px-4 py-2 rounded-2xl flex items-center gap-2 border ${isMine ? "bg-primary/20 border-primary/30 text-primary" : "bg-surface-container-high border-outline-variant text-on-surface"}`}>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                        <span className="font-bold">Sent {msg.tip_amount} SOL</span>
                      </div>
                    )}
                    
                    {msg.decryptedMedia && (
                      <div className="mb-1 rounded-2xl overflow-hidden border border-outline-variant max-w-[250px] max-h-[250px]">
                        {msg.decryptedMedia.endsWith('.mp4') ? (
                          <video src={msg.decryptedMedia} autoPlay loop muted className="w-full h-full object-cover" />
                        ) : (
                          <img src={msg.decryptedMedia} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    
                    {msg.decryptedText && (!msg.is_tip || (msg.is_tip && msg.decryptedText !== "Sent a tip")) && (
                      <div className={`px-4 py-2.5 rounded-2xl text-[15px] ${isMine ? "bg-primary text-on-primary rounded-tr-sm" : "bg-surface-container text-on-surface rounded-tl-sm border border-outline-variant/50"}`}>
                        {msg.decryptedText}
                      </div>
                    )}
                    
                    <div className="text-[11px] text-on-surface-variant mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-surface-container-low border-t border-outline-variant shrink-0">
        {!otherPubkey ? (
          <div className="text-center p-2 text-error font-label-md bg-error/10 rounded-xl">
            User hasn't enabled DMs yet. They need to unlock DMs in their inbox first.
          </div>
        ) : (
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant/50 rounded-full pl-4 pr-1 py-1 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all w-full"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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
        )}
      </div>

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
  );
}

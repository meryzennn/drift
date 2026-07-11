"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import bs58 from "bs58";
import { deriveChatKeypair } from "@/utils/encryption";
import toast from "react-hot-toast";

export default function MessagesHub() {
  const { publicKey, signMessage } = useWallet();
  const router = useRouter();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Check if we have the derived secret key in memory/sessionStorage
    const savedSecret = sessionStorage.getItem(`drift_chat_secret_${publicKey?.toString()}`);
    if (savedSecret) {
      setIsAuthenticated(true);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey && isAuthenticated) {
      fetchConversations();
      
      const sub = supabase
        .channel('conversations_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
          fetchConversations();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [publicKey, isAuthenticated]);

  const fetchConversations = async () => {
    if (!publicKey) return;
    try {
      const wallet = publicKey.toString();
      
      const [{ data }, { data: notifData }] = await Promise.all([
        supabase
          .from('conversations')
          .select(`
            id,
            user1_wallet,
            user2_wallet,
            last_message_at,
            user1:users!conversations_user1_wallet_fkey(wallet_address, username, display_name, avatar_url),
            user2:users!conversations_user2_wallet_fkey(wallet_address, username, display_name, avatar_url)
          `)
          .or(`user1_wallet.eq.${wallet},user2_wallet.eq.${wallet}`)
          .order('last_message_at', { ascending: false }),
        
        supabase
          .from('notifications')
          .select('actor_wallet')
          .eq('user_wallet', wallet)
          .eq('type', 'message')
          .eq('is_read', false)
      ]);

      if (data) setConversations(data);
      
      const counts: Record<string, number> = {};
      if (notifData) {
        notifData.forEach((n) => {
          counts[n.actor_wallet] = (counts[n.actor_wallet] || 0) + 1;
        });
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage) {
      toast.error("Wallet not connected or does not support message signing");
      return;
    }
    
    setAuthLoading(true);
    try {
      // 1. Sign deterministic message
      const message = new TextEncoder().encode("Authenticate Drift E2EE Chat\n\nSigning this message allows Drift to generate a secure encryption key for your Direct Messages. It does not cost any SOL.");
      const signature = await signMessage(message);
      
      // 2. Derive Keypair
      const keypair = deriveChatKeypair(signature);
      
      // 3. Save secret to session storage
      sessionStorage.setItem(`drift_chat_secret_${publicKey.toString()}`, keypair.secretKey);
      
      // 4. Update user profile with public key if not already set
      await supabase
        .from('users')
        .update({ chat_pubkey: keypair.publicKey })
        .eq('wallet_address', publicKey.toString());
        
      setIsAuthenticated(true);
      toast.success("DMs unlocked!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to authenticate DMs");
    } finally {
      setAuthLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="w-full min-w-0 flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4">account_balance_wallet</span>
        <h2 className="font-headline-sm font-bold text-on-surface mb-2 w-full">Connect Wallet</h2>
        <p className="font-body-md text-on-surface-variant max-w-md w-full mx-auto">Connect your Solana wallet to view and send direct messages.</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full min-w-0 flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 shrink-0">
          <span className="material-symbols-outlined text-[40px] text-primary">enhanced_encryption</span>
        </div>
        <h2 className="font-headline-md font-bold text-on-surface mb-3 w-full">End-to-End Encrypted DMs</h2>
        <p className="font-body-md text-on-surface-variant max-w-md w-full mx-auto mb-8">
          Drift uses full Web3 encryption. Your messages are completely private and cannot be read by anyone else, not even the server.
        </p>
        <button
          onClick={handleAuthenticate}
          disabled={authLoading}
          className="px-6 py-3 bg-primary text-on-primary font-label-lg font-bold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {authLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin">sync</span>
              Unlocking...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">lock_open</span>
              Unlock Messages
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-[100%] max-w-2xl mx-auto py-6 min-h-screen" style={{ minWidth: 'min(100%, 500px)' }}>
      <div className="w-full min-w-[100%] flex items-center justify-between mb-8">
        <h1 className="w-full font-headline-lg font-bold text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[32px]">forum</span>
          Messages
        </h1>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 w-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 w-full bg-surface-container-high rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="w-full text-center py-20 bg-surface-container-low rounded-3xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4 opacity-50">speaker_notes_off</span>
          <h3 className="font-headline-sm font-bold text-on-surface mb-2 w-full">No messages yet</h3>
          <p className="font-body-md text-on-surface-variant w-full mx-auto">Go to a mutual follower's profile to start chatting.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full min-w-full">
          {conversations.map(convo => {
            const isUser1 = convo.user1_wallet === publicKey.toString();
            const otherUser = isUser1 ? convo.user2 : convo.user1;
            
            return (
              <Link 
                key={convo.id}
                href={`/messages/${convo.id}`}
                className="w-full min-w-full flex items-center gap-4 p-4 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/50 rounded-2xl transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-surface-container-highest overflow-hidden shrink-0 border border-outline-variant">
                  {otherUser.avatar_url ? (
                    <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg bg-primary/20 text-primary">
                      {otherUser.display_name?.slice(0, 2).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-label-lg font-bold text-on-surface truncate group-hover:text-primary transition-colors flex items-center gap-2">
                      {otherUser.display_name}
                      {unreadCounts[otherUser.wallet_address] > 0 && (
                        <span className="w-2 h-2 rounded-full bg-error inline-block shrink-0"></span>
                      )}
                    </span>
                    <span className="font-body-sm text-on-surface-variant shrink-0 ml-2">
                      {new Date(convo.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span className={`font-body-md truncate ${unreadCounts[otherUser.wallet_address] > 0 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>
                      @{otherUser.username}
                    </span>
                    {unreadCounts[otherUser.wallet_address] > 0 && (
                      <div className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        {unreadCounts[otherUser.wallet_address]}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

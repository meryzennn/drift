"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { createPortal } from "react-dom";

interface UserProfile {
  wallet_address: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface FollowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "followers" | "following";
  targetWallet: string;
}

export default function FollowsModal({ isOpen, onClose, type, targetWallet }: FollowsModalProps) {
  const { publicKey, connected } = useWallet();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Set of wallets that the current logged in user is following
  const [myFollows, setMyFollows] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, targetWallet, type, publicKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get the list of wallets based on type
      let wallets: string[] = [];
      
      if (type === "followers") {
        const { data } = await supabase
          .from("follows")
          .select("follower_wallet")
          .eq("following_wallet", targetWallet);
        if (data) wallets = data.map(d => d.follower_wallet);
      } else {
        const { data } = await supabase
          .from("follows")
          .select("following_wallet")
          .eq("follower_wallet", targetWallet);
        if (data) wallets = data.map(d => d.following_wallet);
      }

      // 2. Fetch their user profiles
      if (wallets.length > 0) {
        const { data: profiles } = await supabase
          .from("users")
          .select("wallet_address, username, display_name, avatar_url")
          .in("wallet_address", wallets);
          
        if (profiles) setUsers(profiles);
      } else {
        setUsers([]);
      }

      // 3. If current user is logged in, fetch who they follow among these wallets
      if (publicKey && wallets.length > 0) {
        const { data: myFollowData } = await supabase
          .from("follows")
          .select("following_wallet")
          .eq("follower_wallet", publicKey.toString())
          .in("following_wallet", wallets);
          
        if (myFollowData) {
          const followSet = new Set(myFollowData.map(d => d.following_wallet));
          setMyFollows(followSet);
        }
      }
    } catch (error) {
      console.error("Error fetching follows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (walletToToggle: string) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet to follow users.");
      return;
    }

    setToggling(prev => new Set(prev).add(walletToToggle));
    const isFollowing = myFollows.has(walletToToggle);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_wallet", publicKey.toString())
          .eq("following_wallet", walletToToggle);
        
        if (error) throw error;
        
        setMyFollows(prev => {
          const next = new Set(prev);
          next.delete(walletToToggle);
          return next;
        });
      } else {
        const { error } = await supabase
          .from("follows")
          .insert([{
            follower_wallet: publicKey.toString(),
            following_wallet: walletToToggle
          }]);
          
        if (error) throw error;
        
        setMyFollows(prev => {
          const next = new Set(prev);
          next.add(walletToToggle);
          return next;
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update follow status.");
    } finally {
      setToggling(prev => {
        const next = new Set(prev);
        next.delete(walletToToggle);
        return next;
      });
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[32rem] bg-[#0f0f13] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-[#2a2a3a] shrink-0">
          <h2 className="font-headline-sm font-bold text-on-surface capitalize">{type}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-md flex flex-col gap-sm">
          {loading ? (
            <div className="text-center py-xl text-on-surface-variant font-body-md">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant font-body-md">No {type} found.</div>
          ) : (
            users.map((user) => {
              const isMe = connected && publicKey?.toString() === user.wallet_address;
              const isFollowing = myFollows.has(user.wallet_address);
              const isToggling = toggling.has(user.wallet_address);

              return (
                <div key={user.wallet_address} className="flex items-center gap-md p-sm hover:bg-surface-container-low rounded-xl transition-colors">
                  <Link href={`/profile/${user.username || user.wallet_address}`} onClick={onClose} className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center font-bold text-primary hover:opacity-80 transition-opacity">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.wallet_address.slice(0, 2)
                    )}
                  </Link>
                  
                  <div className="flex-1 overflow-hidden">
                    <Link href={`/profile/${user.username || user.wallet_address}`} onClick={onClose} className="font-label-lg text-on-surface hover:underline truncate block">
                      {user.display_name || "Anonymous User"}
                    </Link>
                    <Link href={`/profile/${user.username || user.wallet_address}`} onClick={onClose} className="font-mono text-[14px] text-on-surface-variant hover:underline truncate block">
                      @{user.username || formatAddress(user.wallet_address)}
                    </Link>
                  </div>

                  {!isMe && (
                    <button
                      onClick={() => handleToggleFollow(user.wallet_address)}
                      disabled={isToggling}
                      className={`px-4 py-1.5 rounded-full font-label-sm transition-colors disabled:opacity-50 shrink-0 ${
                        isFollowing 
                          ? "border border-outline-variant text-on-surface hover:border-error hover:text-error hover:bg-error/10" 
                          : "bg-on-surface text-surface hover:bg-on-surface/90"
                      }`}
                    >
                      {isToggling ? "Wait..." : isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

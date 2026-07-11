"use client";

import Image from "next/image";
import { Post } from "@/types";
import PostCard from "@/components/PostCard";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalTipped, setTotalTipped] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      router.push("/");
      return;
    }

    if (publicKey) {
      fetchProfileData(publicKey.toString());
    }
  }, [connected, publicKey, router]);

  const fetchProfileData = async (wallet: string) => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", wallet)
        .maybeSingle();
        
      if (userError) throw userError;
      
      if (!userData) {
        router.push("/setup-profile");
        return;
      }
        
      setProfile(userData);

      // Fetch user posts
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          media_url,
          created_at,
          likes,
          author_wallet
        `)
        .eq("author_wallet", wallet)
        .order("created_at", { ascending: false });

      if (postsData) {
        const formattedPosts: Post[] = postsData.map((p: any) => ({
          id: p.id,
          authorPublicKey: p.author_wallet,
          content: p.content,
          imageUrl: p.media_url,
          createdAt: p.created_at,
          likes: p.likes,
          authorProfile: userData ? {
            username: userData.username,
            displayName: userData.display_name,
            avatarUrl: userData.avatar_url,
          } : undefined,
        }));
        setPosts(formattedPosts);
      }

      // Fetch total tipped received (as an example)
      const { data: tipsData } = await supabase
        .from("tips")
        .select("amount")
        .eq("to_wallet", wallet);
        
      if (tipsData) {
        const total = tipsData.reduce((acc, tip) => acc + tip.amount, 0);
        setTotalTipped(total);
      }
      
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected) return null;

  if (loading) {
    return <div className="p-xl text-center text-on-surface-variant font-body-md">Loading profile...</div>;
  }

  return (
    <div className="flex flex-col border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
      {/* Header Banner */}
      <div className="h-48 md:h-64 w-full bg-surface-container-high relative border-b border-outline-variant">
        <div 
          className="w-full h-full bg-cover bg-center opacity-80" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')" }}
        ></div>
        {/* Avatar */}
        <div className="absolute -bottom-16 left-4 md:left-6 rounded-full border-4 border-background bg-surface-bright w-32 h-32 overflow-hidden shadow-none flex items-center justify-center text-4xl font-bold text-on-surface">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            publicKey?.toString().slice(0, 2)
          )}
        </div>
      </div>
      
      {/* Profile Info Section */}
      <div className="pt-20 px-4 md:px-6 pb-6 border-b border-outline-variant">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg md:text-headline-lg text-on-background font-bold tracking-tight">{profile?.display_name || "Anonymous User"}</h1>
            <p className="font-mono text-[14px] text-outline mt-1 flex items-center gap-1">
              @{profile?.username || formatAddress(publicKey?.toString() || "")}
              <span 
                className="material-symbols-outlined text-[14px] text-surface-tint cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(publicKey?.toString() || "");
                  alert("Wallet address copied!");
                }}
              >
                content_copy
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push("/profile/edit")}
              className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-lg font-label-md transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Profile
            </button>
          </div>
        </div>
        <p className="font-body-md text-on-surface-variant mb-6 leading-relaxed max-w-2xl">
          Welcome to your decentralised profile on Drift. 
        </p>
        
        {/* Stats */}
        <div className="flex gap-6 mb-2">
          <div className="flex gap-1 items-baseline ml-auto">
            <span className="material-symbols-outlined text-[16px] text-surface-tint translate-y-0.5">payments</span>
            <span className="font-label-md text-surface-tint font-bold">{totalTipped} SOL</span>
            <span className="font-body-sm text-outline">Total Tips Received</span>
          </div>
        </div>
      </div>
      
      {/* Profile Tabs */}
      <div className="flex border-b border-outline-variant px-4 md:px-6 overflow-x-auto hide-scrollbar sticky top-16 md:top-0 bg-background z-30">
        <button className="px-4 py-4 font-label-md font-bold text-primary border-b-2 border-primary whitespace-nowrap">
          My Posts
        </button>
      </div>

      {/* Feed Content */}
      <div className="p-md bg-background">
        {posts.length === 0 ? (
          <div className="text-center py-xl text-on-surface-variant font-body-md">You haven't posted anything yet.</div>
        ) : (
          <div className="flex flex-col gap-md">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

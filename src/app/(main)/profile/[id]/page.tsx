"use client";

import Image from "next/image";
import Link from "next/link";
import { Post } from "@/types";
import PostCard from "@/components/PostCard";
import { useState, useEffect, use } from "react";
import { createPortal } from "react-dom";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import FollowsModal from "@/components/FollowsModal";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import NFTGrid from "@/components/NFTGrid";
import SendTipModal from "@/components/SendTipModal";
import { sendTip } from "@/utils/solanaUtils";
import ProfileSkeleton from "@/components/skeletons/ProfileSkeleton";

export default function DynamicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Post[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tippedItems, setTippedItems] = useState<{ type: "post" | "profile"; post?: Post; recipient?: any; wallet?: string; amount: number; createdAt: string; id: string }[]>([]);
  const [totalTipped, setTotalTipped] = useState(0);
  const [totalTippedUsd, setTotalTippedUsd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "replies" | "media" | "tips" | "nfts" | "transactions">("posts");
  const [notFound, setNotFound] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followsModalConfig, setFollowsModalConfig] = useState<{isOpen: boolean, type: "followers" | "following"}>({isOpen: false, type: "followers"});
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [topTippers, setTopTippers] = useState<any[]>([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(topTippers.length / itemsPerPage);
  const displayedTippers = topTippers.slice((leaderboardPage - 1) * itemsPerPage, leaderboardPage * itemsPerPage);

  // Fetch live SOL price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
        const data = await res.json();
        if (data?.price) {
          setSolPrice(parseFloat(data.price));
        } else {
          throw new Error("Invalid Binance response");
        }
      } catch {
        try {
          const res2 = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
          const data2 = await res2.json();
          if (data2?.solana?.usd) {
            setSolPrice(parseFloat(data2.solana.usd));
          } else {
            throw new Error("Invalid CoinGecko response");
          }
        } catch {
          setSolPrice(null);
        }
      }
    };
    fetchPrice();
  }, []);

  // Prevent scroll bleed when modal is open
  useEffect(() => {
    if (isLeaderboardOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isLeaderboardOpen]);

  useEffect(() => {
    if (id) {
      fetchProfileData(id);
    }
  }, [id, publicKey]);

  const fetchProfileData = async (identifier: string) => {
    try {
      setLoading(true);
      setNotFound(false);
      
      // Fetch user profile (by username OR wallet_address)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .or(`username.eq.${identifier},wallet_address.eq.${identifier}`)
        .maybeSingle();
        
      if (userError) throw userError;
      
      if (!userData) {
        setNotFound(true);
        return;
      }
        
      setProfile(userData);
      const wallet = userData.wallet_address;

      // Fetch user posts
      const { data: postsData } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("author_wallet", wallet)
        .is("reply_to_post_id", null)
        .order("created_at", { ascending: false });

      let allPosts: Post[] = [];

      if (postsData) {
        allPosts = [...postsData.map(mapPostData)];
      }

      // Fetch user reposts
      const { data: repostsData } = await supabase
        .from("reposts")
        .select(`
          created_at,
          posts (
            ${POST_SELECT_QUERY}
          )
        `)
        .eq("user_wallet", wallet)
        .order("created_at", { ascending: false });

      if (repostsData) {
        const formattedReposts: Post[] = repostsData
          .filter((r: any) => r.posts)
          .map((r: any) => ({
            ...mapPostData(r.posts),
            isRepost: true,
            repostedBy: userData.display_name || userData.username || "Someone",
            reposterWallet: userData.wallet_address,
            createdAt: r.created_at // Use repost date for sorting
          }));
        allPosts = [...allPosts, ...formattedReposts];
      }

      // Fetch user mentions
      const { data: mentionsData } = await supabase
        .from("notifications")
        .select(`
          created_at,
          posts!notifications_post_id_fkey(${POST_SELECT_QUERY})
        `)
        .eq("user_wallet", wallet)
        .eq("type", "mention")
        .order("created_at", { ascending: false });

      if (mentionsData) {
        const formattedMentions = mentionsData
          .filter((m: any) => m.posts)
          .map((m: any) => mapPostData(Array.isArray(m.posts) ? m.posts[0] : m.posts));
        
        const uniqueMentions = Array.from(new Map(formattedMentions.map(p => [p.id, p])).values());
        allPosts = [...allPosts, ...uniqueMentions];
      }

      const uniqueAllPosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());
      uniqueAllPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(uniqueAllPosts);

      // Fetch user replies
      const { data: repliesData } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("author_wallet", wallet)
        .not("reply_to_post_id", "is", null)
        .order("created_at", { ascending: false });

      if (repliesData) {
        setReplies(repliesData.map(mapPostData));
      }

      // Fetch Solana transactions
      try {
        const pubKey = new PublicKey(wallet);
        const sigs = await connection.getSignaturesForAddress(pubKey, { limit: 20 });
        setTransactions(sigs);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      }

      // Fetch total tipped received and leaderboards
      const { data: tipsData } = await supabase
        .from("tips")
        .select(`
          amount,
          amount_usd,
          from_wallet,
          sender:users!tips_from_wallet_fkey(username, display_name, avatar_url)
        `)
        .eq("to_wallet", wallet);
        
      if (tipsData) {
        const total = tipsData.reduce((acc, tip) => acc + tip.amount, 0);
        const totalUsd = tipsData.reduce((acc, tip) => acc + (tip.amount_usd || 0), 0);
        setTotalTipped(total);
        setTotalTippedUsd(totalUsd);

        // Aggregate top tippers
        const tipperMap = new Map<string, any>();
        tipsData.forEach(tip => {
          if (!tip.from_wallet || !tip.sender) return;
          const current = tipperMap.get(tip.from_wallet) || {
            wallet: tip.from_wallet,
            username: (tip.sender as any).username,
            display_name: (tip.sender as any).display_name,
            avatar_url: (tip.sender as any).avatar_url,
            total_amount: 0,
            total_amount_usd: 0
          };
          current.total_amount += tip.amount;
          current.total_amount_usd += (tip.amount_usd || 0);
          tipperMap.set(tip.from_wallet, current);
        });

        const sortedTippers = Array.from(tipperMap.values())
          .sort((a, b) => b.total_amount - a.total_amount);
          
        setTopTippers(sortedTippers);
      }

      // Fetch posts and profiles tipped BY this user (as sender)
      const { data: tipNotifs } = await supabase
        .from("notifications")
        .select(`
          id,
          amount,
          created_at,
          post_id,
          user_wallet,
          post:posts!notifications_post_id_fkey(${POST_SELECT_QUERY}),
          recipient:users!notifications_user_wallet_fkey(username, display_name, avatar_url)
        `)
        .eq("actor_wallet", wallet)
        .eq("type", "tip")
        .order("created_at", { ascending: false });

      if (tipNotifs) {
        const mapped = tipNotifs.map((t: any) => {
          if (t.post) {
            return {
              type: "post" as const,
              id: t.id,
              post: mapPostData(Array.isArray(t.post) ? t.post[0] : t.post),
              amount: t.amount || 0,
              createdAt: t.created_at,
            };
          } else {
            return {
              type: "profile" as const,
              id: t.id,
              recipient: Array.isArray(t.recipient) ? t.recipient[0] : t.recipient,
              wallet: t.user_wallet,
              amount: t.amount || 0,
              createdAt: t.created_at,
            };
          }
        });
        setTippedItems(mapped);
      }
      
      // Fetch follow stats
      const [{ count: fCount }, { count: flCount }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_wallet", wallet),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_wallet", wallet)
      ]);
      setFollowersCount(fCount || 0);
      setFollowingCount(flCount || 0);

      // Check if current user is following this profile
      if (publicKey) {
        const { data: followData } = await supabase
          .from("follows")
          .select("created_at")
          .eq("follower_wallet", publicKey.toString())
          .eq("following_wallet", wallet)
          .maybeSingle();
        setIsFollowing(!!followData);
        
        const { data: followBackData } = await supabase
          .from("follows")
          .select("created_at")
          .eq("follower_wallet", wallet)
          .eq("following_wallet", publicKey.toString())
          .maybeSingle();
        setIsMutualFollow(!!followData && !!followBackData);
      }
      
    } catch (error) {
      console.error("Error fetching profile:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async () => {
    if (!publicKey || !profile) return;
    try {
      const { data: existingConvos, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_wallet.eq.${publicKey.toString()},user2_wallet.eq.${profile.wallet_address}),and(user1_wallet.eq.${profile.wallet_address},user2_wallet.eq.${publicKey.toString()})`);
        
      if (fetchError) throw fetchError;
      
      if (existingConvos && existingConvos.length > 0) {
        router.push(`/messages/${existingConvos[0].id}`);
      } else {
        const { data: newConvo, error: createError } = await supabase
          .from('conversations')
          .insert({
            user1_wallet: publicKey.toString(),
            user2_wallet: profile.wallet_address
          })
          .select('id')
          .single();
          
        if (createError) throw createError;
        if (newConvo) router.push(`/messages/${newConvo.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to open messages");
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleFollowToggle = async () => {
    if (!connected || !publicKey) {
      toast.error("Connect wallet to follow.");
      return;
    }
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_wallet", publicKey.toString())
          .eq("following_wallet", profile.wallet_address);
          
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("follows")
          .insert([{
            follower_wallet: publicKey.toString(),
            following_wallet: profile.wallet_address
          }]);
          
        if (error) throw error;
        
        // Send notification
        if (publicKey.toString() !== profile.wallet_address) {
          await supabase.from("notifications").insert([{
            user_wallet: profile.wallet_address,
            actor_wallet: publicKey.toString(),
            type: "follow"
          }]);
        }

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update follow status.");
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <span className="material-symbols-outlined text-[64px] text-outline-variant">person_off</span>
        <h1 className="text-2xl font-bold text-on-surface">Profile Not Found</h1>
        <p className="text-on-surface-variant text-center">The profile you are looking for does not exist or the username is incorrect.</p>
      </div>
    );
  }

  // Check if the logged-in user is the owner of this profile
  const isOwner = connected && publicKey?.toString() === profile?.wallet_address;

  return (
    <div className="flex flex-col border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
      {/* Header Banner */}
      <div className="h-48 md:h-64 w-full bg-surface-container-high relative border-b border-outline-variant">
        <div 
          className="w-full h-full bg-cover bg-center opacity-80" 
          style={{ backgroundImage: `url('${profile?.banner_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"}')` }}
        ></div>
        {/* Avatar */}
        <div className="absolute -bottom-16 left-4 md:left-6 rounded-full border-4 border-background bg-surface-bright w-32 h-32 overflow-hidden shadow-none flex items-center justify-center text-4xl font-bold text-on-surface">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            profile?.wallet_address?.slice(0, 2) || "U"
          )}
        </div>
      </div>
      
      {/* Profile Info Section */}
      <div className="pt-20 px-4 md:px-6 pb-6 border-b border-outline-variant">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-y-4">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-xs flex-wrap">
              <h1 className="font-headline-lg text-headline-lg md:text-headline-lg text-on-background font-bold tracking-tight break-all">{profile?.display_name || "Anonymous User"}</h1>
              <span className="material-symbols-outlined text-[24px] text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <p className="font-mono text-[14px] text-outline mt-1 flex items-center gap-1 flex-wrap">
              @{profile?.username || formatAddress(profile?.wallet_address || "")}
              <span 
                className="material-symbols-outlined text-[14px] text-surface-tint cursor-pointer shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(profile?.wallet_address || "");
                  toast.success("Wallet address copied!");
                }}
              >
                content_copy
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-start sm:justify-end w-full sm:w-auto">
            {isOwner ? (
              <button 
                onClick={() => router.push("/profile/edit")}
                className="px-3 py-1.5 md:px-4 md:py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-full font-label-sm md:font-label-md transition-colors flex items-center gap-1.5 md:gap-2"
              >
                <span className="material-symbols-outlined text-[16px] md:text-[18px]">edit</span>
                Edit Profile
              </button>
            ) : (
              <>
                {isMutualFollow && (
                  <button 
                    onClick={handleMessageClick}
                    className="w-[38px] h-[38px] border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center shrink-0"
                    title="Send Message"
                  >
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsDonateOpen(true)}
                  className="px-4 py-2 border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-lg font-label-md transition-colors flex items-center gap-2"
                >
                  <svg className="w-[18px] h-[18px] fill-current shrink-0" viewBox="0 0 397 311" xmlns="http://www.w3.org/2000/svg"><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" /><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" /><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" /></svg>
                  Donate
                </button>
                <button 
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-label-md transition-colors disabled:opacity-50 ${isFollowing ? "border border-outline-variant text-on-surface hover:border-error hover:text-error hover:bg-error/10" : "bg-primary text-on-primary hover:bg-primary/90"}`}
                >
                  {followLoading ? "Wait..." : isFollowing ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>
        <p className="font-body-md text-on-surface-variant mb-4 leading-relaxed max-w-[42rem] whitespace-pre-wrap">
          {profile?.bio || "Welcome to your decentralised profile on Drift."}
        </p>

        {/* Stats */}
        <div className="flex gap-4 md:gap-6 mb-4 items-center">
          <button 
            onClick={() => setFollowsModalConfig({ isOpen: true, type: "following" })}
            className="flex items-baseline gap-1 group cursor-pointer"
          >
            <span className="font-label-lg font-bold text-on-surface group-hover:underline">{followingCount}</span>
            <span className="font-body-sm text-on-surface-variant group-hover:underline">Following</span>
          </button>
          <button 
            onClick={() => setFollowsModalConfig({ isOpen: true, type: "followers" })}
            className="flex items-baseline gap-1 group cursor-pointer"
          >
            <span className="font-label-lg font-bold text-on-surface group-hover:underline">{followersCount}</span>
            <span className="font-body-sm text-on-surface-variant group-hover:underline">Followers</span>
          </button>
        </div>

        {/* Social Links Badges */}
        <div className="flex flex-wrap gap-sm mb-6">
          {profile?.x_link && (
            <a href={`https://x.com/${profile.x_link}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-xs px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-full text-on-surface font-label-sm transition-colors">
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @{profile.x_link}
            </a>
          )}
          {profile?.telegram_link && (
            <a href={`https://t.me/${profile.telegram_link}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-xs px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-full text-on-surface font-label-sm transition-colors">
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              @{profile.telegram_link}
            </a>
          )}
          {profile?.instagram_link && (
            <a href={`https://instagram.com/${profile.instagram_link}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-xs px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-full text-on-surface font-label-sm transition-colors">
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              @{profile.instagram_link}
            </a>
          )}
          {profile?.custom_link && (
            <a href={profile.custom_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-xs px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-full text-on-surface font-label-sm transition-colors">
              <span className="material-symbols-outlined text-[14px]">link</span>
              Link
            </a>
          )}
          {profile?.wallet_address && (
            <a href={`https://solscan.io/account/${profile.wallet_address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-xs px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-full text-on-surface font-label-sm transition-colors">
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              Solscan
            </a>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <button 
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-2 ml-auto px-3 md:px-4 py-1.5 md:py-2 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/50 rounded-full transition-all group shrink-0 whitespace-nowrap"
          >
            <div className="flex items-center gap-1 md:gap-1.5 bg-surface-container-highest group-hover:bg-primary/20 px-2 py-0.5 rounded text-surface-tint group-hover:text-primary transition-colors shrink-0">
              <svg className="w-[18px] h-[14px] fill-current shrink-0" viewBox="0 0 397 311" xmlns="http://www.w3.org/2000/svg"><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" /><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" /><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" /></svg>
              <span className="font-label-sm md:font-label-md font-bold">{parseFloat(totalTipped.toFixed(3))} SOL</span>
            </div>
            <span className="font-label-sm text-on-surface-variant group-hover:text-on-surface transition-colors ml-1">Total Tips Received</span>
          </button>
        </div>
      </div>
      
      {/* Profile Tabs */}
      <div className="flex w-full border-b border-outline-variant overflow-x-auto hide-scrollbar sticky top-16 md:top-0 bg-background z-30">
        <button 
          onClick={() => setActiveTab("posts")}
          className={`shrink-0 md:flex-1 px-4 py-4 font-label-md font-bold whitespace-nowrap transition-colors text-center border-b-2 ${activeTab === "posts" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest"}`}
        >
          Posts
        </button>
        <button 
          onClick={() => setActiveTab("replies")}
          className={`shrink-0 md:flex-1 px-4 py-4 font-label-md font-bold whitespace-nowrap transition-colors text-center border-b-2 ${activeTab === "replies" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest"}`}
        >
          Replies
        </button>
        <button 
          onClick={() => setActiveTab("media")}
          className={`shrink-0 md:flex-1 px-4 py-4 font-label-md font-bold whitespace-nowrap transition-colors text-center border-b-2 ${activeTab === "media" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest"}`}
        >
          Media
        </button>
        <button 
          onClick={() => setActiveTab("nfts")}
          className={`shrink-0 md:flex-1 px-4 py-4 font-label-md font-bold whitespace-nowrap transition-colors text-center border-b-2 ${activeTab === "nfts" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest"}`}
        >
          NFTs
        </button>
        <button 
          onClick={() => setActiveTab("tips")}
          className={`shrink-0 md:flex-1 px-4 py-4 font-label-md font-bold whitespace-nowrap transition-colors text-center border-b-2 ${activeTab === "tips" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest"}`}
        >
          Tips
        </button>
        <button 
          onClick={() => setActiveTab("transactions")}
          className={`shrink-0 md:flex-1 px-4 py-4 font-label-md font-bold whitespace-nowrap transition-colors text-center border-b-2 ${activeTab === "transactions" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest"}`}
        >
          Transactions
        </button>
      </div>

      {/* Feed Content */}
      <div className="p-md bg-background">
        {activeTab === "posts" && (
          posts.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant font-body-md">User hasn't posted anything yet.</div>
          ) : (
            <div className="flex flex-col gap-md">
              {posts.map((post, index) => (
                <PostCard key={`post-${post.id}-${index}`} post={post} />
              ))}
            </div>
          )
        )}
        
        {activeTab === "replies" && (
          replies.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant font-body-md">User hasn't replied to anything yet.</div>
          ) : (
            <div className="flex flex-col gap-md">
              {replies.map((reply, index) => (
                <PostCard key={`reply-${reply.id}-${index}`} post={reply} />
              ))}
            </div>
          )
        )}

        {activeTab === "transactions" && (
          transactions.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant font-body-md">No recent transactions found.</div>
          ) : (
            <div className="flex flex-col gap-sm">
              {transactions.map((tx, index) => (
                <div key={`tx-${tx.signature}-${index}`} className="p-4 border border-outline-variant rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!tx.err ? 'bg-[#00BA7C]/10 text-[#00BA7C]' : 'bg-error/10 text-error'}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {!tx.err ? 'check_circle' : 'cancel'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-md font-bold text-on-surface flex items-center gap-2 truncate">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        {!tx.err ? (
                          <span className="text-[10px] bg-[#00BA7C]/20 text-[#00BA7C] px-2 py-0.5 rounded-full shrink-0">Success</span>
                        ) : (
                          <span className="text-[10px] bg-error/20 text-error px-2 py-0.5 rounded-full shrink-0">Failed</span>
                        )}
                      </span>
                      {tx.blockTime && (
                        <span className="font-body-sm text-on-surface-variant truncate">
                          {new Date(tx.blockTime * 1000).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <a 
                    href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-full text-on-surface font-label-sm transition-colors w-fit sm:w-auto shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Solscan
                  </a>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "media" && (
          posts.filter(p => p.imageUrl && !p.isRepost && p.authorPublicKey === profile?.wallet_address).length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant font-body-md">No media posts found.</div>
          ) : (
            <div className="flex flex-col gap-md">
              {posts.filter(p => p.imageUrl && !p.isRepost && p.authorPublicKey === profile?.wallet_address).map((post, index) => (
                <PostCard key={`media-${post.id}-${index}`} post={post} />
              ))}
            </div>
          )
        )}

        {activeTab === "nfts" && profile && (
          <NFTGrid 
            walletAddress={profile.wallet_address} 
            featuredNfts={profile.featured_nfts || []} 
          />
        )}

        {activeTab === "tips" && (
          tippedItems.length === 0 ? (
            <div className="text-center py-xl">
              <span className="material-symbols-outlined text-[40px] text-outline mb-sm block">toll</span>
              <p className="text-on-surface-variant font-body-md">No tips sent yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {tippedItems.map((item) => (
                <div key={`tip-${item.id}`}>
                  {item.type === "post" && item.post ? (
                    <PostCard 
                      post={item.post} 
                      tipActivity={{
                        tipperUsername: profile.username || profile.display_name,
                        tipperWallet: profile.wallet_address,
                        amount: item.amount
                      }}
                    />
                  ) : (
                    <div className="p-lg border border-outline-variant rounded-xl bg-surface-container-low flex items-center justify-between">
                      <Link 
                        href={`/profile/${item.recipient?.username || item.wallet}`}
                        className="flex items-center gap-sm hover:opacity-80 transition-opacity group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest shrink-0 border border-outline-variant">
                          {item.recipient?.avatar_url ? (
                            <img src={item.recipient.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/20">
                              {item.recipient?.display_name?.slice(0, 2).toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-md font-bold text-on-surface group-hover:text-primary transition-colors">
                            Donated to {item.recipient?.display_name || "User"}
                          </span>
                          <span className="font-body-sm text-on-surface-variant">
                            @{item.recipient?.username || "anonymous"}
                          </span>
                        </div>
                      </Link>
                      <div className="flex items-center gap-xs bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                        <span className="font-label-md text-primary font-bold">{item.amount} SOL</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

        <FollowsModal 
          isOpen={followsModalConfig.isOpen}
          onClose={() => setFollowsModalConfig({ ...followsModalConfig, isOpen: false })}
          targetWallet={profile?.wallet_address || ""}
          type={followsModalConfig.type}
        />

        {profile && (
          <SendTipModal
            isOpen={isDonateOpen}
            onClose={() => setIsDonateOpen(false)}
            recipientAddress={profile.wallet_address}
            recipientName={profile.display_name}
            recipientAvatar={profile.avatar_url}
            onConfirm={async (amount, amountUsd) => {
              if (!publicKey) return;
              try {
                await sendTip(publicKey, profile.wallet_address, amount, sendTransaction);
                
                // Save tip to Supabase
                const { error: dbError } = await supabase.from("tips").insert([
                  {
                    from_wallet: publicKey.toString(),
                    to_wallet: profile.wallet_address,
                    amount: amount,
                    amount_usd: amountUsd || 0,
                  }
                ]);
                
                if (dbError) {
                  console.error("Tip saved on chain but failed to record in DB:", dbError);
                }

                // Send notification
                if (publicKey.toString() !== profile.wallet_address) {
                  await supabase.from("notifications").insert([{
                    user_wallet: profile.wallet_address,
                    actor_wallet: publicKey.toString(),
                    type: "tip",
                    amount: amount
                  }]);
                }

                toast.success(`Donate of ${amount} SOL sent successfully!`);
                setIsDonateOpen(false);
              } catch (error: any) {
                console.error("Donate failed:", error);
                toast.error(`Failed to donate: ${error?.message || "Unknown error"}`);
              }
            }}
          />
        )}
        
      {/* Leaderboard Modal */}
      {isLeaderboardOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLeaderboardOpen(false)}></div>
          <div className="relative z-10 w-[90vw] md:w-[400px] bg-surface-container border border-outline-variant rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex flex-col p-4 border-b border-outline-variant bg-surface-container-low sticky top-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-headline-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">social_leaderboard</span>
                  Top Tippers
                </h3>
                <button 
                  onClick={() => setIsLeaderboardOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <p className="font-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                Total Received: <span className="font-bold text-surface-tint">{parseFloat(totalTipped.toFixed(3))} SOL</span>
                {totalTippedUsd > 0 ? (
                  <span className="opacity-80">(${totalTippedUsd.toFixed(2)})</span>
                ) : (
                  solPrice && <span className="opacity-80">(${(totalTipped * solPrice).toFixed(2)})</span>
                )}
              </p>
            </div>
            
            {/* List */}
            <div className="overflow-y-auto flex-1 p-2">
              {topTippers.length === 0 ? (
                <div className="text-center py-xl text-on-surface-variant">
                  <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">money_off</span>
                  <p className="font-body-md">No tips received yet.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {displayedTippers.map((tipper, index) => {
                    const actualIndex = (leaderboardPage - 1) * itemsPerPage + index;
                    return (
                    <Link 
                      key={tipper.wallet}
                      href={`/profile/${tipper.username}`}
                      className="flex items-center gap-3 p-3 hover:bg-surface-container-high rounded-xl transition-colors group"
                      onClick={() => setIsLeaderboardOpen(false)}
                    >
                      <div className="w-8 shrink-0 flex justify-center font-bold font-label-lg text-on-surface-variant">
                        #{actualIndex + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden shrink-0 border border-outline-variant/30">
                        {tipper.avatar_url ? (
                          <img src={tipper.avatar_url} alt={tipper.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface font-bold text-sm bg-primary/20 text-primary">
                            {tipper.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-label-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {tipper.display_name || tipper.username}
                        </span>
                        <span className="font-body-sm text-on-surface-variant truncate">
                          @{tipper.username}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <span className="font-label-md font-bold text-surface-tint flex items-center gap-1">
                          <svg className="w-[15px] h-[12px] fill-current shrink-0" viewBox="0 0 397 311" xmlns="http://www.w3.org/2000/svg"><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" /><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" /><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" /></svg>
                          {parseFloat(tipper.total_amount.toFixed(3))}
                        </span>
                        {tipper.total_amount_usd > 0 ? (
                          <span className="font-label-sm text-surface-tint opacity-70">
                            ${tipper.total_amount_usd.toFixed(2)}
                          </span>
                        ) : (
                          solPrice && (
                            <span className="font-label-sm text-surface-tint opacity-70">
                              ${(tipper.total_amount * solPrice).toFixed(2)}
                            </span>
                          )
                        )}
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-outline-variant bg-surface-container-low sticky bottom-0">
                <button
                  disabled={leaderboardPage === 1}
                  onClick={() => setLeaderboardPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-50 text-on-surface font-label-sm transition-colors"
                >
                  Previous
                </button>
                <span className="font-label-sm text-on-surface-variant font-bold">
                  Page {leaderboardPage} of {totalPages}
                </span>
                <button
                  disabled={leaderboardPage === totalPages}
                  onClick={() => setLeaderboardPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-50 text-on-surface font-label-sm transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      </div>
  );
}

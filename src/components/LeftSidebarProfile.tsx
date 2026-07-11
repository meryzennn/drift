"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

interface UserProfile {
  username: string;
  display_name: string;
  avatar_url: string;
}

export default function LeftSidebarProfile() {
  const { publicKey, connected } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("users")
          .select("username, display_name, avatar_url")
          .eq("wallet_address", publicKey.toString())
          .maybeSingle();
        
        if (data) {
          setProfile(data as UserProfile);
        }
      };
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [connected, publicKey]);

  if (!connected || !profile) return null;

  return (
    <Link 
      href={`/profile/${profile.username}`}
      className="mt-auto flex items-center justify-between gap-sm p-sm rounded-full hover:bg-surface-container-high transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-sm overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden shrink-0 border border-outline-variant">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/20">
              {profile.display_name?.slice(0, 2).toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="overflow-hidden">
          <div className="font-label-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">
            {profile.display_name}
          </div>
          <div className="font-body-sm text-[13px] text-on-surface-variant truncate">
            @{profile.username}
          </div>
        </div>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary shrink-0 mr-1">
        more_horiz
      </span>
    </Link>
  );
}

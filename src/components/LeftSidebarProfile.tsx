"use client";

import { useEffect, useState, useRef } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected && publicKey) {
      setIsLoading(true);
      const fetchProfile = async () => {
        try {
          const { data } = await supabase
            .from("users")
            .select("username, display_name, avatar_url")
            .eq("wallet_address", publicKey.toString())
            .maybeSingle();
          
          if (data) {
            setProfile(data as UserProfile);
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  if (!connected && !isLoading) return null;

  if (isLoading || !profile) {
    return (
      <div className="mt-auto flex items-center justify-between gap-sm p-sm rounded-full bg-surface-container-low border border-outline-variant/30 animate-pulse">
        <div className="flex items-center gap-sm overflow-hidden flex-1">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest shrink-0 border border-outline-variant/30"></div>
          <div className="flex flex-col gap-1.5 w-full max-w-[120px] overflow-hidden">
            <div className="h-4 bg-surface-container-highest rounded-full w-24"></div>
            <div className="h-3 bg-surface-container-highest rounded-full w-16"></div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest shrink-0"></div>
      </div>
    );
  }

  return (
    <div className="mt-auto relative" ref={dropdownRef}>
      {isDropdownOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col py-2">
          <Link 
            href="/settings"
            onClick={() => setIsDropdownOpen(false)}
            className="flex items-center gap-sm px-4 py-3 hover:bg-surface-container-highest text-on-surface transition-colors font-label-md w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between gap-sm p-sm rounded-full hover:bg-surface-container-high transition-colors group">
        <Link 
          href={`/profile/${profile.username}`}
          className="flex items-center gap-sm overflow-hidden flex-1 cursor-pointer"
        >
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
        </Link>
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest shrink-0"
        >
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">
            more_horiz
          </span>
        </button>
      </div>
    </div>
  );
}

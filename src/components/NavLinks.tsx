"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";

export default function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications: notifCount, messages: msgCount } = useUnreadNotifications();
  const { publicKey } = useWallet();
  const [myUsername, setMyUsername] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      supabase
        .from("users")
        .select("username")
        .eq("wallet_address", publicKey.toString())
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMyUsername(data.username);
        });
    } else {
      setMyUsername(null);
    }
  }, [publicKey]);

  const links = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "explore" },
    { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
    { href: "/messages", label: "Messages", icon: "mail" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/profile", label: "Profile", icon: "person" },
  ];

  return (
    <nav className="flex flex-col gap-sm">
      {links.map((link) => {
        let isActive = false;
        if (link.href === "/") {
          isActive = pathname === "/";
        } else if (link.href === "/profile") {
          isActive = pathname === "/profile" || (myUsername !== null && pathname === `/profile/${myUsername}`);
        } else {
          isActive = pathname.startsWith(link.href);
        }

        return (
          <Link 
            key={link.href} 
            href={link.href}
            onClick={(e) => {
              // Clear feed scroll cache on explicit navigation
              if (typeof window !== 'undefined') {
                (window as any)._feedCache = { index: {} };
              }
              
              if (isActive) {
                e.preventDefault();
                window.scrollTo(0, 0);
              }
            }}
            className={`flex items-center gap-md px-md py-sm rounded-full cursor-pointer active:scale-[0.97] transition-all duration-200 ${
              isActive 
                ? "text-primary bg-primary-container/10" 
                : "text-on-surface hover:text-primary hover:bg-surface-container-high"
            }`}
          >
            <div className="relative">
              <span 
                className="material-symbols-outlined text-xl" 
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {link.icon}
              </span>
              {link.href === "/notifications" && notifCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-background animate-bounce shadow-sm">
                  {notifCount > 9 ? "9+" : notifCount}
                </div>
              )}
              {link.href === "/messages" && msgCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-background animate-bounce shadow-sm">
                  {msgCount > 9 ? "9+" : msgCount}
                </div>
              )}
            </div>
            <span className="font-label-md">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";

export default function MobileBottomNav() {
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
    { href: "/", icon: "home" },
    { href: "/explore", icon: "explore" },
    { href: "/messages", icon: "mail" },
    { href: "/notifications", icon: "notifications" },
    { href: "/profile", icon: "person" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 w-full bg-background/90 backdrop-blur-md border-t border-outline-variant flex justify-around items-center h-16 pb-safe z-50">
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
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer active:scale-[0.90] transition-all duration-200 ${
              isActive 
                ? "text-primary" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <div className="relative flex flex-col items-center justify-center">
              <span 
                className="material-symbols-outlined text-2xl" 
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {link.icon}
              </span>
              {link.href === "/notifications" && notifCount > 0 && (
                <div className="absolute -top-1 -right-2 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-background animate-bounce shadow-sm">
                  {notifCount > 9 ? "9+" : notifCount}
                </div>
              )}
              {link.href === "/messages" && msgCount > 0 && (
                <div className="absolute -top-1 -right-2 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-background animate-bounce shadow-sm">
                  {msgCount > 9 ? "9+" : msgCount}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

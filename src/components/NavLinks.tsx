"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export default function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadNotifications();

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
        const isActive = pathname === link.href;
        return (
          <Link 
            key={link.href} 
            href={link.href}
            onClick={(e) => {
              if (isActive) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
                router.refresh();
              }
            }}
            className={`flex items-center gap-md px-md py-sm rounded-full cursor-pointer active:opacity-80 transition-all ${
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
              {link.href === "/notifications" && unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-background animate-bounce shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
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

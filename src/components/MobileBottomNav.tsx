"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadNotifications();

  const links = [
    { href: "/", icon: "home" },
    { href: "/explore", icon: "explore" },
    { href: "/notifications", icon: "notifications" },
    { href: "/profile", icon: "person" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 w-full bg-background/90 backdrop-blur-md border-t border-outline-variant flex justify-around items-center h-16 pb-safe z-50">
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
            className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${
              isActive ? "text-primary" : "text-outline hover:text-on-surface"
            }`}
          >
            <div className="relative flex flex-col items-center justify-center">
              <span 
                className="material-symbols-outlined text-2xl" 
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {link.icon}
              </span>
              {link.href === "/notifications" && unreadCount > 0 && (
                <div className="absolute -top-1 -right-2 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-background animate-bounce shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

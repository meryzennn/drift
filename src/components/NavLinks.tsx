"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "explore" },
    { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
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
            className={`flex items-center gap-md px-md py-sm rounded-full cursor-pointer active:opacity-80 transition-all ${
              isActive 
                ? "text-primary bg-primary-container/10" 
                : "text-on-surface hover:text-primary hover:bg-surface-container-high"
            }`}
          >
            <span 
              className="material-symbols-outlined text-xl" 
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {link.icon}
            </span>
            <span className="font-label-md">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

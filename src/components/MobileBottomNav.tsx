"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

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
            className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${
              isActive ? "text-primary" : "text-outline hover:text-on-surface"
            }`}
          >
            <span 
              className="material-symbols-outlined text-2xl" 
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {link.icon}
            </span>
            {isActive && link.icon === "notifications" && (
              <span className="absolute top-3 right-8 w-2 h-2 bg-primary-container rounded-full"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

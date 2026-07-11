"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeftSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "explore" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/profile", label: "Profile", icon: "person" },
  ];

  return (
    <aside className="hidden lg:flex flex-col gap-md py-xl px-md w-64 h-[calc(100vh-4rem)] sticky top-16 border-r border-outline-variant font-label-md text-primary bg-background overflow-y-auto hide-scrollbar">
      <div className="mb-lg">
        <h2 className="font-headline-md text-headline-md text-primary">Navigation</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Manage your decentralised identity</p>
      </div>
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
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <button className="mt-lg bg-primary-container text-on-primary-container w-full py-sm rounded-full font-label-md hover:bg-opacity-90 transition-colors">
        New Post
      </button>
    </aside>
  );
}

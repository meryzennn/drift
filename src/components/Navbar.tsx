"use client";

import CustomWalletButton from "./CustomWalletButton";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full sticky top-0 z-50 bg-background border-b border-outline-variant flex justify-between items-center h-16 px-md md:px-lg mx-auto">
      <Link href="/" className="font-headline-lg-mobile text-headline-lg-mobile font-black text-primary tracking-tighter">
        Drift
      </Link>
      
      {/* Search Bar for Desktop */}
      <div className="hidden md:flex flex-1 max-w-md mx-md relative">
        <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
        <input 
          className="w-full bg-surface-container-low border border-outline-variant rounded-full py-xs pl-xl pr-md text-on-surface font-body-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" 
          placeholder="Search Drift..." 
          type="text" 
        />
      </div>

      <div className="flex items-center gap-sm">
        <CustomWalletButton />
      </div>
    </nav>
  );
}

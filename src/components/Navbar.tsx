"use client";

import CustomWalletButton from "./CustomWalletButton";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full sticky top-0 z-50 bg-background border-b border-outline-variant flex justify-between items-center h-16 px-md md:px-lg mx-auto">
      <Link href="/" className="font-headline-lg-mobile text-headline-lg-mobile font-black text-primary tracking-tighter">
        Drift
      </Link>
      


      <div className="flex items-center gap-sm">
        <CustomWalletButton />
      </div>
    </nav>
  );
}

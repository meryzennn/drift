"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabase";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      if (!connected || !publicKey) return;
      
      const walletAddress = publicKey.toString();
      
      // Check if user exists in Supabase
      const { data, error } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
        
      if (error) {
        console.error("Auth check error details:", error.message, error.code, error.details);
        return;
      }
        
      if (!data) {
        // User does not exist, redirect to setup profile
        if (pathname !== "/setup-profile") {
          router.push("/setup-profile");
        }
      } else {
        // User exists, but is on setup-profile page, redirect to home
        if (pathname === "/setup-profile") {
          router.push("/");
        }
      }
    };

    checkUser();
  }, [connected, publicKey, pathname, router]);

  return <>{children}</>;
}

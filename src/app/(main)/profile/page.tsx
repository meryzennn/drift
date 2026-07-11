"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

export default function ProfileRedirect() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.push("/");
      return;
    }

    if (publicKey) {
      const fetchUsername = async () => {
        const wallet = publicKey.toString();
        const { data } = await supabase
          .from("users")
          .select("username")
          .eq("wallet_address", wallet)
          .maybeSingle();

        if (data?.username) {
          router.push(`/profile/${data.username}`);
        } else {
          router.push(`/profile/${wallet}`);
        }
      };

      fetchUsername();
    }
  }, [connected, publicKey, router]);

  return <div className="p-xl text-center text-on-surface-variant font-body-md">Redirecting...</div>;
}

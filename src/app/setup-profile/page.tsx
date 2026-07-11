"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

export default function SetupProfilePage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If not connected, redirect to home
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    
    setLoading(true);
    setError("");

    try {
      const walletAddress = publicKey.toString();
      
      // Check if username is taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .maybeSingle();
        
      if (existingUser) {
        throw new Error("Username is already taken.");
      }

      // Insert into DB
      const { error: insertError } = await supabase.from("users").insert([
        {
          wallet_address: walletAddress,
          username,
          display_name: displayName,
          has_set_username_once: true,
        },
      ]);

      if (insertError) throw insertError;

      // Success, redirect to home
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to setup profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-md">
      <div className="w-full max-w-[28rem] bg-surface-container border border-outline-variant rounded-2xl p-xl shadow-2xl">
        <h1 className="font-display text-display text-on-surface mb-xs">Welcome to Drift</h1>
        <p className="font-body-md text-on-surface-variant mb-xl">Let's set up your Web3 identity.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <div>
            <label className="block font-label-md text-on-surface mb-xs">Username</label>
            <div className="relative flex items-center">
              <span className="absolute left-md text-on-surface-variant font-label-md">@</span>
              <input
                type="text"
                required
                pattern="[a-zA-Z0-9_]+"
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant rounded-lg py-sm pl-xl pr-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
                placeholder="username"
              />
            </div>
            <p className="font-body-sm text-on-surface-variant mt-xs">Letters, numbers, underscores only.</p>
          </div>

          <div>
            <label className="block font-label-md text-on-surface mb-xs">Display Name</label>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface-container-highest border border-outline-variant rounded-lg py-sm px-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
              placeholder="Display Name"
            />
          </div>

          {error && <div className="text-error font-body-sm bg-error/10 p-sm rounded-lg border border-error/20">{error}</div>}

          <button
            type="submit"
            disabled={loading || !username || !displayName}
            className="w-full bg-primary text-on-primary font-label-md py-md rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-md"
          >
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}

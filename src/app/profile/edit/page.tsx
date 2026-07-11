"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { sendTip } from "@/utils/solanaUtils"; // Using sendTip utility since it just does SystemProgram.transfer

const ADMIN_WALLET_ADDRESS = "FjH23ZJm1Tz7oM7q3K3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q"; // Placeholder
const USERNAME_CHANGE_FEE = 0.05;

export default function EditProfilePage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const router = useRouter();
  
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [hasSetUsernameOnce, setHasSetUsernameOnce] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!connected) {
      router.push("/");
      return;
    }
    
    if (publicKey) {
      fetchProfile(publicKey.toString());
    }
  }, [connected, publicKey, router]);

  const fetchProfile = async (walletAddress: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setUsername(data.username || "");
        setOriginalUsername(data.username || "");
        setDisplayName(data.display_name || "");
        setHasSetUsernameOnce(data.has_set_username_once || false);
      } else {
        router.push("/setup-profile");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    
    setSaving(true);
    setError("");

    try {
      const walletAddress = publicKey.toString();
      let isUsernameChanged = username !== originalUsername;

      if (isUsernameChanged && hasSetUsernameOnce) {
        // Need to pay fee
        const confirmPay = window.confirm(`Changing your username costs ${USERNAME_CHANGE_FEE} SOL. Proceed?`);
        if (!confirmPay) {
          setSaving(false);
          return;
        }

        // Send transaction
        try {
          await sendTip(publicKey, ADMIN_WALLET_ADDRESS, USERNAME_CHANGE_FEE, sendTransaction);
        } catch (txError: any) {
          throw new Error("Transaction failed or was rejected: " + txError.message);
        }
      }

      // Check username availability if changed
      if (isUsernameChanged) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("username")
          .eq("username", username)
          .maybeSingle();
          
        if (existingUser) {
          throw new Error("Username is already taken.");
        }
      }

      // Update DB
      const { error: updateError } = await supabase
        .from("users")
        .update({
          username,
          display_name: displayName,
          has_set_username_once: true,
        })
        .eq("wallet_address", walletAddress);

      if (updateError) throw updateError;

      alert("Profile updated successfully!");
      router.push("/profile");
      
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!connected) return null;
  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Loading profile...</div>;

  return (
    <div className="max-w-[36rem] mx-auto py-2xl px-md">
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-xl shadow-2xl">
        <h1 className="font-display text-[32px] text-on-surface mb-xs">Edit Profile</h1>
        <p className="font-body-md text-on-surface-variant mb-xl">Customize your Web3 identity.</p>

        <form onSubmit={handleSave} className="flex flex-col gap-lg">
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
              />
            </div>
            {hasSetUsernameOnce && username !== originalUsername && (
              <p className="font-body-sm text-primary mt-xs">⚠️ Changing username requires a {USERNAME_CHANGE_FEE} SOL fee.</p>
            )}
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
            />
            <p className="font-body-sm text-on-surface-variant mt-xs">Changing display name is free.</p>
          </div>

          {error && <div className="text-error font-body-sm bg-error/10 p-sm rounded-lg border border-error/20">{error}</div>}

          <div className="flex gap-md mt-md">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-transparent text-on-surface border border-outline-variant font-label-md py-md rounded-lg hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !username || !displayName}
              className="flex-1 bg-primary text-on-primary font-label-md py-md rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

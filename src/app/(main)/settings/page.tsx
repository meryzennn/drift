"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import toast from "react-hot-toast";
import NFTGridSkeleton from "@/components/skeletons/NFTGridSkeleton";

export default function SettingsPage() {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"about" | "nft">("about");
  
  useEffect(() => {
    if (!connected || !publicKey) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch user's current featured NFTs
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("wallet_address", publicKey.toString())
          .maybeSingle();
          
        if (userError) {
          console.warn("Could not fetch featured_nfts (maybe column is missing?):", userError);
        }
        if (userData?.featured_nfts) {
          setSelectedIds(userData.featured_nfts);
        }

        // Fetch user's NFTs
        const res = await fetch(`/api/nfts?owner=${publicKey.toString()}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch NFTs");
        }

        const validNfts = (data.items || []).filter((nft: any) => {
          const img = nft.content?.files?.[0]?.uri || nft.content?.links?.image;
          return !!img;
        });

        setNfts(validNfts);
      } catch (err: any) {
        console.error("Settings load error:", err);
        toast.error("Failed to load settings data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [connected, publicKey]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      if (selectedIds.length >= 10) {
        toast.error("You can only feature up to 10 NFTs.");
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const saveSettings = async () => {
    if (!connected || !publicKey) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ featured_nfts: selectedIds })
        .eq("wallet_address", publicKey.toString());

      if (error) throw error;
      toast.success("Featured NFTs updated successfully!");
    } catch (err: any) {
      console.error("Save error:", err);
      if (err.message && err.message.includes("featured_nfts")) {
        toast.error("Database column missing! Please run the SQL command in Supabase.");
      } else {
        toast.error(err.message || "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-2xl px-6 text-center h-[50vh]">
        <span className="material-symbols-outlined text-[48px] text-outline mb-4">account_balance_wallet</span>
        <h2 className="font-headline-sm font-bold text-on-surface mb-2">Connect Wallet</h2>
        <p className="font-body-md text-on-surface-variant max-w-sm mx-auto">
          Please connect your wallet to manage your featured NFTs and profile settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-2xl">
        <div className="h-8 w-48 bg-surface-container-highest rounded animate-pulse mb-6"></div>
        <NFTGridSkeleton count={10} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-2xl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-outline-variant p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md font-bold text-on-surface">Settings</h1>
          <p className="font-body-sm text-on-surface-variant">Customize your profile and app preferences.</p>
        </div>
        {activeTab === "nft" && (
          <button 
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary rounded-full font-label-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-[18px]">save</span>
            )}
            Save Changes
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 md:px-6 mt-4 border-b border-outline-variant">
        <button 
          onClick={() => setActiveTab("nft")}
          className={`pb-3 font-label-md transition-colors border-b-2 ${activeTab === "nft" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
        >
          NFT Showcase
        </button>
        <button 
          onClick={() => setActiveTab("about")}
          className={`pb-3 font-label-md transition-colors border-b-2 ${activeTab === "about" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
        >
          About
        </button>
      </div>

      <div className="p-4 md:p-6">
        {activeTab === "about" && (
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-6 space-y-6 w-full">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center shrink-0">
                <span className="font-headline-lg font-black tracking-tighter text-[32px] leading-none pb-1">Drift</span>
              </div>
              <div>
                <h2 className="font-headline-sm font-bold text-on-surface">Drift Protocol</h2>
                <p className="font-body-md text-on-surface-variant">Version 1.0.0 (Beta)</p>
              </div>
            </div>
            <div className="h-[1px] bg-outline-variant w-full"></div>
            <div>
              <h3 className="font-label-lg font-bold text-on-surface mb-2">Decentralized Social Network</h3>
              <p className="font-body-md text-on-surface-variant w-full">
                Drift is built on the Solana blockchain, empowering users with full ownership of their data and digital assets. We leverage Blink technology for seamless crypto interactions directly within your social feed.
              </p>
            </div>
            
            <div className="h-[1px] bg-outline-variant w-full"></div>
            <div>
              <h3 className="font-label-lg font-bold text-on-surface mb-4">Legal & Policies</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/terms" className="px-4 py-2 border border-outline-variant rounded-full text-center font-label-md hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                  Terms of Service
                </a>
                <a href="/privacy" className="px-4 py-2 border border-outline-variant rounded-full text-center font-label-md hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">policy</span>
                  Privacy Policy
                </a>
                <a href="/cookie" className="px-4 py-2 border border-outline-variant rounded-full text-center font-label-md hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">cookie</span>
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "nft" && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-headline-sm font-bold text-on-surface">Featured NFTs</h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0}
                  className="px-4 py-1.5 border border-error text-error rounded-full font-label-md hover:bg-error/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Reset
                </button>
                <span className={`font-label-md px-3 py-1 rounded-full ${selectedIds.length === 10 ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {selectedIds.length} / 10 Selected
                </span>
              </div>
            </div>
            
            <p className="font-body-md text-on-surface-variant mb-6">
              Select up to 10 NFTs to be displayed at the very front of your profile's NFT grid. The order you select them in is the order they will appear. Don't forget to save your changes!
            </p>

        {nfts.length === 0 ? (
          <div className="text-center py-xl bg-surface-container-low rounded-2xl border border-outline-variant">
            <span className="material-symbols-outlined text-[40px] text-outline mb-2">image_not_supported</span>
            <p className="font-body-md text-on-surface-variant">No NFTs found in your wallet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {nfts.map((nft) => {
              const imgUrl = nft.content?.files?.[0]?.uri || nft.content?.links?.image;
              const name = nft.content?.metadata?.name || "Unknown NFT";
              const isSelected = selectedIds.includes(nft.id);
              const selectionIndex = selectedIds.indexOf(nft.id) + 1;

              return (
                <div 
                  key={nft.id} 
                  onClick={() => toggleSelection(nft.id)}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    isSelected 
                      ? 'border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' 
                      : 'border-outline-variant hover:border-primary/50 bg-surface-container-low'
                  }`}
                >
                  <div className="aspect-square bg-surface-container-highest relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imgUrl} 
                      alt={name} 
                      className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110 opacity-90' : 'group-hover:scale-110'}`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSIjMmQyZDMzIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+';
                      }}
                    />
                    
                    {/* Selection Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg text-on-primary font-bold">
                          {selectionIndex}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className={`font-label-sm truncate ${isSelected ? 'font-bold text-primary' : 'text-on-surface'}`}>
                      {name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
      )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Tipper {
  actor_wallet: string;
  amount: number;
  amount_usd?: number;
  username?: string;
  avatar_url?: string;
}

interface TipLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postAuthorWallet: string;
}

export default function TipLeaderboardModal({ isOpen, onClose, postId, postAuthorWallet }: TipLeaderboardModalProps) {
  const [tippers, setTippers] = useState<Tipper[]>([]);
  const [totalSol, setTotalSol] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [fallbackSolPrice, setFallbackSolPrice] = useState<number>(145);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    fetchTippers();
    
    // Fetch live SOL price as fallback for older tips that have amount_usd = 0
    fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT")
      .then(res => res.json())
      .then(data => {
        if (data?.price) {
          setFallbackSolPrice(parseFloat(data.price));
        } else {
          throw new Error("Invalid Binance response");
        }
      })
      .catch(() => {
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
          .then(res => res.json())
          .then(data => {
            if (data?.solana?.usd) setFallbackSolPrice(parseFloat(data.solana.usd));
          })
          .catch(() => {});
      });
      
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, postId]);

  const fetchTippers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("actor_wallet, amount, amount_usd, actor:users!notifications_actor_wallet_fkey(username, avatar_url)")
        .eq("user_wallet", postAuthorWallet)
        .eq("type", "tip")
        .eq("post_id", postId)
        .order("amount", { ascending: false });

      if (data && data.length > 0) {
        const mapped: Tipper[] = data.map((t: any) => ({
          actor_wallet: t.actor_wallet,
          amount: t.amount || 0,
          amount_usd: t.amount_usd || 0,
          username: t.actor?.username,
          avatar_url: t.actor?.avatar_url,
        }));
        setTippers(mapped);
        setTotalSol(mapped.reduce((sum, t) => sum + t.amount, 0));
      } else {
        setTippers([]);
        setTotalSol(0);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        style={{ width: "420px", maxWidth: "92vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/50">
          <div>
            <h2 className="font-headline-sm font-bold text-on-surface">Tip Leaderboard</h2>
            {!loading && (
              <p className="font-body-sm text-on-surface-variant">
                <span className="text-primary font-bold">{totalSol.toFixed(2)} SOL</span> total received
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-xl">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">sync</span>
            </div>
          ) : tippers.length === 0 ? (
            <div className="py-xl text-center">
              <span className="material-symbols-outlined text-[40px] text-outline mb-sm block">toll</span>
              <p className="font-body-md text-on-surface-variant">No tips yet</p>
              <p className="font-body-sm text-outline mt-xs">Be the first to tip this post!</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex flex-col min-h-[350px]"
                >
                  {tippers.slice((page - 1) * 5, page * 5).map((t, i) => {
                    const globalIndex = (page - 1) * 5 + i;
                    return (
                    <div
                      key={`${t.actor_wallet}-${globalIndex}`}
                      className="flex items-center gap-md px-lg py-md hover:bg-surface-container-highest transition-colors cursor-pointer border-b border-outline-variant/30 last:border-0 group"
                      onClick={() => { router.push(`/profile/${t.username || t.actor_wallet}`); onClose(); }}
                    >
                      {/* Rank */}
                      <span className={`font-bold text-sm w-5 text-center shrink-0 ${
                        globalIndex === 0 ? "text-yellow-400" : globalIndex === 1 ? "text-gray-300" : globalIndex === 2 ? "text-amber-600" : "text-outline"
                      }`}>
                        #{globalIndex + 1}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden shrink-0 border border-outline-variant group-hover:border-primary/50 transition-colors">
                        {t.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-primary flex items-center justify-center h-full">person</span>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md text-on-surface truncate group-hover:text-primary transition-colors">
                          @{t.username || `${t.actor_wallet.slice(0, 6)}...`}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <div className="flex items-center gap-xs text-primary">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                          <span className="font-bold font-label-md">{Number(t.amount).toFixed(2)} SOL</span>
                        </div>
                        {t.amount_usd && t.amount_usd > 0 ? (
                          <span className="text-on-surface-variant text-[11px] font-mono">
                            ${Number(t.amount_usd).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-[11px] font-mono">
                            ${Number(t.amount * fallbackSolPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )})}
                </motion.div>
              </AnimatePresence>
              
              {tippers.length > 5 && (
                <div className="flex items-center justify-between px-lg py-md border-t border-outline-variant/50 bg-surface-container-lowest mt-1">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-outline-variant/50"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="font-label-sm font-bold text-on-surface">Page {page} of {Math.ceil(tippers.length / 5)}</span>
                  <button 
                    onClick={() => setPage(p => Math.min(Math.ceil(tippers.length / 5), p + 1))}
                    disabled={page >= Math.ceil(tippers.length / 5)}
                    className="p-1 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-outline-variant/50"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

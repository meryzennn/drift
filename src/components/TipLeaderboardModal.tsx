"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";

interface Tipper {
  actor_wallet: string;
  amount: number;
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
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    fetchTippers();
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, postId]);

  const fetchTippers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("actor_wallet, amount, actor:users!notifications_actor_wallet_fkey(username, avatar_url)")
        .eq("user_wallet", postAuthorWallet)
        .eq("type", "tip")
        .eq("post_id", postId)
        .order("amount", { ascending: false });

      if (data && data.length > 0) {
        const mapped: Tipper[] = data.map((t: any) => ({
          actor_wallet: t.actor_wallet,
          amount: t.amount || 0,
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
                <span className="text-primary font-bold">{totalSol.toFixed(4)} SOL</span> total received
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

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-xl">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tippers.length === 0 ? (
            <div className="py-xl text-center">
              <span className="material-symbols-outlined text-[40px] text-outline mb-sm block">toll</span>
              <p className="font-body-md text-on-surface-variant">No tips yet</p>
              <p className="font-body-sm text-outline mt-xs">Be the first to tip this post!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {tippers.map((t, i) => (
                <div
                  key={`${t.actor_wallet}-${i}`}
                  className="flex items-center gap-md px-lg py-md hover:bg-surface-container-highest transition-colors cursor-pointer border-b border-outline-variant/30 last:border-0"
                  onClick={() => { router.push(`/profile/${t.username || t.actor_wallet}`); onClose(); }}
                >
                  {/* Rank */}
                  <span className={`font-bold text-sm w-5 text-center shrink-0 ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-outline"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden shrink-0 border border-outline-variant">
                    {t.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px] text-primary flex items-center justify-center h-full">person</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-on-surface truncate">
                      @{t.username || `${t.actor_wallet.slice(0, 6)}...`}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-xs text-primary shrink-0">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                    <span className="font-bold font-label-md">{t.amount} SOL</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

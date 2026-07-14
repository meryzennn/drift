"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/utils/supabase";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deriveChatKeypair } from "@/utils/encryption";
import toast from "react-hot-toast";
import MessagesSkeleton from "@/components/skeletons/MessagesSkeleton";
import { AnimatePresence, motion } from "framer-motion";

const PAGE_SIZE = 10;

export default function MessagesHub() {
  const { publicKey, signMessage } = useWallet();
  const router = useRouter();

  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [showQuickDMModal, setShowQuickDMModal] = useState(false);
  const [mutualFollows, setMutualFollows] = useState<any[]>([]);
  const [creatingConvoFor, setCreatingConvoFor] = useState<string | null>(null);
  const [loadingMutualFollows, setLoadingMutualFollows] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [conversationSearchQuery, setConversationSearchQuery] = useState("");

  // Needed so createPortal only runs client-side (document isn't available during SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const savedSecret = sessionStorage.getItem(
      `drift_chat_secret_${publicKey?.toString()}`,
    );
    if (savedSecret) {
      setIsAuthenticated(true);
    }
  }, [publicKey]);

  const fetchConversations = useCallback(async () => {
    if (!publicKey) return;
    try {
      const wallet = publicKey.toString();

      const [{ data }, { data: notifData }] = await Promise.all([
        supabase
          .from("conversations")
          .select(
            `
            id,
            user1_wallet,
            user2_wallet,
            last_message_at,
            user1:users!conversations_user1_wallet_fkey(wallet_address, username, display_name, avatar_url),
            user2:users!conversations_user2_wallet_fkey(wallet_address, username, display_name, avatar_url)
          `,
          )
          .or(`user1_wallet.eq.${wallet},user2_wallet.eq.${wallet}`)
          .order("last_message_at", { ascending: false }),

        supabase
          .from("notifications")
          .select("actor_wallet")
          .eq("user_wallet", wallet)
          .eq("type", "message")
          .eq("is_read", false),
      ]);

      if (data) setConversations(data);

      const counts: Record<string, number> = {};
      if (notifData) {
        notifData.forEach((n) => {
          counts[n.actor_wallet] = (counts[n.actor_wallet] || 0) + 1;
        });
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const fetchMutualFollows = async () => {
    if (!publicKey) {
      setMutualFollows([]);
      return;
    }
    setLoadingMutualFollows(true);
    try {
      const wallet = publicKey.toString();

      const { data: following } = await supabase
        .from("follows")
        .select("following_wallet")
        .eq("follower_wallet", wallet);

      if (!following || following.length === 0) {
        setMutualFollows([]);
        setLoadingMutualFollows(false);
        return;
      }

      const followingWallets = following.map((f) => f.following_wallet);

      const { data: mutualData } = await supabase
        .from("follows")
        .select("follower_wallet")
        .eq("following_wallet", wallet)
        .in("follower_wallet", followingWallets);

      if (!mutualData || mutualData.length === 0) {
        setMutualFollows([]);
        setLoadingMutualFollows(false);
        return;
      }

      const mutualWallets = mutualData.map((m) => m.follower_wallet);

      const { data: existingConvos } = await supabase
        .from("conversations")
        .select("user1_wallet, user2_wallet")
        .or(`user1_wallet.eq.${wallet},user2_wallet.eq.${wallet}`);

      const existingChatWallets = new Set(
        existingConvos?.map((c) =>
          c.user1_wallet === wallet ? c.user2_wallet : c.user1_wallet,
        ) || [],
      );

      const availableWallets = mutualWallets.filter(
        (w) => !existingChatWallets.has(w),
      );

      if (availableWallets.length === 0) {
        setMutualFollows([]);
        setLoadingMutualFollows(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("users")
        .select("wallet_address, username, display_name, avatar_url")
        .in("wallet_address", availableWallets)
        .limit(12);

      setMutualFollows(profiles || []);
    } catch (err) {
      console.error(err);
      setMutualFollows([]);
    } finally {
      setLoadingMutualFollows(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await supabase
        .from("users")
        .select("wallet_address, username, display_name, avatar_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("wallet_address", publicKey?.toString() || "")
        .limit(20);

      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartDM = async (profile: any) => {
    if (!publicKey) return;
    setCreatingConvoFor(profile.wallet_address);

    try {
      const { data: existingConvos, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user1_wallet.eq.${publicKey.toString()},user2_wallet.eq.${profile.wallet_address}),and(user1_wallet.eq.${profile.wallet_address},user2_wallet.eq.${publicKey.toString()})`,
        );

      if (fetchError) throw fetchError;

      if (existingConvos && existingConvos.length > 0) {
        router.push(`/messages/${existingConvos[0].id}`);
      } else {
        const { data: newConvo, error: createError } = await supabase
          .from("conversations")
          .insert({
            user1_wallet: publicKey.toString(),
            user2_wallet: profile.wallet_address,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        if (newConvo) router.push(`/messages/${newConvo.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to start conversation");
    } finally {
      setCreatingConvoFor(null);
    }
  };

  useEffect(() => {
    if (publicKey && isAuthenticated) {
      fetchConversations();

      const sub = supabase
        .channel("conversations_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          () => {
            fetchConversations();
            // New message — jump back to page 1 so it's visible at top
            setPage(1);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [publicKey, isAuthenticated, fetchConversations]);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage) {
      toast.error("Wallet not connected or does not support message signing");
      return;
    }

    setAuthLoading(true);
    try {
      const message = new TextEncoder().encode(
        "Authenticate Drift E2EE Chat\n\nSigning this message allows Drift to generate a secure encryption key for your Direct Messages. It does not cost any SOL.",
      );
      const signature = await signMessage(message);
      const keypair = deriveChatKeypair(signature);
      sessionStorage.setItem(
        `drift_chat_secret_${publicKey.toString()}`,
        keypair.secretKey,
      );
      await supabase
        .from("users")
        .update({ chat_pubkey: keypair.publicKey })
        .eq("wallet_address", publicKey.toString());

      setIsAuthenticated(true);
      toast.success("DMs unlocked!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to authenticate DMs");
    } finally {
      setAuthLoading(false);
    }
  };

  // Filter conversations by search query (client-side)
  const filteredConversations = conversationSearchQuery
    ? conversations.filter((convo) => {
        const isUser1 = convo.user1_wallet === publicKey?.toString();
        const otherUser = isUser1 ? convo.user2 : convo.user1;

        const searchLower = conversationSearchQuery.toLowerCase();
        const displayName = (otherUser.display_name || "").toLowerCase();
        const username = (otherUser.username || "").toLowerCase();

        return displayName.includes(searchLower) || username.includes(searchLower);
      })
    : conversations;

  const totalPages = Math.ceil(filteredConversations.length / PAGE_SIZE);
  const paginated = filteredConversations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const goToPage = (next: number) => {
    setDirection(next > page ? 1 : -1);
    setPage(next);
  };

  const closeModal = () => {
    setShowQuickDMModal(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  if (!publicKey) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="w-full max-w-[448px] mx-auto">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4 block mx-auto">
            account_balance_wallet
          </span>
          <h2 className="font-headline-sm font-bold text-on-surface mb-2">
            Connect Wallet
          </h2>
          <p className="font-body-md text-on-surface-variant">
            Connect your Solana wallet to view and send direct messages.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-[448px] mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 shrink-0 mx-auto">
            <span className="material-symbols-outlined text-[40px] text-primary">
              enhanced_encryption
            </span>
          </div>
          <h2 className="font-headline-md font-bold text-on-surface mb-3">
            End-to-End Encrypted DMs
          </h2>
          <p className="font-body-md text-on-surface-variant mb-8">
            Drift uses full Web3 encryption. Your messages are completely
            private and cannot be read by anyone else, not even the server.
          </p>
          <div className="flex justify-center w-full">
            <button
              onClick={handleAuthenticate}
              disabled={authLoading}
              className="px-6 py-3 bg-primary text-on-primary font-label-lg font-bold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {authLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    sync
                  </span>
                  Unlocking...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock_open</span>
                  Unlock Messages
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-2xl mx-auto flex flex-col"
      style={{ minWidth: "min(100%, 500px)" }}
    >
      {/* Sticky Header */}
      <div className="sticky top-[64px] z-10 bg-background border-b border-outline-variant/50 py-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-headline-lg font-bold text-on-surface flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px]">
              forum
            </span>
            Messages
          </h1>
          <button
            onClick={() => {
              setShowQuickDMModal(true);
              fetchMutualFollows();
            }}
            className="w-10 h-10 rounded-full bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center transition-all active:scale-90"
            title="Start new conversation"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
        {conversations.length > 0 && (
          <div className="relative mt-3">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter conversations..."
              value={conversationSearchQuery}
              onChange={(e) => {
                setConversationSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-full font-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            {conversationSearchQuery && (
              <button
                onClick={() => {
                  setConversationSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                  close
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 w-full">
          {[1, 2, 3, 4, 5].map((i) => (
            <MessagesSkeleton key={i} />
          ))}
        </div>
      ) : filteredConversations.length === 0 ? (
        conversationSearchQuery ? (
          <div className="w-full text-center py-20 bg-surface-container-low rounded-3xl border border-outline-variant/50">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4 opacity-50">
              search_off
            </span>
            <h3 className="font-headline-sm font-bold text-on-surface mb-2">
              No conversations found
            </h3>
            <p className="font-body-md text-on-surface-variant">
              No matches for &quot;{conversationSearchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="w-full text-center py-20 bg-surface-container-low rounded-3xl border border-outline-variant/50">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4 opacity-50">
              speaker_notes_off
            </span>
            <h3 className="font-headline-sm font-bold text-on-surface mb-2 w-full">
              No messages yet
            </h3>
            <p className="font-body-md text-on-surface-variant w-full mx-auto">
              Go to a mutual follower's profile to start chatting.
            </p>
          </div>
        )
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-col gap-3 w-full"
            >
              {paginated.map((convo) => {
                const isUser1 = convo.user1_wallet === publicKey.toString();
                const otherUser = isUser1 ? convo.user2 : convo.user1;

                return (
                  <Link
                    key={convo.id}
                    href={`/messages/${convo.id}`}
                    className="w-full flex items-center gap-4 p-4 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/50 rounded-2xl transition-all group"
                  >
                    <div className="w-14 h-14 rounded-full bg-surface-container-highest overflow-hidden shrink-0 border border-outline-variant">
                      {otherUser.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-lg bg-primary/20 text-primary">
                          {otherUser.display_name?.slice(0, 2).toUpperCase() ||
                            "U"}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-label-lg font-bold text-on-surface truncate group-hover:text-primary transition-colors flex items-center gap-2">
                          {otherUser.display_name}
                          {unreadCounts[otherUser.wallet_address] > 0 && (
                            <span className="w-2 h-2 rounded-full bg-error inline-block shrink-0"></span>
                          )}
                        </span>
                        <span className="font-body-sm text-on-surface-variant shrink-0 ml-2">
                          {new Date(convo.last_message_at).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center w-full">
                        <span
                          className={`font-body-md truncate ${unreadCounts[otherUser.wallet_address] > 0 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}
                        >
                          @{otherUser.username}
                        </span>
                        {unreadCounts[otherUser.wallet_address] > 0 && (
                          <div className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            {unreadCounts[otherUser.wallet_address]}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 mb-4 bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-3">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 font-label-md text-on-surface-variant disabled:opacity-30 hover:text-primary disabled:hover:text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back_ios
                </span>
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                        p === page
                          ? "bg-primary text-on-primary scale-110"
                          : "text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1 font-label-md text-on-surface-variant disabled:opacity-30 hover:text-primary disabled:hover:text-on-surface-variant transition-colors"
              >
                Next
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward_ios
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* New Message Modal — rendered via portal to document.body so it can never
          get squashed by a transformed/animated ancestor (e.g. framer-motion page
          transitions), since `position: fixed` is relative to the nearest
          transformed ancestor, not always the viewport. */}
      {showQuickDMModal &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-4 pt-16 sm:pt-20"
            onClick={closeModal}
          >
            <div
              className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-surface-container rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 pb-3 sm:pb-4 border-b border-outline-variant/50">
                <h2 className="font-headline-md font-bold text-on-surface">
                  New Message
                </h2>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">
                    close
                  </span>
                </button>
              </div>

              {/* Search Input */}
              <div className="p-4 sm:p-5 lg:p-6 pb-3 sm:pb-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant/50 rounded-full font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Content */}
              <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {isSearching ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl animate-pulse"
                      >
                        <div className="w-12 h-12 rounded-full bg-surface-container-high"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-surface-container-high rounded w-32 mb-2"></div>
                          <div className="h-3 bg-surface-container-high rounded w-40"></div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-surface-container-high"></div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  searchResults.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-[56px] text-on-surface-variant mb-3 opacity-40 block">
                        person_search
                      </span>
                      <p className="font-body-md text-on-surface-variant mb-1">
                        No users found
                      </p>
                      <p className="font-body-sm text-on-surface-variant">
                        Try searching with a different username
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.wallet_address}
                          className="flex items-center gap-3 p-3 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 rounded-xl transition-all group"
                        >
                          <Link
                            href={`/profile/${user.username || user.wallet_address}`}
                            className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-outline-variant bg-primary/20 flex items-center justify-center"
                            onClick={closeModal}
                          >
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-primary text-lg bg-primary/20">
                                {user.display_name?.slice(0, 2).toUpperCase() ||
                                  "U"}
                              </div>
                            )}
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/profile/${user.username || user.wallet_address}`}
                              className="font-label-lg font-bold text-on-surface truncate block group-hover:text-primary transition-colors"
                              onClick={closeModal}
                            >
                              {user.display_name || "Anonymous"}
                            </Link>
                            <p className="font-body-sm text-on-surface-variant truncate">
                              @
                              {user.username ||
                                `${user.wallet_address.slice(0, 10)}...`}
                            </p>
                          </div>

                          <button
                            onClick={() => handleStartDM(user)}
                            disabled={creatingConvoFor === user.wallet_address}
                            className="w-9 h-9 rounded-full bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 shrink-0"
                            title="Send message"
                          >
                            {creatingConvoFor === user.wallet_address ? (
                              <span className="material-symbols-outlined text-[18px] animate-spin">
                                sync
                              </span>
                            ) : (
                              <span className="material-symbols-outlined text-[20px]">
                                send
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <h3 className="font-label-md font-bold text-on-surface mb-3 px-1">
                      Suggested
                    </h3>
                    {loadingMutualFollows ? (
                      <div className="flex flex-col gap-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl animate-pulse"
                          >
                            <div className="w-12 h-12 rounded-full bg-surface-container-high"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-surface-container-high rounded w-32 mb-2"></div>
                              <div className="h-3 bg-surface-container-high rounded w-40"></div>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-surface-container-high"></div>
                          </div>
                        ))}
                      </div>
                    ) : mutualFollows.length === 0 ? (
                      <div className="text-center py-12">
                        <span className="material-symbols-outlined text-[56px] text-on-surface-variant mb-3 opacity-40 block">
                          group_off
                        </span>
                        <p className="font-body-md text-on-surface-variant mb-1">
                          No suggestions available
                        </p>
                        <p className="font-body-sm text-on-surface-variant">
                          Search above to find people to message
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                        {mutualFollows.map((user) => (
                          <div
                            key={user.wallet_address}
                            className="flex items-center gap-3 p-3 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 rounded-xl transition-all group"
                          >
                            <Link
                              href={`/profile/${user.username || user.wallet_address}`}
                              className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-outline-variant bg-primary/20 flex items-center justify-center"
                              onClick={closeModal}
                            >
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-primary text-lg bg-primary/20">
                                  {user.display_name
                                    ?.slice(0, 2)
                                    .toUpperCase() || "U"}
                                </div>
                              )}
                            </Link>

                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/profile/${user.username || user.wallet_address}`}
                                className="font-label-lg font-bold text-on-surface truncate block group-hover:text-primary transition-colors"
                                onClick={closeModal}
                              >
                                {user.display_name || "Anonymous"}
                              </Link>
                              <p className="font-body-sm text-on-surface-variant truncate">
                                @
                                {user.username ||
                                  `${user.wallet_address.slice(0, 10)}...`}
                              </p>
                            </div>

                            <button
                              onClick={() => handleStartDM(user)}
                              disabled={
                                creatingConvoFor === user.wallet_address
                              }
                              className="w-9 h-9 rounded-full bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 shrink-0"
                              title="Send message"
                            >
                              {creatingConvoFor === user.wallet_address ? (
                                <span className="material-symbols-outlined text-[18px] animate-spin">
                                  sync
                                </span>
                              ) : (
                                <span className="material-symbols-outlined text-[20px]">
                                  send
                                </span>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";
import { AppNotification } from "@/types";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const NOTIFICATION_QUERY = `
  id,
  user_wallet,
  actor_wallet,
  type,
  post_id,
  amount,
  is_read,
  created_at,
  actor:users!notifications_actor_wallet_fkey ( username, avatar_url ),
  post:posts!notifications_post_id_fkey ( content )
`;

type FilterTab = "all" | "likes" | "reposts" | "replies" | "tips";

const TAB_LABELS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "notifications" },
  { key: "likes", label: "Likes", icon: "favorite" },
  { key: "reposts", label: "Reposts", icon: "repeat" },
  { key: "replies", label: "Replies", icon: "reply" },
  { key: "tips", label: "Tips", icon: "monetization_on" },
];

function NotificationIcon({ type }: { type: string }) {
  const configs: Record<string, { icon: string; color: string }> = {
    like: { icon: "favorite", color: "text-error" },
    repost: { icon: "repeat", color: "text-secondary" },
    reply: { icon: "reply", color: "text-primary" },
    tip: { icon: "monetization_on", color: "text-tertiary" },
    follow: { icon: "person_add", color: "text-primary" },
  };
  const cfg = configs[type] ?? { icon: "notifications", color: "text-on-surface-variant" };
  return (
    <span
      className={`material-symbols-outlined text-[22px] ${cfg.color}`}
      style={{ fontVariationSettings: "'FILL' 1" }}
    >
      {cfg.icon}
    </span>
  );
}

function NotificationMessage({ n }: { n: AppNotification }) {
  const actor = n.actor?.username ? `@${n.actor.username}` : "Someone";

  switch (n.type) {
    case "like":
      return (
        <p className="font-body-md text-on-surface">
          <span className="font-bold">{actor}</span> liked your post
        </p>
      );
    case "repost":
      return (
        <p className="font-body-md text-on-surface">
          <span className="font-bold">{actor}</span> reposted your post
        </p>
      );
    case "reply":
      return (
        <p className="font-body-md text-on-surface">
          <span className="font-bold">{actor}</span> replied to your post
        </p>
      );
    case "tip":
      return (
        <p className="font-body-md text-on-surface">
          <span className="font-bold">{actor}</span> sent you a tip of{" "}
          <span className="font-mono font-bold text-tertiary bg-tertiary/10 px-1 rounded">
            {n.amount} SOL
          </span>
        </p>
      );
    case "follow":
      return (
        <p className="font-body-md text-on-surface">
          <span className="font-bold">{actor}</span> started following you
        </p>
      );
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const { publicKey, connected } = useWallet();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_QUERY)
        .eq("user_wallet", publicKey.toString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to fetch notifications:", error);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNotifications((data as any[]).map((row) => ({
          ...row,
          actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
          post: Array.isArray(row.post) ? row.post[0] : row.post,
        })));
      }
      setLoading(false);
    };

    fetchNotifications();

    // Subscribe to new real-time notifications
    const channelId = `notif_page_${publicKey.toString()}_${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_wallet=eq.${publicKey.toString()}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey]);

  // Mark all as read when page loads
  useEffect(() => {
    if (!publicKey || notifications.length === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      });
  }, [notifications.length, publicKey]);

  const filtered = activeTab === "all"
    ? notifications
    : notifications.filter((n) => {
        if (activeTab === "likes") return n.type === "like";
        if (activeTab === "reposts") return n.type === "repost";
        if (activeTab === "replies") return n.type === "reply";
        if (activeTab === "tips") return n.type === "tip";
        return true;
      });

  return (
    <>
      {/* Header */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md">
        <div className="py-md">
          <h1 className="font-headline-md font-bold text-on-surface">Notifications</h1>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar">
          {TAB_LABELS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-fit py-sm px-md text-center font-label-md transition-colors flex items-center justify-center gap-xs ${
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {!connected ? (
        <div className="flex flex-col items-center justify-center py-3xl gap-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px]">notifications_off</span>
          <p className="font-body-md">Connect your wallet to see notifications.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-3xl">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-3xl gap-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px]">notifications</span>
          <p className="font-body-md">
            {activeTab === "all" ? "No notifications yet." : `No ${activeTab} yet.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden mt-md">
          {filtered.map((n, i) => (
            <article
              key={n.id}
              className={`p-md flex gap-md items-start transition-colors ${
                !n.is_read ? "bg-primary/5" : "hover:bg-surface-container-low"
              } ${i < filtered.length - 1 ? "border-b border-outline-variant" : ""}`}
            >
              {/* Icon */}
              <div className="mt-xs shrink-0">
                <NotificationIcon type={n.type} />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                {/* Actor avatar + message */}
                <div className="flex items-center gap-sm mb-xs">
                  {n.actor?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.actor.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-[12px] shrink-0">
                      {n.actor?.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <NotificationMessage n={n} />
                  </div>
                </div>

                {/* Post snippet */}
                {n.post?.content && (
                  <Link
                    href={n.post_id ? `/post/${n.post_id}` : "#"}
                    onClick={(e) => e.stopPropagation()}
                    className="block mt-xs"
                  >
                    <p className="font-body-sm text-on-surface-variant line-clamp-2 bg-surface-container rounded-lg px-sm py-xs border border-outline-variant/50 hover:border-primary/30 transition-colors">
                      &ldquo;{n.post.content}&rdquo;
                    </p>
                  </Link>
                )}

                {/* Timestamp */}
                <p className="font-label-sm text-outline mt-xs">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Unread dot */}
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

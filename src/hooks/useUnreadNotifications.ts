import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/utils/supabase";

export function useUnreadNotifications() {
  const { publicKey, connected } = useWallet();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_wallet", publicKey.toString())
        .eq("is_read", false);
        
      setUnreadCount(count || 0);
    };

    fetchCount();

    // Setup realtime subscription
    const channelId = `notifications_changes_${publicKey.toString()}_${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_wallet=eq.${publicKey.toString()}`
        },
        () => {
          fetchCount(); // Refetch count on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connected, publicKey]);

  return unreadCount;
}

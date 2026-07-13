"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Post } from "@/types";
import { POST_SELECT_QUERY, mapPostData } from "@/utils/postQueries";
import PostCard from "./PostCard";
import CreateComment from "./CreateComment";

interface ClientRepliesProps {
  mainPost: Post;
  initialReplies: Post[];
  highlightId?: string;
}

export default function ClientReplies({ mainPost, initialReplies, highlightId }: ClientRepliesProps) {
  const [replies, setReplies] = useState<Post[]>(initialReplies);

  useEffect(() => {
    // 1. Fetch latest replies on mount to ensure we don't show stale data from Next.js router cache when navigating back
    const fetchLatest = async () => {
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("reply_to_post_id", mainPost.id)
        .order("created_at", { ascending: false });

      if (data) {
        setReplies(data.map(mapPostData));
      }
    };
    fetchLatest();

    // 2. Realtime: subscribe to new replies on this post
    const channel = supabase
      .channel(`replies_${mainPost.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `reply_to_post_id=eq.${mainPost.id}`
      }, async (payload) => {
        // Fetch the full post data for the new reply
        const { data } = await supabase
          .from("posts")
          .select(POST_SELECT_QUERY)
          .eq("id", payload.new.id)
          .single();

        if (data) {
          const newReply = mapPostData(data);
          setReplies(prev => {
            // Avoid duplicates
            if (prev.find(r => r.id === newReply.id)) return prev;
            return [newReply, ...prev];
          });
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
      }, (payload) => {
        setReplies(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mainPost.id]);

  const handleCommentSuccess = async (newPostId?: string) => {
    if (!newPostId) return;
    
    // Instantly fetch the newly created comment and append it to our local state
    const { data } = await supabase
      .from("posts")
      .select(POST_SELECT_QUERY)
      .eq("id", newPostId)
      .single();

    if (data) {
      const newReply = mapPostData(data);
      setReplies(prev => {
        if (prev.find(r => r.id === newReply.id)) return prev;
        return [newReply, ...prev];
      });
    }
  };

  return (
    <>
      {/* Main Post — stays mounted, video never restarts, but commentsCount updates locally! */}
      <div className="pt-md pb-xs">
        <PostCard post={{ ...mainPost, commentsCount: replies.length }} isDetail={true} />
      </div>

      {/* Create Comment Form — optimistic UI via onSuccess */}
      <CreateComment postId={mainPost.id} postAuthor={mainPost.authorPublicKey} onSuccess={handleCommentSuccess} />

      {/* Replies List */}
      <div className="flex flex-col gap-md pb-md">
        {replies.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant font-body-md">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map(reply => (
            <PostCard
              key={reply.id}
              post={reply}
              hideReplyIndicator={true}
              isHighlighted={reply.id === highlightId}
            />
          ))
        )}
      </div>
    </>
  );
}

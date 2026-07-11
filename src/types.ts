export interface Post {
  id: string;
  authorPublicKey: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  authorProfile?: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  commentsCount?: number;
  hasLiked?: boolean;
  hasReposted?: boolean;
  repostsCount?: number;
  quotePostId?: string;
  quotePost?: Post;
  isRepost?: boolean;
  repostedBy?: string;
  reposterWallet?: string;
  replyToPostId?: string;
  replyToUsername?: string;
  totalTips?: number;
  topTippers?: { from_wallet: string; amount: number; username?: string; avatar_url?: string }[];
}

export interface Comment {
  id: string;
  postId: string;
  authorPublicKey: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  authorProfile?: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface AppNotification {
  id: string;
  user_wallet: string;
  actor_wallet: string;
  type: "like" | "repost" | "reply" | "tip" | "follow" | "mention" | "message";
  post_id?: string;
  amount?: number;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string;
    avatar_url: string;
  };
  post?: {
    content: string;
    reply_to_post_id?: string;
  };
}

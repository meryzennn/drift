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

import { Post } from "@/types";

export const POST_SELECT_QUERY = `
  id,
  content,
  media_url,
  created_at,
  likes,
  author_wallet,
  quote_post_id,
  reply_to_post_id,
  users!posts_author_wallet_fkey (
    username,
    display_name,
    avatar_url
  ),
  comments ( count ),
  reposts ( count ),
  quotes:posts!quote_post_id ( count ),
  quote_post:posts!quote_post_id (
    id,
    content,
    media_url,
    created_at,
    likes,
    author_wallet,
    users!posts_author_wallet_fkey (
      username,
      display_name,
      avatar_url
    )
  )
`;

export function mapPostData(p: any): Post {
  const quoteData = Array.isArray(p.quote_post) ? p.quote_post[0] : p.quote_post;
  
  return {
    id: p.id,
    authorPublicKey: p.author_wallet,
    content: p.content,
    imageUrl: p.media_url,
    createdAt: p.created_at,
    likes: p.likes || 0,
    authorProfile: p.users ? {
      username: p.users.username,
      displayName: p.users.display_name,
      avatarUrl: p.users.avatar_url,
    } : undefined,
    commentsCount: p.comments?.[0]?.count ?? 0,
    repostsCount: (p.reposts?.[0]?.count ?? 0) + (p.quotes?.[0]?.count ?? 0),
    quotePostId: p.quote_post_id,
    replyToPostId: p.reply_to_post_id,
    quotePost: quoteData ? {
      id: quoteData.id,
      authorPublicKey: quoteData.author_wallet,
      content: quoteData.content,
      imageUrl: quoteData.media_url,
      createdAt: quoteData.created_at,
      likes: quoteData.likes || 0,
      authorProfile: quoteData.users ? {
        username: quoteData.users.username,
        displayName: quoteData.users.display_name,
        avatarUrl: quoteData.users.avatar_url,
      } : undefined,
    } : undefined
  };
}

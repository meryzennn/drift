export interface Post {
  id: string;
  authorPublicKey: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
}

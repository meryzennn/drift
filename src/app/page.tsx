import Navbar from "@/components/Navbar";
import CreatePost from "@/components/CreatePost";
import Feed from "@/components/Feed";
import { Post } from "@/types";

// Mock data to visualize the UI before DB integration
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    authorPublicKey: "FjH23ZJm1Tz7oM7q3K3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q",
    content: "Just joined Drift! The future of decentralized social is here. Solana speed + Web2 UX 🔥 #Solana #DeSoc",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    likes: 42,
  },
  {
    id: "2",
    authorPublicKey: "9XxB3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q3K3ZJm1Tz7oM7q",
    content: "gm ☕️ building cool stuff today.",
    imageUrl: "https://images.unsplash.com/photo-1614064010156-3ce9e09d0db6?auto=format&fit=crop&q=80&w=1000",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    likes: 128,
  }
];

export default function Home() {
  return (
    <>
      <CreatePost />
      <Feed posts={MOCK_POSTS} />
    </>
  );
}

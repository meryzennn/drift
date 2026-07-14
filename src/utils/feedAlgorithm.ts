import { Post } from "@/types";

export interface ScoredPost extends Post {
  algorithmScore?: number;
}

interface ScoreWeights {
  likes: number;
  reposts: number;
  comments: number;
  tips: number;
  recencyDecayHours: number;
  baseScore: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  likes: 1,
  reposts: 2,
  comments: 1.5,
  tips: 5,
  recencyDecayHours: 24,
  baseScore: 10,
};

/**
 * Calculate post score with engagement weighting and recency decay
 */
export function calculatePostScore(
  post: Post,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  currentTime: Date = new Date()
): number {
  const hoursOld = (currentTime.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  const recencyMultiplier = 1 / (1 + hoursOld / weights.recencyDecayHours);

  const engagementScore =
    (post.likes || 0) * weights.likes +
    (post.repostsCount || 0) * weights.reposts +
    (post.commentsCount || 0) * weights.comments +
    (post.totalTips || 0) * weights.tips;

  return (weights.baseScore + engagementScore) * recencyMultiplier;
}

/**
 * Rank posts by algorithm score
 */
export function rankPosts(
  posts: Post[],
  weights?: ScoreWeights
): ScoredPost[] {
  const currentTime = new Date();

  const scoredPosts: ScoredPost[] = posts.map(post => ({
    ...post,
    algorithmScore: calculatePostScore(post, weights, currentTime),
  }));

  return scoredPosts.sort((a, b) => (b.algorithmScore || 0) - (a.algorithmScore || 0));
}

/**
 * Personalized ranking with following boost
 */
export function rankPersonalizedPosts(
  posts: Post[],
  followingWallets: string[],
  followBoost: number = 1.5,
  weights?: ScoreWeights,
  currentUserWallet?: string
): ScoredPost[] {
  const currentTime = new Date();

  const scoredPosts: ScoredPost[] = posts.map(post => {
    let score = calculatePostScore(post, weights, currentTime);

    // Massive boost for user's own posts so they always appear at top
    if (currentUserWallet && post.authorPublicKey === currentUserWallet) {
      score *= 100;
    } else if (followingWallets.includes(post.authorPublicKey)) {
      score *= followBoost;
    }

    return {
      ...post,
      algorithmScore: score,
    };
  });

  return scoredPosts.sort((a, b) => (b.algorithmScore || 0) - (a.algorithmScore || 0));
}

/**
 * Explore weights: boost viral content with fast decay
 */
export const EXPLORE_WEIGHTS: ScoreWeights = {
  ...DEFAULT_WEIGHTS,
  likes: 1.5,
  reposts: 3,
  comments: 2,
  tips: 6,
  recencyDecayHours: 12,
  baseScore: 0, // No base score for trending - pure engagement ranking
};

/**
 * Home weights: balance recency and engagement
 */
export const HOME_WEIGHTS: ScoreWeights = {
  ...DEFAULT_WEIGHTS,
  likes: 1,
  reposts: 1.5,
  comments: 1.2,
  tips: 4,
  recencyDecayHours: 48,
};

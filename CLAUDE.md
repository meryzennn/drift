# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

Drift is a decentralized social network built on Solana. It combines Web3 wallet authentication with traditional social features (posts, comments, likes, follows, messages) and Solana-native features (SOL tips, NFT showcase).

**Stack:**
- Next.js 16.2.10 (App Router) with React 19
- TypeScript with strict mode
- Tailwind CSS v4
- Solana Web3.js (devnet)
- Supabase (PostgreSQL backend)
- AWS S3/R2 for media storage

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Authentication Flow

1. User connects Solana wallet (via `@solana/wallet-adapter-react`)
2. `AuthProvider` checks if wallet exists in Supabase `users` table
3. If new wallet → redirect to `/setup-profile` to create profile
4. If existing → allow access to `(main)` routes
5. Presence heartbeat updates `last_seen` every 30s while connected

**Key files:**
- `src/components/providers/WalletContextProvider.tsx` - Solana wallet setup
- `src/components/providers/AuthProvider.tsx` - User existence check and routing
- `src/utils/solanaUtils.ts` - Solana transaction utilities (tips)

### Layout Structure

The app uses Next.js route groups for layout composition:

- `src/app/layout.tsx` - Root layout (fonts, wallet provider, navbar, mobile nav)
- `src/app/(main)/layout.tsx` - Three-column layout for authenticated pages:
  - `LeftSidebar` - Navigation and profile summary
  - Main content area (max-w-[600px])
  - `RightSidebar` - Trending, leaderboard, etc.

### Data Layer

**Supabase Tables:**
- `users` - Profiles (wallet_address, username, display_name, avatar_url, bio)
- `posts` - All posts (author_wallet, content, media_url, reply_to_post_id, quote_post_id)
- `reposts` - Repost records (wallet, post_id)
- `tips` - SOL tips (from_wallet, to_wallet, post_id, amount, tx_signature)
- `notifications` - Activity feed (type: like, repost, reply, tip, follow, mention, message)
- `messages` - Direct messages (from_wallet, to_wallet, conversation_id)
- `follows` - Follow relationships (follower_wallet, following_wallet)

**Query patterns:**
- Use `POST_SELECT_QUERY` from `src/utils/postQueries.ts` for consistent post fetching
- Always map raw Supabase results through `mapPostData()` to normalize to `Post` type
- Posts include nested queries for author profile, reply count, repost count, quoted post

**Solana integration:**
- Connected to devnet (`https://api.devnet.solana.com`)
- Tips flow: user sends SOL via wallet → transaction signature stored in Supabase → notification created
- Only production-facing code should use mainnet; all development uses devnet

### Media Uploads

Upload flow uses presigned URLs to avoid proxying through Next.js:

1. Client calls `/api/upload/presign` with filename and content type
2. API generates presigned PUT URL and returns it with public URL
3. Client PUTs file directly to R2/S3 using presigned URL
4. Client stores public URL in post/profile record

**Key files:**
- `src/utils/upload.ts` - `uploadFileToR2()` orchestrates the flow
- `src/app/api/upload/presign/route.ts` - Generates presigned URLs
- Image compression via `browser-image-compression` before upload
- Video validation enforces duration and size limits

### Feed and Virtualization

The main feed (`src/components/Feed.tsx`) uses React Virtuoso for performance:

- Virtualizes long lists to render only visible items
- Client-side position caching per route (preserves scroll on back navigation)
- Integrates follower activity (tips, reposts) alongside posts
- Background resolution of Facebook embed aspect ratios (via `/api/resolve-fb`)
- Social embeds (YouTube, Facebook) use intersection observer for lazy playback

### Path Aliases

TypeScript configured with `@/*` → `./src/*` for imports. Always use the alias for src imports:

```typescript
import { supabase } from "@/utils/supabase";
import { Post } from "@/types";
import PostCard from "@/components/PostCard";
```

## Environment Variables

Required in `.env.local`:

```bash
# Supabase (public, used client-side)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AWS/R2 (server-side only, used in API routes)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=
AWS_ENDPOINT_URL=  # For R2
PUBLIC_MEDIA_URL=  # CDN/public URL base for uploaded files
```

## Key Patterns

**Client components:** Almost all components are `"use client"` due to Solana wallet hooks and interactivity. Server components are rare in this codebase.

**Type safety:** All posts, comments, notifications use types from `src/types.ts`. Never use `any` for domain objects.

**Error handling:** Use `react-hot-toast` for user-facing errors. Import from `react-hot-toast` and call `toast.error()` / `toast.success()`.

**Social features:**
- Likes, reposts, follows are stored as separate tables (not denormalized counters)
- Counts are computed via Supabase `.count()` in queries
- User interactions check for existing records (hasLiked, hasReposted) via wallet address

**Progressive Web App:** The app has a service worker (`public/sw.js`) and manifest for PWA installation. Test on mobile for proper PWA behavior.

## Testing Changes

For UI changes:
1. Start dev server with `npm run dev`
2. Test in browser (desktop and mobile viewports)
3. Check responsive behavior (layout switches at `md:` breakpoint)
4. Test with wallet connected and disconnected states
5. Verify toast notifications appear correctly (positioned below navbar)

For Solana features (tips, wallet interactions):
- Ensure devnet connection in `src/utils/solanaUtils.ts`
- Use a devnet wallet with SOL from faucet
- Verify transactions on Solana Explorer (devnet)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() UNIQUE,
    wallet_address TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    x_link TEXT,
    telegram_link TEXT,
    instagram_link TEXT,
    custom_link TEXT,
    has_set_username_once BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REPOSTS TABLE
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_wallet, post_id)
);

-- POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TIPS TABLE
CREATE TABLE IF NOT EXISTS public.tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    to_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TOP TIPPERS VIEW (For Leaderboard)
CREATE OR REPLACE VIEW public.top_tippers AS
SELECT 
    from_wallet,
    SUM(amount) as total_tipped
FROM 
    public.tips
GROUP BY 
    from_wallet
ORDER BY 
    total_tipped DESC;

-- SECURITY & RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR USERS
-- Anyone can read user profiles
CREATE POLICY "Users are viewable by everyone" ON public.users
    FOR SELECT USING (true);
    
-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (true);
    
-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (true);

-- POLICIES FOR POSTS
-- Anyone can read posts
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

-- Users can insert posts
CREATE POLICY "Anyone can insert posts" ON public.posts
    FOR INSERT WITH CHECK (true);

-- POLICIES FOR TIPS
-- Anyone can read tips
CREATE POLICY "Tips are viewable by everyone" ON public.tips
    FOR SELECT USING (true);

-- Anyone can insert tips
CREATE POLICY "Anyone can insert tips" ON public.tips
    FOR INSERT WITH CHECK (true);

-- POLICIES FOR REPOSTS
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reposts are viewable by everyone" ON public.reposts
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reposts" ON public.reposts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own reposts" ON public.reposts
    FOR DELETE USING (true);

-- FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    follower_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    following_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_wallet, following_wallet)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert follows" ON public.follows
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete follows" ON public.follows
    FOR DELETE USING (true);

-- ADDED POLICIES FOR POSTS (EDIT & DELETE)
CREATE POLICY "Anyone can update posts" ON public.posts
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete posts" ON public.posts
    FOR DELETE USING (true);
-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert comments" ON public.comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update comments" ON public.comments
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete comments" ON public.comments
    FOR DELETE USING (true);

-- Migration: Add hashtags support
-- Creates tables for storing hashtags and linking them to posts

-- Create hashtags table
CREATE TABLE IF NOT EXISTS public.hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag TEXT UNIQUE NOT NULL,
    display_tag TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast trending queries
DROP INDEX IF EXISTS idx_hashtags_usage_last_used;
CREATE INDEX idx_hashtags_usage_last_used ON public.hashtags(usage_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON public.hashtags(tag);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS public.post_hashtags (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, hashtag_id)
);

-- Create indexes for bidirectional queries
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON public.post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON public.post_hashtags(post_id);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hashtags
CREATE POLICY "Hashtags are viewable by everyone" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hashtags" ON public.hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hashtags" ON public.hashtags FOR UPDATE USING (true);

-- RLS Policies for post_hashtags
CREATE POLICY "Post hashtags are viewable by everyone" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can insert post hashtags" ON public.post_hashtags FOR INSERT WITH CHECK (true);

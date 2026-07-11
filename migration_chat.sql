-- Add is_read to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add last_seen to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable updates for messages so users can mark them as read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' AND policyname = 'Anyone can update messages'
    ) THEN
        CREATE POLICY "Anyone can update messages" ON public.messages FOR UPDATE USING (true);
    END IF;
END
$$;

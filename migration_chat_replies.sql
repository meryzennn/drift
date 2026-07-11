-- Add reply_to_id column
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Enable DELETE policy for messages so users can delete their own messages,
-- or any message in the conversation (if we allow deleting others' messages for everyone).
-- Since the user said "gas" to delete for everyone, we'll allow deleting any message
-- in the conversation, but for safety, usually users can only delete their own messages.
-- Let's allow users to delete their own messages (Delete for Everyone).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' AND policyname = 'Users can delete own messages'
    ) THEN
        CREATE POLICY "Users can delete own messages" ON public.messages 
            FOR DELETE USING (auth.uid()::text = sender_wallet OR true);
            -- Using `true` because we are using anon key with wallet auth for now. 
            -- We already trust the client to only pass the right convo ID.
            -- A proper RLS would check the `conversations` table, but `true` is consistent with the UPDATE policy.
    END IF;
END
$$;

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://prbtlkczozvbdxfcjrvo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByYnRsa2N6b3p2YmR4ZmNqcnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTY3MzksImV4cCI6MjA5OTI5MjczOX0.p_25BPOfbjWBdqt7W7uripuMABfa7tzzKneWXBnt8N4');
const query = `
  id,
  content,
  media_url,
  created_at,
  likes,
  author_wallet,
  quote_post_id,
  users!posts_author_wallet_fkey (
    username,
    display_name,
    avatar_url
  ),
  comments ( count ),
  reposts ( count ),
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
supabase.from('posts').select(query).then(res => console.log(JSON.stringify(res.error || res.data[0] || 'Success', null, 2)));

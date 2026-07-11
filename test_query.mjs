import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      quote_post_id,
      parent1:posts!posts_quote_post_id_fkey(id, content),
      children1:posts!posts_quote_post_id_fkey(id, content),
      parent2:quote_post_id(id, content)
    `)
    .not('quote_post_id', 'is', null)
    .limit(1);

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

run();

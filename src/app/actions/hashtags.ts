'use server';

import { supabase } from '@/utils/supabase';
import { extractHashtags } from '@/utils/hashtagUtils';

export async function storePostHashtags(postId: string, content: string) {
  const hashtags = extractHashtags(content);
  if (hashtags.length === 0) return;

  try {
    for (const { tag, display_tag } of hashtags) {
      const { data: existing } = await supabase
        .from('hashtags')
        .select('id, usage_count')
        .eq('tag', tag)
        .single();

      let hashtagId: string;

      if (existing) {
        await supabase
          .from('hashtags')
          .update({
            usage_count: existing.usage_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        hashtagId = existing.id;
      } else {
        const { data: newHashtag } = await supabase
          .from('hashtags')
          .insert({ tag, display_tag, usage_count: 1 })
          .select('id')
          .single();
        hashtagId = newHashtag!.id;
      }

      await supabase
        .from('post_hashtags')
        .insert({ post_id: postId, hashtag_id: hashtagId });
    }
  } catch (error) {
    console.error('Error storing hashtags:', error);
  }
}

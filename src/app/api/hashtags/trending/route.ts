import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

function categorizeHashtag(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower.includes('defi')) return 'DeFi';
  if (lower.includes('nft')) return 'NFTs';
  if (lower.includes('dapp')) return 'dApp';
  if (lower.includes('solana') || lower.includes('ethereum') || lower.includes('blockchain')) return 'Infrastructure';
  if (lower.includes('meme')) return 'Meme';
  if (lower.includes('airdrop')) return 'Airdrop';
  return 'Web3';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('post_hashtags')
      .select(`
        hashtag_id,
        hashtags!inner(id, tag, display_tag, last_used_at)
      `)
      .gte('hashtags.last_used_at', sevenDaysAgo.toISOString());

    if (error) throw error;

    const hashtagMap = new Map<string, { id: string; tag: string; display_tag: string; last_used_at: string; count: number }>();

    (data || []).forEach((row: any) => {
      const h = row.hashtags;
      if (!hashtagMap.has(h.id)) {
        hashtagMap.set(h.id, { ...h, count: 0 });
      }
      hashtagMap.get(h.id)!.count++;
    });

    const now = Date.now();
    const ranked = Array.from(hashtagMap.values()).map(h => {
      const hoursSinceUse = (now - new Date(h.last_used_at).getTime()) / (1000 * 60 * 60);
      let recencyFactor = 1;

      if (hoursSinceUse < 24) recencyFactor = 3;
      else if (hoursSinceUse < 168) recencyFactor = 1.5;

      return {
        id: h.id,
        tag: h.tag,
        display_tag: h.display_tag,
        usage_count: h.count,
        last_used_at: h.last_used_at,
        score: h.count * recencyFactor,
        category: categorizeHashtag(h.tag)
      };
    });

    ranked.sort((a, b) => b.score - a.score);

    return NextResponse.json({ hashtags: ranked.slice(0, limit) });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    return NextResponse.json({ error: 'Failed to fetch trending hashtags' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');
  const limit = parseInt(searchParams.get('limit') || '3');

  if (!walletAddress) {
    return NextResponse.json({ error: 'wallet parameter required' }, { status: 400 });
  }

  try {
    // Get users that the current user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_wallet')
      .eq('follower_wallet', walletAddress);

    const followingWallets = following?.map(f => f.following_wallet) || [];

    // Get users that your friends follow (2nd degree)
    const { data: suggestions } = await supabase
      .from('follows')
      .select(`
        following_wallet,
        follower_wallet,
        follower:users!follows_follower_wallet_fkey (
          username,
          display_name,
          avatar_url
        ),
        suggested:users!follows_following_wallet_fkey (
          wallet_address,
          username,
          display_name,
          avatar_url
        )
      `)
      .in('follower_wallet', followingWallets)
      .not('following_wallet', 'in', `(${[walletAddress, ...followingWallets].join(',')})`)
      .limit(50);

    // Group by suggested user, collect followers
    const grouped = (suggestions || []).reduce((acc: any, s: any) => {
      const wallet = s.following_wallet;
      if (!acc[wallet]) {
        acc[wallet] = {
          ...s.suggested,
          followed_by: []
        };
      }
      if (s.follower?.username) {
        acc[wallet].followed_by.push(s.follower.username);
      }
      return acc;
    }, {});

    const result = Object.values(grouped).slice(0, limit);
    return NextResponse.json({ suggestions: result });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

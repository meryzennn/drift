import { NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!JUPITER_API_KEY) {
    return NextResponse.json({ error: 'Jupiter API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.jup.ag/tokens/v2/toptraded/1h?limit=${limit}`,
      {
        headers: {
          'x-api-key': JUPITER_API_KEY,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Jupiter API error: ${res.status}`);
    }

    const tokens = await res.json();

    // ponytail: Fetch DexScreener icons in parallel for all tokens. Upgrade: cache icon URLs in DB to avoid repeated fetches.
    const tokensWithIcons = await Promise.all(
      tokens.map(async (token: any) => {
        try {
          const dexRes = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${token.id}`,
            { next: { revalidate: 3600 } }
          );

          if (dexRes.ok) {
            const dexData = await dexRes.json();
            const pair = dexData.pairs?.find((p: any) => p.chainId === 'solana') || dexData.pairs?.[0];

            return {
              mint: token.id,
              symbol: token.symbol,
              name: token.name,
              logo: pair?.info?.imageUrl || token.icon,
              price: token.usdPrice || 0,
              priceChange24h: token.stats24h?.priceChange || 0,
              volume24h: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
              liquidity: token.liquidity || 0,
              marketCap: token.mcap || 0,
            };
          }
        } catch (error) {
          console.error(`Error fetching icon for ${token.id}:`, error);
        }

        return {
          mint: token.id,
          symbol: token.symbol,
          name: token.name,
          logo: token.icon,
          price: token.usdPrice || 0,
          priceChange24h: token.stats24h?.priceChange || 0,
          volume24h: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
          liquidity: token.liquidity || 0,
          marketCap: token.mcap || 0,
        };
      })
    );

    return NextResponse.json({ tokens: tokensWithIcons });
  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tokens' },
      { status: 500 }
    );
  }
}

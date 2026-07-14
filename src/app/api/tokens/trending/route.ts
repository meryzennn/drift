import { NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;
const SOL_MINT = 'So11111111111111111111111111111111111111112';

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

    const mappedTokens = tokens.map((token: any) => ({
      mint: token.id,
      symbol: token.symbol,
      name: token.name,
      logo: token.icon,
      price: token.usdPrice || 0,
      priceChange24h: token.stats24h?.priceChange || 0,
      volume24h: (token.stats24h?.buyVolume || 0) + (token.stats24h?.sellVolume || 0),
      liquidity: token.liquidity || 0,
      marketCap: token.mcap || 0,
    }));

    const solIndex = mappedTokens.findIndex((t: any) => t.mint === SOL_MINT);

    if (solIndex === -1) {
      const solRes = await fetch(
        `https://api.jup.ag/tokens/v2/search?query=${SOL_MINT}`,
        {
          headers: {
            'x-api-key': JUPITER_API_KEY,
          },
        }
      );

      if (solRes.ok) {
        const solData = await solRes.json();
        if (solData && solData.length > 0) {
          const solToken = solData[0];
          mappedTokens.unshift({
            mint: solToken.id,
            symbol: solToken.symbol,
            name: solToken.name,
            logo: solToken.icon,
            price: solToken.usdPrice || 0,
            priceChange24h: solToken.stats24h?.priceChange || 0,
            volume24h: (solToken.stats24h?.buyVolume || 0) + (solToken.stats24h?.sellVolume || 0),
            liquidity: solToken.liquidity || 0,
            marketCap: solToken.mcap || 0,
          });
        }
      }
    } else if (solIndex > 0) {
      const solToken = mappedTokens.splice(solIndex, 1)[0];
      mappedTokens.unshift(solToken);
    }

    return NextResponse.json({ tokens: mappedTokens });
  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tokens' },
      { status: 500 }
    );
  }
}

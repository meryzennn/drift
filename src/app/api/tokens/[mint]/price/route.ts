import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;

  try {
    // Fetch price from Jupiter Price API v2
    const response = await fetch(
      `https://price.jup.ag/v4/price?ids=${mint}`,
      { next: { revalidate: 5 } } // Cache for 5 seconds
    );

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[mint]) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    const tokenData = data.data[mint];

    return NextResponse.json({
      mint,
      price: tokenData.price,
      // Jupiter API may not provide 24h change directly, will need DexScreener for that
    });
  } catch (error) {
    console.error('Error fetching token price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token price' },
      { status: 500 }
    );
  }
}

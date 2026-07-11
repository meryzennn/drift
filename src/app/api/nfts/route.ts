import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');

  if (!owner) {
    return NextResponse.json({ error: 'Missing owner address' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'drift-nfts',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: owner,
          page: 1,
          limit: 1000,
          displayOptions: {
             showFungible: false,
             showNativeBalance: false,
          },
        },
      }),
      // Revalidate every 5 minutes to avoid hitting rate limits too fast
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`Helius API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Check if result exists, if not it might be an error from Helius
    if (data.error) {
      throw new Error(data.error.message || 'Helius RPC Error');
    }

    return NextResponse.json(data.result);
  } catch (error: any) {
    console.error('Error fetching NFTs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch NFTs' }, { status: 500 });
  }
}

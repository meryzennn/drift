import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');

  if (!owner) {
    return NextResponse.json({ error: 'Missing owner address' }, { status: 400 });
  }

  const endpoint = process.env.NEXT_PUBLIC_HELIUS_MAINNET_URL;
  if (!endpoint) {
    return NextResponse.json({ error: 'Helius mainnet URL not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(endpoint, {
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
      // Do not cache to avoid 2MB limit errors on large wallets
      cache: 'no-store'
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

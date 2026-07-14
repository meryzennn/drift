import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '1d';
  const { mint } = await params;

  const timeframeToDays: Record<string, number> = {
    '1h': 0.04,
    '4h': 0.17,
    '1d': 1,
    '1w': 7,
    '1m': 30,
  };

  const days = timeframeToDays[timeframe] || 1;

  try {
    // Step 1: Get coin ID from Solana contract address
    const coinInfoRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/contract/${mint}`,
      { next: { revalidate: 3600 } }
    );

    if (!coinInfoRes.ok) {
      return NextResponse.json(
        { error: 'Token not found on CoinGecko' },
        { status: 404 }
      );
    }

    const coinInfo = await coinInfoRes.json();
    const coinId = coinInfo.id;

    // Step 2: Fetch OHLC data using coin ID
    const ohlcRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
      { next: { revalidate: 300 } }
    );

    if (!ohlcRes.ok) {
      return NextResponse.json(
        { error: 'OHLC data not available' },
        { status: 404 }
      );
    }

    const ohlcData = await ohlcRes.json();

    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      return NextResponse.json(
        { error: 'No chart data available' },
        { status: 404 }
      );
    }

    const chartData = ohlcData.map((candle: number[]) => ({
      time: Math.floor(candle[0] / 1000),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: 0,
    }));

    return NextResponse.json({
      timeframe,
      data: chartData,
      currentPrice: chartData[chartData.length - 1]?.close || 0,
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

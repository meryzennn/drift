"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TokenChart from "@/components/TokenChart";
import AnimatedPrice from "@/components/AnimatedPrice";

interface TokenData {
  mint: string;
  symbol: string;
  name: string;
  logo: string | null;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
}

export default function TokenPage() {
  const params = useParams();
  const router = useRouter();
  const mint = params.mint as string;

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const res = await fetch('/api/tokens/trending?limit=50');
        const data = await res.json();

        const token = data.tokens?.find((t: TokenData) => t.mint === mint);

        if (!token) {
          setError('Token not found');
          return;
        }

        setTokenData(token);
      } catch (err) {
        console.error('Error fetching token data:', err);
        setError('Failed to load token data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenData();
    const interval = setInterval(fetchTokenData, 10000);
    return () => clearInterval(interval);
  }, [mint]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="text-center py-2xl">
        <span className="material-symbols-outlined text-[48px] text-outline block mb-sm">error</span>
        <p className="text-on-surface-variant font-body-md mb-md">{error || 'Token not found'}</p>
        <Link href="/" className="text-primary hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="sticky top-[64px] z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md py-md mb-lg">
        <div className="flex items-center gap-md">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <div className="flex items-center gap-sm flex-1">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden shrink-0">
              {tokenData.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tokenData.logo} alt={tokenData.symbol} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20" />
              )}
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">{tokenData.symbol}</h1>
              <p className="text-on-surface-variant text-[14px] font-mono">{tokenData.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg mb-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-lg font-mono">
          <div>
            <div className="text-outline text-[12px] uppercase tracking-wide mb-xs">Price</div>
            <AnimatedPrice price={tokenData.price} className="text-on-surface text-[20px] font-bold block" />
            <div className={`flex items-center gap-1 text-[14px] mt-xs ${tokenData.priceChange24h >= 0 ? 'text-secondary' : 'text-error'}`}>
              <span className="material-symbols-outlined text-[16px]">
                {tokenData.priceChange24h >= 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {Math.abs(tokenData.priceChange24h).toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="text-outline text-[12px] uppercase tracking-wide mb-xs">Volume (24h)</div>
            <div className="text-on-surface text-[20px] font-bold">
              ${tokenData.volume24h >= 1000000
                ? `${(tokenData.volume24h / 1000000).toFixed(2)}M`
                : `${(tokenData.volume24h / 1000).toFixed(1)}K`}
            </div>
          </div>

          <div>
            <div className="text-outline text-[12px] uppercase tracking-wide mb-xs">Liquidity</div>
            <div className="text-on-surface text-[20px] font-bold">
              ${tokenData.liquidity >= 1000000
                ? `${(tokenData.liquidity / 1000000).toFixed(2)}M`
                : `${(tokenData.liquidity / 1000).toFixed(1)}K`}
            </div>
          </div>

          <div>
            <div className="text-outline text-[12px] uppercase tracking-wide mb-xs">Market Cap</div>
            <div className="text-on-surface text-[20px] font-bold">
              ${tokenData.marketCap >= 1000000
                ? `${(tokenData.marketCap / 1000000).toFixed(2)}M`
                : `${(tokenData.marketCap / 1000).toFixed(1)}K`}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md mb-lg">
        <h3 className="font-headline-sm text-on-surface font-bold mb-md">Price Chart</h3>
        <TokenChart mint={mint} />
      </div>
    </div>
  );
}

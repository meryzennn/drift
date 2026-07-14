"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AnimatedPrice from "./AnimatedPrice";

interface Token {
  mint: string;
  symbol: string;
  name: string;
  logo: string | null;
  price: number;
  priceChange24h: number;
  volume24h: number;
}

export default function TrendingTokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/tokens/trending?limit=50');
        const data = await res.json();

        const uniqueTokens = Object.values(
          (data.tokens || []).reduce((acc: Record<string, Token>, token: Token) => {
            if (!acc[token.mint] || (acc[token.mint].volume24h < token.volume24h)) {
              acc[token.mint] = token;
            }
            return acc;
          }, {})
        ) as Token[];

        setTokens(uniqueTokens);
      } catch (error) {
        console.error('Error fetching trending tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
    const interval = setInterval(fetchTrending, 10000);
    return () => clearInterval(interval);
  }, []);

  const displayTokens = tokens.slice(page * 10, (page + 1) * 10);
  const totalPages = Math.ceil(tokens.length / 10);

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
      <div className="flex justify-between items-center mb-md px-xs">
        <h3 className="font-headline-md text-[18px] font-bold text-on-surface">Trending Tokens</h3>
        {totalPages > 1 && (
          <div className="flex gap-xs">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-6 h-6 rounded-full hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface">chevron_left</span>
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-6 h-6 rounded-full hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface">chevron_right</span>
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-sm">
        {isLoading ? (
          <div className="animate-pulse space-y-4 p-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="h-12 bg-surface-container-highest rounded-lg"></div>
            ))}
          </div>
        ) : displayTokens.length > 0 ? (
          displayTokens.map((token, index) => (
            <Link
              key={token.mint}
              href={`/token/${token.mint}`}
              className="hover:bg-surface-container-high p-sm rounded-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg block animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden shrink-0">
                  {token.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="font-label-md font-bold text-on-surface truncate">{token.symbol}</div>
                    {token.mint === 'So11111111111111111111111111111111111111112' && (
                      <span className="material-symbols-outlined text-[14px] text-primary" title="Pinned">push_pin</span>
                    )}
                  </div>
                  <div className="text-outline text-[12px] font-body-sm truncate">{token.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <AnimatedPrice price={token.price} className="font-mono text-[13px] text-on-surface" />
                  <div className={`flex items-center gap-0.5 text-[12px] font-mono justify-end ${token.priceChange24h >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {token.priceChange24h >= 0 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    {Math.abs(token.priceChange24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-md text-on-surface-variant font-body-sm">
            No trending tokens right now
          </div>
        )}
      </div>
    </div>
  );
}

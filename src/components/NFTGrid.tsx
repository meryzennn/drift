"use client";

import { useState, useEffect } from "react";

interface NFTGridProps {
  walletAddress: string;
  featuredNfts?: string[];
}

export default function NFTGrid({ walletAddress, featuredNfts = [] }: NFTGridProps) {
  const [nfts, setNfts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNft, setSelectedNft] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!walletAddress) return;

    const fetchNFTs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/nfts?owner=${walletAddress}`);
        const data = await res.json();
        
        if (!res.ok) {
          if (data.error && data.error.includes("API key not configured")) {
            setError("Missing Helius API Key. Please add NEXT_PUBLIC_HELIUS_API_KEY to your .env.local file.");
          } else {
            throw new Error(data.error || "Failed to fetch NFTs");
          }
          return;
        }

        // Helius returns items in data.items
        setNfts(data.items || []);
      } catch (err: any) {
        console.error("Fetch NFT error:", err);
        setError("Error loading NFTs. Make sure the wallet has NFTs on mainnet.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [walletAddress]);

  useEffect(() => {
    if (selectedNft) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedNft]);

  // Filter out items without images (some tokens are fungible despite the filter, or have no metadata)
  const validNfts = nfts.filter(nft => {
    const img = nft.content?.files?.[0]?.uri || nft.content?.links?.image;
    return !!img;
  });

  const sortedNfts = [...validNfts].sort((a, b) => {
    const aFeaturedIndex = featuredNfts.indexOf(a.id);
    const bFeaturedIndex = featuredNfts.indexOf(b.id);

    // Both featured
    if (aFeaturedIndex !== -1 && bFeaturedIndex !== -1) {
      return aFeaturedIndex - bFeaturedIndex;
    }
    // Only A is featured
    if (aFeaturedIndex !== -1) return -1;
    // Only B is featured
    if (bFeaturedIndex !== -1) return 1;
    // Neither featured
    return 0;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedNfts.length / ITEMS_PER_PAGE);
  const visibleNfts = sortedNfts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-2xl">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2xl px-6 text-center">
        <div className="inline-flex bg-error/10 text-error p-md rounded-2xl max-w-lg items-center gap-3 text-left">
          <span className="material-symbols-outlined text-[32px]">error</span>
          <div>
            <p className="font-bold font-label-lg mb-1">Configuration Error</p>
            <p className="font-body-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (validNfts.length === 0) {
    return (
      <div className="text-center py-2xl px-6">
        <div className="bg-surface-container-high w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[40px] text-outline">image_not_supported</span>
        </div>
        <h3 className="font-headline-sm font-bold text-on-surface mb-2">No NFTs found</h3>
        <p className="font-body-md text-on-surface-variant max-w-sm mx-auto">
          This wallet doesn&apos;t seem to hold any NFTs on Solana mainnet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleNfts.map((nft) => {
          const imgUrl = nft.content?.files?.[0]?.uri || nft.content?.links?.image;
          const name = nft.content?.metadata?.name || "Unknown NFT";
          const collection = nft.grouping?.[0]?.collection_metadata?.name;

          return (
            <div 
              key={nft.id} 
              className="group bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] transition-all cursor-pointer flex flex-col"
              onClick={() => setSelectedNft(nft)}
            >
              <div className="aspect-square bg-surface-container-highest relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imgUrl} 
                  alt={name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSIjMmQyZDMzIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+';
                  }}
                />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="font-label-md font-bold text-on-surface truncate">{name}</p>
                {collection ? (
                  <p className="font-body-sm text-on-surface-variant truncate">{collection}</p>
                ) : (
                  <p className="font-body-sm text-outline truncate text-[11px]">Token ID: {nft.id.slice(0, 8)}...</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pb-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          
          <span className="font-label-md text-on-surface-variant">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNft && (
        <div 
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4 md:p-8"
          onClick={() => setSelectedNft(null)}
        >
          <div 
            className="bg-surface-container-high w-full max-w-5xl max-h-full rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedNft(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            {/* Left: Image */}
            <div className="w-full md:w-1/2 bg-surface-container-highest relative flex items-center justify-center min-h-[300px] md:min-h-[500px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedNft.content?.files?.[0]?.uri || selectedNft.content?.links?.image} 
                alt={selectedNft.content?.metadata?.name || "NFT Image"}
                className="w-full h-full object-contain absolute inset-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSIjMmQyZDMzIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+';
                }}
              />
            </div>

            {/* Right: Details */}
            <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto max-h-[50vh] md:max-h-none flex flex-col gap-6 custom-scrollbar">
              <div>
                {selectedNft.grouping?.[0]?.collection_metadata?.name && (
                  <p className="text-primary font-label-md font-bold mb-1 uppercase tracking-wider">
                    {selectedNft.grouping[0].collection_metadata.name}
                  </p>
                )}
                <h2 className="text-3xl md:text-4xl font-headline-lg font-bold text-on-surface mb-2">
                  {selectedNft.content?.metadata?.name || "Unknown NFT"}
                </h2>
              </div>

              {selectedNft.content?.metadata?.description && (
                <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/50">
                  <h3 className="font-label-md text-on-surface-variant mb-2">Description</h3>
                  <p className="font-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                    {selectedNft.content.metadata.description}
                  </p>
                </div>
              )}

              {selectedNft.content?.metadata?.attributes && selectedNft.content.metadata.attributes.length > 0 && (
                <div>
                  <h3 className="font-label-md text-on-surface-variant mb-3">Attributes</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedNft.content.metadata.attributes.map((attr: any, idx: number) => (
                      <div key={idx} className="bg-surface-container rounded-xl p-3 border border-outline-variant/30 flex flex-col justify-center text-center hover:border-primary/40 transition-colors">
                        <span className="font-label-sm text-on-surface-variant uppercase text-[10px] tracking-wider mb-1">
                          {attr.trait_type}
                        </span>
                        <span className="font-label-md font-bold text-on-surface truncate">
                          {attr.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-outline-variant/50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-body-sm text-on-surface-variant">Mint Address</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-on-surface bg-surface-container-highest px-2 py-1 rounded">
                      {selectedNft.id.slice(0, 6)}...{selectedNft.id.slice(-4)}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedNft.id);
                        // Optional: trigger toast
                      }}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                      title="Copy Address"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                    <a 
                      href={`https://solscan.io/token/${selectedNft.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-on-surface-variant hover:text-primary transition-colors"
                      title="View on Solscan"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </a>
                  </div>
                </div>
                {selectedNft.ownership?.owner && (
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-on-surface-variant">Owner</span>
                    <span className="font-mono text-xs text-on-surface bg-surface-container-highest px-2 py-1 rounded">
                      {selectedNft.ownership.owner.slice(0, 6)}...{selectedNft.ownership.owner.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

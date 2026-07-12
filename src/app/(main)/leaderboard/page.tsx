import { supabase } from "@/utils/supabase";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const revalidate = 0;

export default async function LeaderboardPage() {
  const { data: topTippers } = await supabase
    .from("top_tippers")
    .select(`
      from_wallet,
      total_tipped,
      total_tipped_usd,
      users!inner (
        username,
        display_name,
        avatar_url
      )
    `)
    .limit(50);

  let fallbackSolPrice = 145; // Default fallback
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", { next: { revalidate: 60 } });
    const data = await res.json();
    if (data?.price) {
      fallbackSolPrice = parseFloat(data.price);
    } else {
      throw new Error("Invalid Binance response");
    }
  } catch (e) {
    try {
      const res2 = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { next: { revalidate: 60 } });
      const data2 = await res2.json();
      if (data2?.solana?.usd) {
        fallbackSolPrice = parseFloat(data2.solana.usd);
      }
    } catch (e2) {
      // Ignore and use default fallback
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-background min-h-screen pb-xl">
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md mb-md">
        <div className="py-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BackButton />
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Top Tippers</h2>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
        <div className="p-lg bg-surface-container-high border-b border-outline-variant">
          <h3 className="font-headline-md text-on-surface">Global Leaderboard</h3>
          <p className="font-body-md text-on-surface-variant mt-xs">The most generous patrons on Drift.</p>
        </div>

        {(!topTippers || topTippers.length === 0) ? (
          <div className="p-xl text-center text-on-surface-variant font-body-md">
            No tips recorded yet. Be the first to tip!
          </div>
        ) : (
          <div className="flex flex-col">
            {topTippers.map((tipper: any, index: number) => (
              <Link 
                key={tipper.from_wallet} 
                href={`/profile/${tipper.users?.username || tipper.from_wallet}`}
                className={`flex items-center justify-between p-md hover:bg-surface-container-high transition-colors group cursor-pointer ${
                  index !== topTippers.length - 1 ? "border-b border-outline-variant/50" : ""
                }`}
              >
                <div className="flex items-center gap-md">
                  <div className="w-8 font-headline-md text-on-surface-variant text-center">
                    {index + 1}
                  </div>
                  
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-surface-container-highest flex items-center justify-center font-bold text-on-surface relative text-xl group-hover:border-primary/50 transition-colors">
                    {tipper.users?.avatar_url ? (
                      <img src={tipper.users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[24px] text-primary">person</span>
                    )}
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-surface-container-highest shadow-sm">
                        <span className="material-symbols-outlined text-[12px] text-yellow-900" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center border-2 border-surface-container-highest shadow-sm">
                        <span className="material-symbols-outlined text-[12px] text-gray-800" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center border-2 border-surface-container-highest shadow-sm">
                        <span className="material-symbols-outlined text-[12px] text-amber-950" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <div className="font-headline-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {tipper.users?.display_name || "Anonymous"}
                    </div>
                    <div className="font-mono text-[14px] text-on-surface-variant">
                      @{tipper.users?.username || formatAddress(tipper.from_wallet)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <div className="text-primary font-label-lg sm:font-headline-md bg-primary/10 px-sm py-1 sm:px-md sm:py-sm rounded-lg flex items-center gap-xs">
                    <svg className="w-[14px] h-[10px] sm:w-[18px] sm:h-[14px] fill-current shrink-0" viewBox="0 0 397 311" xmlns="http://www.w3.org/2000/svg">
                      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
                      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
                      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6 11.1l-62.7-62.7z" />
                    </svg>
                    {tipper.total_tipped} SOL
                  </div>
                  {tipper.total_tipped_usd > 0 ? (
                    <span className="text-on-surface-variant text-xs pr-1 font-mono">
                      ${Number(tipper.total_tipped_usd).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant text-xs pr-1 font-mono">
                      ${Number(tipper.total_tipped * fallbackSolPrice).toFixed(2)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

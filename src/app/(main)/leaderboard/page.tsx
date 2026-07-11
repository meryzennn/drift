import { supabase } from "@/utils/supabase";

export const revalidate = 0;

export default async function LeaderboardPage() {
  const { data: topTippers } = await supabase
    .from("top_tippers")
    .select(`
      from_wallet,
      total_tipped,
      users!inner (
        username,
        display_name,
        avatar_url
      )
    `)
    .limit(50);

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-background min-h-screen pb-xl">
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant -mx-md px-md mb-md">
        <div className="py-md flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Top Tippers</h2>
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
              <div 
                key={tipper.from_wallet} 
                className={`flex items-center justify-between p-md hover:bg-surface-container-high transition-colors ${
                  index !== topTippers.length - 1 ? "border-b border-outline-variant/50" : ""
                }`}
              >
                <div className="flex items-center gap-md">
                  <div className="w-8 font-headline-md text-on-surface-variant text-center">
                    {index + 1}
                  </div>
                  
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-surface-container-highest flex items-center justify-center font-bold text-on-surface relative text-xl">
                    {tipper.users?.avatar_url ? (
                      <img src={tipper.users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      tipper.from_wallet.slice(0, 2)
                    )}
                    {index === 0 && (
                      <div className="absolute -top-2 -right-2 text-2xl">👑</div>
                    )}
                    {index === 1 && (
                      <div className="absolute -top-2 -right-2 text-xl">🥈</div>
                    )}
                    {index === 2 && (
                      <div className="absolute -top-2 -right-2 text-xl">🥉</div>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-label-lg text-on-surface font-bold text-[18px]">
                      {tipper.users?.display_name || "Unknown"}
                    </div>
                    <div className="font-mono text-[14px] text-on-surface-variant">
                      @{tipper.users?.username || formatAddress(tipper.from_wallet)}
                    </div>
                  </div>
                </div>
                
                <div className="text-primary font-headline-md bg-primary/10 px-md py-sm rounded-lg flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  {tipper.total_tipped} SOL
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

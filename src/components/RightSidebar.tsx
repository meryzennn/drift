"use client";

export default function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-lg w-80 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pt-xl pb-lg hide-scrollbar">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-md px-xs">Trending in Web3</h3>
        <div className="flex flex-col gap-sm">
          <div className="px-xs py-sm hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">DeFi</div>
            <div className="font-label-md text-on-surface">Liquidity Pools V3</div>
            <div className="font-body-sm text-body-sm text-on-surface-variant mt-xs">15.4K Posts</div>
          </div>
          <div className="px-xs py-sm hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Infrastructure</div>
            <div className="font-label-md text-on-surface">ZK Rollups</div>
            <div className="font-body-sm text-body-sm text-on-surface-variant mt-xs">8.2K Posts</div>
          </div>
          <div className="px-xs py-sm hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">NFTs</div>
            <div className="font-label-md text-on-surface">Generative Architecture</div>
            <div className="font-body-sm text-body-sm text-on-surface-variant mt-xs">4.1K Posts</div>
          </div>
        </div>
        <button className="w-full text-left font-label-md text-primary mt-md px-xs hover:underline">Show more</button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-md px-xs">Who to follow</h3>
        <div className="flex flex-col gap-md">
          <div className="flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-surface-container-high flex items-center justify-center font-bold text-on-surface">V</div>
              <div>
                <div className="font-label-md text-on-surface line-clamp-1">Venture Dao</div>
                <div className="font-mono text-[12px] text-on-surface-variant line-clamp-1">@VnDao...X1m</div>
              </div>
            </div>
            <button className="bg-inverse-surface text-inverse-on-surface px-md py-xs rounded-full font-label-sm hover:opacity-90 transition-opacity">Follow</button>
          </div>
          <div className="flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-surface-container-high flex items-center justify-center font-bold text-on-surface">P</div>
              <div>
                <div className="font-label-md text-on-surface line-clamp-1">Protocol Labs</div>
                <div className="font-mono text-[12px] text-on-surface-variant line-clamp-1">@PcLb...9Kz</div>
              </div>
            </div>
            <button className="bg-inverse-surface text-inverse-on-surface px-md py-xs rounded-full font-label-sm hover:opacity-90 transition-opacity">Follow</button>
          </div>
        </div>
      </div>
      
      <div className="mt-md flex flex-wrap gap-x-3 gap-y-1 px-2 font-body-sm text-body-sm text-outline text-[12px]">
        <a className="hover:underline" href="#">Terms of Service</a>
        <a className="hover:underline" href="#">Privacy Policy</a>
        <a className="hover:underline" href="#">Cookie Policy</a>
        <span>© 2024 Drift</span>
      </div>
    </aside>
  );
}

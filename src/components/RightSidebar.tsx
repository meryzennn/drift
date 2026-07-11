export default function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-lg w-80 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pt-xl pb-lg hide-scrollbar">
      
      {/* Search Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input 
          type="text" 
          placeholder="Search Drift" 
          className="w-full bg-surface-container-high text-on-surface rounded-full py-2 pl-10 pr-4 outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary transition-all font-body-sm"
        />
      </div>

      {/* Trending Section */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-md px-xs">Trending in Web3</h3>
        <div className="flex flex-col gap-sm">
          {[
            { tag: "#Solana", tweets: "124K", category: "Technology" },
            { tag: "$JUP", tweets: "89K", category: "DeFi" },
            { tag: "Breakpoint 2026", tweets: "45K", category: "Events" },
            { tag: "NFTs", tweets: "34K", category: "Art" },
            { tag: "#Drift", tweets: "21K", category: "Social" },
          ].map((item, i) => (
            <div key={i} className="hover:bg-surface-container-high p-sm rounded-lg cursor-pointer transition-colors">
              <div className="flex justify-between items-start">
                <div className="text-outline text-[12px] font-body-sm">{item.category} · Trending</div>
                <span className="material-symbols-outlined text-outline text-[16px] hover:text-primary">more_horiz</span>
              </div>
              <div className="font-label-lg font-bold text-on-surface my-0.5">{item.tag}</div>
              <div className="text-outline text-[12px] font-body-sm">{item.tweets} posts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Who to follow Section */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-md px-xs">Who to follow</h3>
        <div className="flex flex-col gap-sm">
          {[
            { name: "Solana Foundation", handle: "@solanaFndn", initials: "SF" },
            { name: "Drift Protocol", handle: "@driftprotocol", initials: "DP" },
            { name: "Anatoly Yakovenko", handle: "@aeyakovenko", initials: "AY" },
          ].map((user, i) => (
            <div key={i} className="flex justify-between items-center hover:bg-surface-container-high p-sm rounded-lg cursor-pointer transition-colors">
              <div className="flex items-center gap-xs overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-on-surface shrink-0">
                  {user.initials}
                </div>
                <div className="overflow-hidden">
                  <div className="font-label-md text-on-surface font-bold truncate">{user.name}</div>
                  <div className="font-mono text-[12px] text-on-surface-variant truncate">{user.handle}</div>
                </div>
              </div>
              <button className="bg-primary text-background font-label-sm font-bold px-sm py-1.5 rounded-full hover:bg-primary/90 transition-colors shrink-0">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}

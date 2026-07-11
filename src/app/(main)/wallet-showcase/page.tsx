"use client";

import Image from "next/image";

export default function WalletShowcase() {
  return (
    <div className="w-full max-w-[1200px] px-lg py-xl flex flex-col gap-2xl relative z-10 mx-auto">
      {/* Showcase Header */}
      <div className="text-center mb-xl">
        <h1 className="font-display text-display text-on-background mb-sm">Wallet Interaction States</h1>
        <p className="font-body-lg text-on-surface-variant">Technical Luxury UI pattern showcase for Drift Web3 Social.</p>
      </div>

      {/* Section 1: Connect Wallet Button (Unconnected State in Nav Context) */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-xl flex flex-col gap-lg">
        <h2 className="font-headline-md text-on-background">1. Disconnected State (TopAppBar Context)</h2>
        <p className="font-body-md text-on-surface-variant mb-md">The primary CTA when a user arrives. Pill-shaped, high-contrast, electric blue with a subtle glow.</p>
        <header className="flex justify-between items-center w-full border border-[#27272a] rounded-xl p-md bg-[#000000]">
          <div className="font-headline-md font-bold text-on-background tracking-tight">Drift</div>
          <div className="flex items-center gap-md">
            {/* Connect Wallet Button */}
            <button className="bg-primary-container text-white rounded-full px-lg py-sm flex items-center gap-sm font-label-md transition-all hover:brightness-110 active:scale-95 glow-btn border-none cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              Connect Wallet
            </button>
          </div>
        </header>
      </div>

      {/* Section 3: Connected State Dropdown */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-xl flex flex-col gap-lg">
        <h2 className="font-headline-md text-on-background">2. Connected State Dropdown (Active Menu)</h2>
        <p className="font-body-md text-on-surface-variant mb-md">Triggered by the connected wallet pill. Shows balance, address, and quick actions.</p>
        <div className="flex justify-center p-2xl border border-[#27272a] rounded-xl bg-[#000000] relative h-[300px]">
          {/* Connected Pill Trigger */}
          <button className="absolute top-md right-md bg-transparent border border-[#27272a] rounded-full px-md py-xs flex items-center gap-sm hover:bg-[#18181b] transition-colors group cursor-pointer">
            <div className="w-2 h-2 rounded-full bg-secondary-fixed shadow-[0_0_8px_rgba(111,251,190,0.6)]"></div>
            <span className="font-mono text-on-surface">FjH2...M7q</span>
            <span className="material-symbols-outlined text-[16px] text-[#a1a1aa] group-hover:text-on-surface transition-colors">expand_more</span>
          </button>

          {/* Dropdown Menu (Open State) */}
          <div className="absolute top-[60px] right-md w-64 bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col">
            {/* Header */}
            <div className="p-md border-b border-[#27272a] flex items-center gap-md">
              <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0 border border-[#27272a] flex items-center justify-center font-bold">
                A
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-on-background">FjH2...M7q</span>
                <span className="font-label-sm text-secondary-fixed">Connected</span>
              </div>
            </div>
            {/* Balance */}
            <div className="p-md border-b border-[#27272a] flex flex-col gap-xs">
              <span className="font-label-sm text-[#a1a1aa] uppercase tracking-wider">Balance</span>
              <div className="flex items-end gap-xs">
                <span className="font-headline-md text-on-background">12.45</span>
                <span className="font-body-sm text-[#a1a1aa] pb-[2px]">SOL</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex flex-col p-xs">
              <button className="flex items-center gap-sm p-sm rounded-md hover:bg-[#27272a] text-on-surface transition-colors font-label-md w-full text-left cursor-pointer border-none bg-transparent">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Copy Address
              </button>
              <button className="flex items-center gap-sm p-sm rounded-md hover:bg-[#27272a] text-on-surface transition-colors font-label-md w-full text-left cursor-pointer border-none bg-transparent">
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                View on Explorer
              </button>
            </div>
            <div className="p-xs border-t border-[#27272a]">
              <button className="flex items-center gap-sm p-sm rounded-md hover:bg-error-container/20 text-error transition-colors font-label-md w-full text-left cursor-pointer border-none bg-transparent">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Select Wallet Modal */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-xl flex flex-col gap-lg">
        <h2 className="font-headline-md text-on-background">3. Select Wallet Modal</h2>
        <div className="relative w-full h-[400px] border border-[#27272a] rounded-xl bg-[#000000] overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 glass-modal pointer-events-auto"></div>
          
          <div className="relative z-10 w-full max-w-md bg-[#09090b] border border-[#27272a] rounded-[12px] shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-md border-b border-[#27272a]">
              <h3 className="font-headline-md text-on-background">Connect a Wallet</h3>
              <button className="text-[#a1a1aa] hover:text-on-background transition-colors p-xs rounded-md hover:bg-[#27272a] bg-transparent border-none cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-sm flex flex-col gap-xs">
              <button className="flex items-center justify-between p-md rounded-lg hover:bg-[#27272a] transition-colors w-full text-left group bg-transparent border-none cursor-pointer">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center border border-[#27272a] font-bold">
                    P
                  </div>
                  <span className="font-label-md text-on-background group-hover:text-primary transition-colors">Phantom</span>
                </div>
                <span className="px-sm py-xs bg-[#27272a] text-[#a1a1aa] rounded text-[10px] font-semibold uppercase tracking-wider">Recent</span>
              </button>
              
              <button className="flex items-center justify-between p-md rounded-lg hover:bg-[#27272a] transition-colors w-full text-left group bg-transparent border-none cursor-pointer">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center border border-[#27272a] font-bold">
                    S
                  </div>
                  <span className="font-label-md text-on-background group-hover:text-primary transition-colors">Solflare</span>
                </div>
                <span className="px-sm py-xs bg-[#27272a] text-secondary-fixed rounded text-[10px] font-semibold uppercase tracking-wider">Detected</span>
              </button>

              <button className="flex items-center justify-between p-md rounded-lg hover:bg-[#27272a] transition-colors w-full text-left group bg-transparent border-none cursor-pointer">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center border border-[#27272a] font-bold">
                    B
                  </div>
                  <span className="font-label-md text-on-background group-hover:text-primary transition-colors">Backpack</span>
                </div>
              </button>
            </div>
            {/* Modal Footer */}
            <div className="p-md border-t border-[#27272a] bg-[#18181b]/50 flex justify-center">
              <button className="text-[#a1a1aa] hover:text-on-background text-sm flex items-center gap-xs transition-colors bg-transparent border-none cursor-pointer">
                <span className="font-label-sm">Don't have a wallet?</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

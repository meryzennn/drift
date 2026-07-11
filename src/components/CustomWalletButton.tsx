"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useRef, useEffect } from "react";
import WalletModal from "./WalletModal";

export default function CustomWalletButton() {
  const { connected, publicKey, disconnect } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // If not connected, show the connect button
  if (!connected) {
    return (
      <>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-container text-white rounded-full px-lg py-sm flex items-center gap-sm font-label-md transition-all hover:brightness-110 active:scale-95 glow-btn border-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          Connect Wallet
        </button>
        <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Format the address for display
  const address = publicKey ? publicKey.toBase58() : "";
  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-3)}` : "";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Connected Pill Trigger */}
      <button 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="bg-transparent border border-[#27272a] rounded-full px-md py-xs flex items-center gap-sm hover:bg-[#18181b] transition-colors group cursor-pointer"
      >
        <div className="w-2 h-2 rounded-full bg-secondary-fixed shadow-[0_0_8px_rgba(111,251,190,0.6)]"></div>
        <span className="font-mono text-on-surface">{shortAddress}</span>
        <span className="material-symbols-outlined text-[16px] text-[#a1a1aa] group-hover:text-on-surface transition-colors">
          expand_more
        </span>
      </button>

      {/* Dropdown Menu (Open State) */}
      {isDropdownOpen && (
        <div className="absolute top-[120%] right-0 w-64 bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col">
          {/* Header */}
          <div className="p-md border-b border-[#27272a] flex items-center gap-md">
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0 border border-[#27272a] flex items-center justify-center font-bold text-on-surface">
              {shortAddress[0]}
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-on-background">{shortAddress}</span>
              <span className="font-label-sm text-secondary-fixed">Connected</span>
            </div>
          </div>
          {/* Balance */}
          <div className="p-md border-b border-[#27272a] flex flex-col gap-xs">
            <span className="font-label-sm text-[#a1a1aa] uppercase tracking-wider">Balance</span>
            <div className="flex items-end gap-xs">
              <span className="font-headline-md text-on-background">--</span>
              <span className="font-body-sm text-[#a1a1aa] pb-[2px]">SOL</span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex flex-col p-xs">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(address);
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-sm p-sm rounded-md hover:bg-[#27272a] text-on-surface transition-colors font-label-md w-full text-left cursor-pointer border-none bg-transparent"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              Copy Address
            </button>
            <a 
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center gap-sm p-sm rounded-md hover:bg-[#27272a] text-on-surface transition-colors font-label-md w-full text-left cursor-pointer border-none bg-transparent"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              View on Explorer
            </a>
          </div>
          <div className="p-xs border-t border-[#27272a]">
            <button 
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-sm p-sm rounded-md hover:bg-error-container/20 text-error transition-colors font-label-md w-full text-left cursor-pointer border-none bg-transparent"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

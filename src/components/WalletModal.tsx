"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef } from "react";
import Image from "next/image";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { wallets, select } = useWallet();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      <div className="absolute inset-0 glass-modal"></div>
      
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-md bg-[#09090b] border border-[#27272a] rounded-[12px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-md border-b border-[#27272a]">
          <h3 className="font-headline-md text-on-background">Connect a Wallet</h3>
          <button 
            onClick={onClose}
            className="text-[#a1a1aa] hover:text-on-background transition-colors p-xs rounded-md hover:bg-[#27272a] bg-transparent border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-sm flex flex-col gap-xs max-h-[300px] overflow-y-auto">
          {wallets.map((wallet) => (
            <button 
              key={wallet.adapter.name}
              onClick={() => {
                select(wallet.adapter.name);
                onClose();
              }}
              className="flex items-center justify-between p-md rounded-lg hover:bg-[#27272a] transition-colors w-full text-left group bg-transparent border-none cursor-pointer"
            >
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center border border-[#27272a] bg-white">
                  <Image 
                    src={wallet.adapter.icon} 
                    alt={wallet.adapter.name} 
                    width={24} 
                    height={24} 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <span className="font-label-md text-on-background group-hover:text-primary transition-colors">
                  {wallet.adapter.name}
                </span>
              </div>
              {wallet.readyState === "Installed" && (
                <span className="px-sm py-xs bg-[#27272a] text-secondary-fixed rounded text-[10px] font-semibold uppercase tracking-wider">
                  Detected
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Modal Footer */}
        <div className="p-md border-t border-[#27272a] bg-[#18181b]/50 flex justify-center">
          <a href="https://solana.com/ecosystem/explore?categories=wallet" target="_blank" rel="noopener noreferrer" className="text-[#a1a1aa] hover:text-on-background text-sm flex items-center gap-xs transition-colors bg-transparent border-none cursor-pointer">
            <span className="font-label-sm">Don't have a wallet?</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
}

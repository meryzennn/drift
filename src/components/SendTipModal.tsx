"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface SendTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName?: string;
  recipientAvatar?: string;
  onConfirm: (amount: number) => void;
}

const PRESET_AMOUNTS = [0.05, 0.1, 0.5];
const SOL_TO_USD = 150; // Mock conversion rate

export default function SendTipModal({
  isOpen,
  onClose,
  recipientAddress,
  recipientName = "Anonymous User",
  recipientAvatar,
  onConfirm,
}: SendTipModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0.1);
  const [customAmount, setCustomAmount] = useState<string>("0.1");
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (isOpen && connected && publicKey) {
      connection.getBalance(publicKey).then((b) => setBalance(b / LAMPORTS_PER_SOL));
    }
  }, [isOpen, connected, publicKey, connection]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(0.1);
      setCustomAmount("0.1");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount(amount.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, or numbers with up to 9 decimals
    if (value === "" || /^\d*\.?\d{0,9}$/.test(value)) {
      setCustomAmount(value);
      setSelectedPreset(null);
    }
  };

  const handleConfirm = () => {
    const amountNum = parseFloat(customAmount);
    if (!isNaN(amountNum) && amountNum > 0) {
      onConfirm(amountNum);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const parsedAmount = parseFloat(customAmount) || 0;
  const isSufficientBalance = parsedAmount <= balance;
  const isValidAmount = parsedAmount > 0;
  const canSubmit = connected && isValidAmount && isSufficientBalance;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-md"
      onClick={(e) => e.stopPropagation()} // Stop bubbling to PostCard
    >
      {/* Dimmed Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      ></div>
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className="relative z-10 bg-[#000000] border border-outline-variant rounded-[12px] overflow-hidden flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out"
        style={{ width: "400px", maxWidth: "90vw" }}
      >
        {/* Header */}
        <div className="p-lg pb-md border-b border-outline-variant/50 relative">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="absolute top-md right-md w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          
          <h2 className="font-headline-md text-headline-md text-on-surface mb-xs pr-lg">Send a Tip</h2>
          <div className="flex items-center gap-sm mt-md">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center font-bold text-primary">
              {recipientAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipientAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                recipientAddress ? recipientAddress.slice(0, 2) : "?"
              )}
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              to <span className="font-label-md text-label-md text-on-surface">@{formatAddress(recipientAddress)}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-lg flex flex-col gap-xl">
          {/* Preset Selection */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-md uppercase tracking-wider">
              Select Amount
            </label>
            <div className="grid grid-cols-3 gap-sm">
              {PRESET_AMOUNTS.map((amount) => {
                const isSelected = selectedPreset === amount;
                return (
                  <button
                    key={amount}
                    onClick={(e) => { e.preventDefault(); handlePresetClick(amount); }}
                    className={`flex flex-col items-center justify-center p-sm rounded-lg transition-colors group cursor-pointer ${
                      isSelected 
                        ? "border border-primary-container bg-surface-container-low ring-1 ring-primary-container" 
                        : "border border-outline-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <span className={`font-label-md text-label-md transition-colors ${isSelected ? "text-primary" : "text-on-surface group-hover:text-primary"}`}>
                      {amount} SOL
                    </span>
                    <span className={`font-body-sm text-body-sm mt-xs ${isSelected ? "text-primary/70" : "text-on-surface-variant"}`}>
                      ~${(amount * SOL_TO_USD).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-md uppercase tracking-wider">
              Custom Amount
            </label>
            <div className="relative flex items-center border-b border-outline-variant pb-sm focus-within:border-primary-container transition-colors">
              <input 
                className="w-full bg-transparent border-none p-0 font-display text-display text-on-surface focus:ring-0 placeholder-outline" 
                placeholder="0.00" 
                type="text" 
                value={customAmount}
                onChange={handleCustomAmountChange}
              />
              <button 
                onClick={(e) => { e.preventDefault(); handlePresetClick(balance); }}
                className="absolute right-0 font-label-md text-label-md text-primary hover:text-primary-container transition-colors cursor-pointer bg-transparent border-none"
              >
                MAX
              </button>
            </div>
            <div className="mt-sm flex justify-between items-center">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                ≈ ${(parsedAmount * SOL_TO_USD).toFixed(2)} USD
              </span>
              <span className={`font-body-sm text-body-sm ${isSufficientBalance ? "text-on-surface-variant" : "text-error"}`}>
                Bal: {balance.toFixed(2)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-lg pt-md flex items-center justify-between gap-md border-t border-outline-variant/50 bg-surface-container-lowest">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="px-md py-sm font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none"
          >
            Cancel
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={!canSubmit}
            className="flex-1 flex justify-center items-center gap-sm bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-label-md text-label-md py-sm px-lg rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 border-none cursor-pointer"
          >
            <span>{!connected ? "Connect Wallet" : "Confirm & Send"}</span>
            {connected && (
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" 
    ? createPortal(modalContent, document.body)
    : null;
}

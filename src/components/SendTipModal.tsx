"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface SendTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName?: string;
  onConfirm: (amount: number) => void;
}

const PRESET_AMOUNTS = [0.05, 0.1, 0.5];
const SOL_TO_USD = 150; // Mock conversion rate

export default function SendTipModal({
  isOpen,
  onClose,
  recipientAddress,
  recipientName = "Anonymous User",
  onConfirm,
}: SendTipModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0.1);
  const [customAmount, setCustomAmount] = useState<string>("0.1");
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { connected } = useWallet();
  const mockBalance = 2.45; // Mock balance since we don't have getBalance hooked up yet

  // Handle outside click
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
  const isSufficientBalance = parsedAmount <= mockBalance;
  const isValidAmount = parsedAmount > 0;
  const canSubmit = connected && isValidAmount && isSufficientBalance;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md">
      {/* Dimmed Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-md bg-[#000000] border border-outline-variant rounded-[12px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-lg pb-md border-b border-outline-variant/50">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Send a Tip</h2>
          <div className="flex items-center gap-sm mt-md">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-primary/20 flex items-center justify-center font-bold text-primary">
              {recipientAddress.slice(0, 2)}
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
                    onClick={() => handlePresetClick(amount)}
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
                onClick={() => handlePresetClick(mockBalance)}
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
                Bal: {mockBalance.toFixed(2)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-lg pt-md flex items-center justify-between gap-md border-t border-outline-variant/50 bg-surface-container-lowest">
          <button 
            onClick={onClose}
            className="px-md py-sm font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
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
}

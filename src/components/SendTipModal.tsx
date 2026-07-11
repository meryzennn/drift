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
  onConfirm: (amount: number, message?: string) => void;
  allowMessage?: boolean;
}

const PRESET_AMOUNTS_SOL = [0.05, 0.1, 0.5];

export default function SendTipModal({
  isOpen,
  onClose,
  recipientAddress,
  recipientName = "Anonymous User",
  recipientAvatar,
  onConfirm,
  allowMessage = false,
}: SendTipModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0.1);
  const [solAmount, setSolAmount] = useState<string>("0.1");
  const [usdAmount, setUsdAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [inputMode, setInputMode] = useState<"sol" | "usd">("sol");
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);

  // Fetch live SOL price from Binance (more reliable, no rate limit for public)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT"
        );
        const data = await res.json();
        if (data?.price) {
          setSolPrice(parseFloat(data.price));
        }
      } catch {
        // fallback: try Jupiter
        try {
          const res2 = await fetch("https://price.jup.ag/v6/price?ids=SOL");
          const data2 = await res2.json();
          const price = data2?.data?.SOL?.price;
          if (price) setSolPrice(price);
        } catch {
          setSolPrice(null);
        }
      }
    };
    fetchPrice();
  }, []);

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
      setSolAmount("0.1");
      setUsdAmount(solPrice ? (0.1 * solPrice).toFixed(2) : "");
      setInputMode("sol");
      setMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setSolAmount(amount.toString());
    if (solPrice) setUsdAmount((amount * solPrice).toFixed(2));
    setInputMode("sol");
  };

  const handleSolInput = (val: string) => {
    if (val === "" || /^\d*\.?\d{0,9}$/.test(val)) {
      setSolAmount(val);
      setSelectedPreset(null);
      if (solPrice && val !== "") {
        setUsdAmount((parseFloat(val) * solPrice).toFixed(2));
      } else {
        setUsdAmount("");
      }
    }
  };

  const handleUsdInput = (val: string) => {
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setUsdAmount(val);
      setSelectedPreset(null);
      if (solPrice && val !== "") {
        setSolAmount((parseFloat(val) / solPrice).toFixed(6));
      } else {
        setSolAmount("");
      }
    }
  };

  const handleConfirm = () => {
    const amountNum = parseFloat(solAmount);
    if (!isNaN(amountNum) && amountNum > 0) {
      onConfirm(amountNum, allowMessage ? message : undefined);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const parsedSol = parseFloat(solAmount) || 0;
  const isSufficientBalance = parsedSol <= balance;
  const isValidAmount = parsedSol > 0;
  const canSubmit = connected && isValidAmount && isSufficientBalance;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-md"
      onClick={(e) => e.stopPropagation()}
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
            {solPrice && (
              <span className="ml-auto font-body-sm text-on-surface-variant text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                1 SOL = ${solPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-lg flex flex-col gap-xl">
          {/* Preset Selection */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-md uppercase tracking-wider">
              Quick Select
            </label>
            <div className="grid grid-cols-3 gap-sm">
              {PRESET_AMOUNTS_SOL.map((amount) => {
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
                      {solPrice ? `~$${(amount * solPrice).toFixed(2)}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Input with Toggle */}
          <div>
            <div className="flex items-center justify-between mb-md">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Custom Amount
              </label>
              {solPrice && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setInputMode(prev => prev === "sol" ? "usd" : "sol");
                  }}
                  className="flex items-center gap-xs text-primary text-[11px] font-label-sm border border-primary/30 rounded-full px-2 py-0.5 hover:bg-primary/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
                  {inputMode === "sol" ? "Switch to USD" : "Switch to SOL"}
                </button>
              )}
            </div>

            {/* SOL Input */}
            {inputMode === "sol" && (
              <div>
                <div className="relative flex items-center border-b border-outline-variant pb-sm focus-within:border-primary-container transition-colors">
                  <input 
                    className="w-full bg-transparent border-none p-0 font-display text-display text-on-surface focus:ring-0 placeholder-outline" 
                    placeholder="0.00" 
                    type="text" 
                    value={solAmount}
                    onChange={(e) => handleSolInput(e.target.value)}
                    autoFocus
                  />
                  <span className="font-label-lg text-on-surface-variant mr-sm">SOL</span>
                  <button 
                    onClick={(e) => { e.preventDefault(); handlePresetClick(balance); }}
                    className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors cursor-pointer bg-transparent border-none"
                  >
                    MAX
                  </button>
                </div>
                {solPrice && (
                  <p className="font-body-sm text-on-surface-variant mt-xs">
                    ≈ <span className="text-on-surface">${(parsedSol * solPrice).toFixed(2)} USD</span>
                  </p>
                )}
              </div>
            )}

            {/* USD Input */}
            {inputMode === "usd" && (
              <div>
                <div className="relative flex items-center border-b border-outline-variant pb-sm focus-within:border-primary-container transition-colors">
                  <span className="font-display text-display text-on-surface-variant mr-1">$</span>
                  <input 
                    className="w-full bg-transparent border-none p-0 font-display text-display text-on-surface focus:ring-0 placeholder-outline" 
                    placeholder="0.00" 
                    type="text" 
                    value={usdAmount}
                    onChange={(e) => handleUsdInput(e.target.value)}
                    autoFocus
                  />
                  <span className="font-label-lg text-on-surface-variant mr-sm">USD</span>
                </div>
                <p className="font-body-sm text-on-surface-variant mt-xs">
                  ≈ <span className="text-on-surface">{parseFloat(solAmount || "0").toFixed(6)} SOL</span>
                </p>
              </div>
            )}

            <div className="mt-sm flex justify-end">
              <span className={`font-body-sm text-body-sm ${isSufficientBalance ? "text-on-surface-variant" : "text-error"}`}>
                Balance: {balance.toFixed(4)} SOL
                {solPrice && ` (~$${(balance * solPrice).toFixed(2)})`}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Message Input */}
        {allowMessage && (
          <div className="px-lg pb-md">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message... (optional)"
              maxLength={100}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        )}

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
            <span>{!connected ? "Connect Wallet" : `Send ${parsedSol > 0 ? parsedSol.toFixed(4) : ""} SOL`}</span>
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

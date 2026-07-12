"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
const VALID_POST_TYPES = [...VALID_IMAGE_TYPES, "video/mp4"];

const GIPHY_CATEGORIES = [
  { label: "Trending", query: "", icon: "trending_up" },
  { label: "Reactions", query: "reactions", icon: "mood" },
  { label: "Memes", query: "meme", icon: "sentiment_very_satisfied" },
  { label: "Anime", query: "anime", icon: "auto_awesome" },
  { label: "Gaming", query: "gaming", icon: "sports_esports" },
  { label: "Crypto", query: "crypto", icon: "currency_bitcoin" },
];

interface MediaPickerModalProps {
  type: "avatar" | "banner" | "post";
  maxMB: number;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  allowMultiple?: boolean;
  onGif: (gifUrl: string) => void;
  onClose: () => void;
  defaultTab?: "upload" | "gif" | "nft";
  hideTabs?: boolean;
  showNftTab?: boolean;
}

export default function MediaPickerModal({ type, maxMB, onFile, onFiles, allowMultiple = false, onGif, onClose, defaultTab = "upload", hideTabs = false, showNftTab = false }: MediaPickerModalProps) {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<"upload" | "gif" | "nft">(defaultTab);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GIF state
  const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  const [gifs, setGifs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [gifLoading, setGifLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NFT state
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [nftsFetched, setNftsFetched] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fetch GIFs
  const fetchGifs = useCallback(async (q: string, catIdx: number) => {
    if (!API_KEY) return;
    setGifLoading(true);
    try {
      const cat = GIPHY_CATEGORIES[catIdx];
      const query = q.trim() || cat.query || "trending";
      const endpoint = q.trim() || cat.query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=50&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=50&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifs(json.data || []);
    } catch { /* ignore */ }
    finally { setGifLoading(false); }
  }, [API_KEY]);

  useEffect(() => {
    if (tab !== "gif") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(search, activeCategory), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, activeCategory, tab, fetchGifs]);

  // Fetch NFTs
  useEffect(() => {
    if (tab !== "nft" || !publicKey || nftsFetched) return;
    
    const fetchNfts = async () => {
      setNftsLoading(true);
      try {
        const res = await fetch(`/api/nfts?owner=${publicKey.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        const validNfts = (data.items || []).filter((nft: any) => {
          const img = nft.content?.files?.[0]?.uri || nft.content?.links?.image;
          return !!img;
        });
        
        setNfts(validNfts);
        setNftsFetched(true);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
      } finally {
        setNftsLoading(false);
      }
    };
    
    fetchNfts();
  }, [tab, publicKey, nftsFetched]);

  const validateAndHandle = useCallback((files: FileList | File[]) => {
    setDragError("");
    const validTypes = type === "post" ? VALID_POST_TYPES : VALID_IMAGE_TYPES;
    
    if (allowMultiple && onFiles) {
      const validFiles: File[] = [];
      let hasError = false;
      
      const filesArray = Array.from(files);
      const isVideoArray = filesArray.some(f => f.type.startsWith("video/"));
      const maxCount = isVideoArray ? 3 : 5;
      
      if (filesArray.length > maxCount) {
        setDragError(`Maximum ${maxCount} files allowed.`);
        return;
      }
      
      for (const file of filesArray) {
        if (!validTypes.includes(file.type)) {
          setDragError(`Invalid format. Use JPG, PNG, GIF${type === "post" ? ", or MP4" : ""}.`);
          return;
        }
        if (file.type === "video/mp4" && file.size > 30 * 1024 * 1024) {
          setDragError(`Video too large. Max 30MB.`);
          return;
        } else if (!file.type.startsWith("video/") && file.size > maxMB * 1024 * 1024) {
          setDragError(`Image too large. Max ${maxMB}MB.`);
          return;
        }
        validFiles.push(file);
      }
      
      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    } else {
      const file = files[0];
      if (!file) return;
      
      if (!validTypes.includes(file.type)) {
        setDragError(`Invalid format. Use JPG, PNG, GIF${type === "post" ? ", or MP4" : ""}.`);
        return;
      }
      if (file.type === "video/mp4" && file.size > 30 * 1024 * 1024) {
        setDragError(`Video too large. Max 30MB.`);
        return;
      } else if (!file.type.startsWith("video/") && file.size > maxMB * 1024 * 1024) {
        setDragError(`Image too large. Max ${maxMB}MB.`);
        return;
      }
      if (onFile) onFile(file);
    }
  }, [maxMB, onFile, onFiles, allowMultiple, type]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      validateAndHandle(e.dataTransfer.files);
    }
  };

  let title = "Select Media";
  if (type === "avatar") title = "Change Profile Photo";
  else if (type === "banner") title = "Change Banner";
  else if (tab === "gif") title = "Select GIF";
  else if (tab === "upload") title = "Upload Media";
  else if (tab === "nft") title = "Select NFT";
  const resolution = type === "avatar" ? "800 × 800px · 1:1 ratio" : type === "banner" ? "1500 × 500px · 3:1 ratio" : "All ratios supported";

  const modal = (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-md" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      
      <div
        className="relative w-full max-w-[32rem] bg-[#0f0f13] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: "650px", maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-xl py-md border-b border-[#2a2a3a] shrink-0">
          <h2 className="font-label-lg text-on-surface">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        {!hideTabs && (
          <div className="flex border-b border-[#2a2a3a] shrink-0">
            <button
              onClick={() => setTab("upload")}
              className={`flex-1 flex items-center justify-center gap-xs py-md font-label-md transition-colors ${tab === "upload" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload File
            </button>
            <button onClick={() => setTab("gif")} className={`flex-1 py-3 font-label-md transition-colors ${tab === "gif" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>GIFs</button>
            {showNftTab && (
              <button onClick={() => setTab("nft")} className={`flex-1 py-3 font-label-md transition-colors ${tab === "nft" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>NFTs</button>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {tab === "upload" && (
          <div className="flex flex-col gap-md p-xl">
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-sm p-2xl cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/10" : "border-[#2a2a3a] hover:border-primary/50 hover:bg-surface-container-high"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">{isDragging ? "file_download" : "add_photo_alternate"}</span>
              <div className="text-center">
                <p className="font-label-md text-on-surface">{isDragging ? "Drop to upload" : "Drag & drop image here"}</p>
                <p className="font-body-sm text-on-surface-variant mt-xs">or click to browse</p>
              </div>
            </div>

            {/* File Info */}
            <div className="bg-surface-container rounded-lg p-md flex flex-col gap-xs border border-[#2a2a3a]">
              <p className="font-label-sm text-on-surface-variant">Accepted formats</p>
              <div className="flex gap-xs flex-wrap">
                {["JPG", "PNG", "GIF", ...(type === "post" ? ["MP4"] : [])].map(f => (
                  <span key={f} className="px-xs py-0.5 bg-surface-container-high border border-outline-variant rounded text-[11px] font-label-sm text-on-surface">{f}</span>
                ))}
              </div>
              {type === "post" ? (
                <>
                  <p className="font-body-sm text-on-surface-variant mt-xs">Images: <span className="text-on-surface font-label-sm">Max 10MB</span> <span className="text-outline-variant text-[11px]">(Auto-compressed to ~1MB)</span></p>
                  <p className="font-body-sm text-on-surface-variant mt-1">Videos: <span className="text-on-surface font-label-sm">Max 30MB</span> <span className="text-outline-variant text-[11px]">(Max 720p, 60s)</span></p>
                </>
              ) : (
                <>
                  <p className="font-body-sm text-on-surface-variant mt-xs">Max file size: <span className="text-on-surface font-label-sm">{maxMB}MB</span></p>
                  <p className="font-body-sm text-on-surface-variant">Target resolution: <span className="text-on-surface font-label-sm">{resolution}</span></p>
                  <p className="font-body-sm text-outline-variant text-[11px]">* GIFs are used directly · JPG/PNG will open cropper</p>
                </>
              )}
            </div>

            {dragError && <p className="font-body-sm text-error">{dragError}</p>}

            <input ref={fileInputRef} type="file" multiple={allowMultiple} accept={type === "post" ? ".jpg,.jpeg,.png,.gif,.mp4" : ".jpg,.jpeg,.png,.gif"} className="hidden" onChange={(e) => { if (e.target.files) validateAndHandle(e.target.files); e.target.value = ""; }} />
          </div>
        )}

        {/* GIF Tab */}
        {tab === "gif" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search */}
            <div className="px-xl py-sm border-b border-[#2a2a3a] shrink-0">
              <div className="flex items-center gap-sm bg-surface-container-highest rounded-lg px-md py-sm">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
                <input
                  type="text"
                  placeholder="Search GIFs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-on-surface outline-none font-body-md placeholder:text-on-surface-variant"
                />
                {search && <button onClick={() => setSearch("")} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-[18px]">close</span></button>}
              </div>
            </div>

            {/* Categories */}
            {!search && (
              <div className="flex overflow-x-auto hide-scrollbar gap-xs px-xl py-sm border-b border-[#2a2a3a] shrink-0">
                {GIPHY_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => setActiveCategory(i)} className={`flex items-center gap-xs px-sm py-xs rounded-full text-[12px] font-label-sm whitespace-nowrap transition-colors shrink-0 ${activeCategory === i ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
                    <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* No API Key */}
            {!API_KEY && (
              <div className="flex-1 flex flex-col items-center justify-center p-xl text-center gap-md">
                <span className="material-symbols-outlined text-[48px] text-outline-variant">key_off</span>
                <div>
                  <p className="font-label-md text-on-surface mb-xs">Giphy API Key is missing</p>
                  <p className="font-body-sm text-on-surface-variant">Add <code className="bg-surface-container-high px-xs rounded text-primary">NEXT_PUBLIC_GIPHY_API_KEY</code> to <code className="bg-surface-container-high px-xs rounded text-primary">.env.local</code></p>
                  <a href="https://developers.giphy.com/" target="_blank" rel="noopener noreferrer" className="inline-block mt-sm text-primary font-label-sm hover:underline">Get Free API Key →</a>
                </div>
              </div>
            )}

            {/* GIF Grid */}
            {API_KEY && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-md">
                {gifLoading ? (
                  <div className="flex items-center justify-center h-48 gap-sm text-on-surface-variant">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="font-body-md">Loading GIFs...</span>
                  </div>
                ) : gifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant gap-sm">
                    <span className="material-symbols-outlined text-[40px]">sentiment_dissatisfied</span>
                    <p className="font-body-md">No GIFs found</p>
                  </div>
                ) : (
                  <div className="columns-3 gap-xs space-y-xs">
                    {gifs.map((gif: any) => (
                      <button key={gif.id} onClick={() => onGif(gif.images.downsized_medium?.url || gif.images.original?.url)} className="w-full rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all group block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={gif.images.fixed_height_small?.url} alt={gif.title} className="w-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Giphy Attribution */}
            {API_KEY && (
              <div className="px-xl py-sm border-t border-[#2a2a3a] flex items-center justify-end shrink-0">
                <span className="font-body-sm text-on-surface-variant">Powered by <strong className="text-on-surface">GIPHY</strong></span>
              </div>
            )}
          </div>
        )}

        {/* NFT Tab */}
        {tab === "nft" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {!publicKey ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-md p-md">
                <span className="material-symbols-outlined text-[48px] text-outline-variant">account_balance_wallet</span>
                <div>
                  <p className="font-label-md text-on-surface mb-xs">Wallet not connected</p>
                  <p className="font-body-sm text-on-surface-variant">Connect your wallet to browse your NFTs.</p>
                </div>
              </div>
            ) : nftsLoading ? (
              <div className="flex items-center justify-center flex-1 gap-sm text-on-surface-variant p-md">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-body-md">Loading NFTs...</span>
              </div>
            ) : nfts.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-on-surface-variant gap-sm p-md">
                <span className="material-symbols-outlined text-[40px]">image_not_supported</span>
                <p className="font-body-md">No NFTs found</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-md">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {nfts.map((nft: any) => {
                    const imgUrl = nft.content?.files?.[0]?.uri || nft.content?.links?.image;
                    const name = nft.content?.metadata?.name || "Unknown NFT";
                    return (
                      <button 
                        key={nft.id} 
                        onClick={() => onGif(imgUrl)} 
                        className="w-full pt-[100%] rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all group block relative bg-surface-container-high"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 z-10">
                          <span className="font-label-sm text-white truncate text-left">{name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

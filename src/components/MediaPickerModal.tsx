"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

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
  onFile: (file: File) => void;
  onGif: (gifUrl: string) => void;
  onClose: () => void;
  defaultTab?: "upload" | "gif";
  hideTabs?: boolean;
}

export default function MediaPickerModal({ type, maxMB, onFile, onGif, onClose, defaultTab = "upload", hideTabs = false }: MediaPickerModalProps) {
  const [tab, setTab] = useState<"upload" | "gif">(defaultTab);
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
        ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=g`;
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

  const validateAndHandle = useCallback((file: File) => {
    setDragError("");
    if (!VALID_TYPES.includes(file.type)) {
      setDragError("Invalid format. Use JPG, PNG, or GIF.");
      return;
    }
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setDragError(`File too large. Max ${maxMB}MB.`);
      return;
    }
    onFile(file);
  }, [maxMB, onFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndHandle(file);
  };

  const title = type === "avatar" ? "Change Profile Photo" : type === "banner" ? "Change Banner" : "Select GIF";
  const resolution = type === "avatar" ? "800 × 800px · 1:1 ratio" : type === "banner" ? "1500 × 500px · 3:1 ratio" : "All ratios supported";

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-md" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      
      <div
        className="relative w-full max-w-[32rem] bg-[#0f0f13] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
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
            <button
              onClick={() => setTab("gif")}
              className={`flex-1 flex items-center justify-center gap-xs py-md font-label-md transition-colors ${tab === "gif" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-6h2v6zm0-8h-2v-2h2v2z"/></svg>
              GIF
            </button>
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
                {["JPG", "PNG", "GIF"].map(f => (
                  <span key={f} className="px-xs py-0.5 bg-surface-container-high border border-outline-variant rounded text-[11px] font-label-sm text-on-surface">{f}</span>
                ))}
              </div>
              <p className="font-body-sm text-on-surface-variant mt-xs">Max file size: <span className="text-on-surface font-label-sm">{maxMB}MB</span></p>
              <p className="font-body-sm text-on-surface-variant">Target resolution: <span className="text-on-surface font-label-sm">{resolution}</span></p>
              <p className="font-body-sm text-outline-variant text-[11px]">* GIFs are used directly · JPG/PNG will open cropper</p>
            </div>

            {dragError && <p className="font-body-sm text-error">{dragError}</p>}

            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndHandle(f); e.target.value = ""; }} />
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
              <div className="flex-1 overflow-y-auto p-md">
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
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

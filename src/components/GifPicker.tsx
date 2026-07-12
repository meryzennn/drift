"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface GifResult {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    fixed_height_small: { url: string };
    original: { url: string };
    downsized_medium: { url: string };
  };
}

const CATEGORIES = [
  { label: "Trending", endpoint: "trending", icon: "trending_up" },
  { label: "Reactions", endpoint: "search", query: "reactions", icon: "mood" },
  { label: "Memes", endpoint: "search", query: "meme", icon: "sentiment_very_satisfied" },
  { label: "Sports", endpoint: "search", query: "sports", icon: "sports_soccer" },
  { label: "Anime", endpoint: "search", query: "anime", icon: "auto_awesome" },
  { label: "Gaming", endpoint: "search", query: "gaming", icon: "sports_esports" },
  { label: "Crypto", endpoint: "search", query: "crypto bitcoin", icon: "currency_bitcoin" },
];

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(false);
  const [noApiKey, setNoApiKey] = useState(!API_KEY);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGifs = useCallback(async (query: string, catIndex: number) => {
    if (!API_KEY) { setNoApiKey(true); return; }
    setLoading(true);
    try {
      const cat = CATEGORIES[catIndex];
      let url = "";
      if (query.trim()) {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=50&rating=g`;
      } else if (cat.endpoint === "trending") {
        url = `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=50&rating=g`;
      } else {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(cat.query || cat.label)}&limit=50&rating=g`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setGifs(json.data || []);
    } catch (e) {
      console.error("Giphy fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(search, activeCategory);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, activeCategory, fetchGifs]);

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[42rem] bg-[#0f0f13] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "650px", maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-xl py-md border-b border-[#2a2a3a] shrink-0">
          <div className="flex items-center gap-sm">
            <svg className="w-5 h-5 fill-primary" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="none"/><path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H8v-5.5h2V17zm0-7.5H8V7h2v2.5zm5.5 7.5H14v-4h-1.5v-1.5H14V10h1.5v1.5H17V13h-1.5v4z"/></svg>
            <h2 className="font-label-lg text-on-surface">GIF Picker</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

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
            {search && (
              <button onClick={() => setSearch("")} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        {!search && (
          <div className="flex overflow-x-auto hide-scrollbar gap-xs px-xl py-sm border-b border-[#2a2a3a] shrink-0">
            {CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(i)}
                className={`flex items-center gap-xs px-sm py-xs rounded-full text-[12px] font-label-sm whitespace-nowrap transition-colors shrink-0 ${activeCategory === i ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
              >
                <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* No API Key Warning */}
        {noApiKey && (
          <div className="flex-1 flex flex-col items-center justify-center p-xl text-center gap-md">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">key_off</span>
            <div>
              <p className="font-label-md text-on-surface mb-xs">Giphy API Key belum diisi</p>
              <p className="font-body-sm text-on-surface-variant">Tambahkan <code className="bg-surface-container-high px-xs rounded text-primary">NEXT_PUBLIC_GIPHY_API_KEY</code> ke file <code className="bg-surface-container-high px-xs rounded text-primary">.env.local</code></p>
              <a href="https://developers.giphy.com/" target="_blank" rel="noopener noreferrer" className="inline-block mt-sm text-primary font-label-sm hover:underline">Dapatkan API Key Gratis →</a>
            </div>
          </div>
        )}

        {/* GIF Grid */}
        {!noApiKey && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-md">
            {loading ? (
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
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => onSelect(gif.images.downsized_medium?.url || gif.images.original?.url)}
                    className="w-full rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all group relative block"
                    title={gif.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.images.fixed_height_small?.url || gif.images.fixed_height?.url}
                      alt={gif.title}
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Giphy Attribution */}
        {!noApiKey && (
          <div className="px-xl py-sm border-t border-[#2a2a3a] flex items-center justify-end shrink-0">
            <span className="font-body-sm text-on-surface-variant">Powered by</span>
            <span className="ml-xs font-bold text-on-surface text-[13px]">GIPHY</span>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

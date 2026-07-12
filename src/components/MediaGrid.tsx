"use client";

import React, { useState } from "react";
import ImageLightbox from "./ImageLightbox";

interface MediaGridProps {
  urls: string[];
  onImageClick?: (index: number) => void;
}

export function MediaGrid({ urls, onImageClick }: MediaGridProps) {
  const images = urls.filter(url => !url.toLowerCase().endsWith(".mp4"));

  if (images.length === 0) return null;

  return (
    <>
      <div 
        className={`grid gap-0.5 mt-xs rounded-xl overflow-hidden border border-outline-variant ${
          images.length === 1 ? "grid-cols-1" :
          images.length === 2 ? "grid-cols-2" :
          images.length === 3 ? "grid-cols-2" :
          images.length === 4 ? "grid-cols-2 grid-rows-2" :
          "grid-cols-6 grid-rows-2"
        }`}
        style={{ 
          height: images.length === 1 ? "500px" : "300px" 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {images.map((url, i) => {
          let colSpan = "";
          let rowSpan = "";
          
          if (images.length === 3) {
            if (i === 0) { colSpan = "col-span-1"; rowSpan = "row-span-2"; }
            else { colSpan = "col-span-1"; rowSpan = "row-span-1"; }
          } else if (images.length === 5) {
            if (i < 2) { colSpan = "col-span-3"; rowSpan = "row-span-1"; }
            else { colSpan = "col-span-2"; rowSpan = "row-span-1"; }
          }
          
          return (
            <div 
              key={i} 
              className={`relative bg-surface-container-highest cursor-pointer hover:opacity-90 transition-opacity ${colSpan} ${rowSpan}`}
              onClick={() => onImageClick && onImageClick(urls.indexOf(url))}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={url} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover" 
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

"use client";

import React from "react";
import VideoPlayer from "./VideoPlayer";

interface VideoSliderProps {
  urls: string[];
}

export function VideoSlider({ urls }: VideoSliderProps) {
  const videos = urls.filter(url => url.toLowerCase().endsWith(".mp4"));

  if (videos.length === 0) return null;

  if (videos.length === 1) {
    return (
      <div 
        className="w-full border border-outline-variant rounded-xl overflow-hidden mt-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <VideoPlayer url={videos[0]} />
      </div>
    );
  }

  return (
    <div 
      className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-sm mt-sm pb-2"
      onClick={(e) => e.stopPropagation()}
    >
      {videos.map((url, i) => (
        <div 
          key={i} 
          className="w-[85%] sm:w-[70%] shrink-0 snap-center border border-outline-variant rounded-xl overflow-hidden first:ml-0 last:mr-4"
        >
          <VideoPlayer url={url} />
        </div>
      ))}
    </div>
  );
}

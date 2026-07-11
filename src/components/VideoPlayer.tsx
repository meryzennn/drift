"use client";

import React, { useRef, useState, useEffect } from "react";

interface VideoPlayerProps {
  url: string;
}

export default function VideoPlayer({ url }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [wasManuallyPaused, setWasManuallyPaused] = useState(false);

  let hideControlsTimeout: NodeJS.Timeout;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setWasManuallyPaused(true);
      } else {
        videoRef.current.play();
        setWasManuallyPaused(false);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimeout);
    if (isPlaying) {
      hideControlsTimeout = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) setShowControls(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Intersection Observer to pause when scrolled out of view
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 // trigger when 50% of the video is visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!videoRef.current) return;
        
        if (entry.isIntersecting) {
          // Play only if it wasn't manually paused by the user
          if (!wasManuallyPaused) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              // Auto-play might be blocked by browser policies if unmuted, 
              // but it's muted by default so it should work.
            });
          }
        } else {
          // Pause when scrolling out of view
          if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      });
    }, options);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isPlaying, wasManuallyPaused]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-h-[512px] bg-black rounded-xl overflow-hidden group flex items-center justify-center cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain max-h-[512px]"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        autoPlay
        muted={isMuted}
        loop
      />

      {/* Large Center Play Button when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <div className="w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-lg backdrop-blur-sm hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[32px] ml-1">play_arrow</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-md bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 flex flex-col gap-sm ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicking controls from navigating
      >
        {/* Progress Bar */}
        <div 
          className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer relative group/progress"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-sm"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between text-white mt-1">
          <div className="flex items-center gap-md">
            <button onClick={togglePlay} className="hover:text-primary transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button onClick={toggleMute} className="hover:text-primary transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                {isMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
            <span className="font-mono text-xs opacity-90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <button onClick={toggleFullscreen} className="hover:text-primary transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

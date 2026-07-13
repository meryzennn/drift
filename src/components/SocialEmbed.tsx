"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { getCachedFbEmbed, resolveFbEmbed } from "@/lib/fbEmbedResolver";

interface SocialEmbedProps {
  embed: {
    type: 'youtube' | 'facebook';
    url: string;
    originalUrl: string;
    isVertical?: boolean;
  };
}

function buildFbIframeSrc(resolvedUrl: string, aspect: string, autoplay: boolean) {
  const [w, h] = aspect.split('/').map(Number);
  const vertical = h > w;
  const width = vertical ? 320 : 560;
  const height = Math.round(width * (h / w));
  // Always start muted (browser requirement for autoplay) but keep native
  // controls visible so the user can unmute with a real, reliable in-iframe click.
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(resolvedUrl)}&show_text=false&width=${width}&height=${height}&autoplay=${autoplay ? 1 : 0}&mute=1`;
}

function SocialEmbed({ embed }: SocialEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // used for YouTube only
  const [ytShouldRender, setYtShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const cachedInit = embed.type === 'facebook' ? getCachedFbEmbed(embed.originalUrl) : undefined;

  let initialIsVertical = false;
  if (embed.type === 'facebook') {
    if (cachedInit) {
      const [w, h] = cachedInit.aspectRatio.split('/').map(Number);
      initialIsVertical = h > w;
    } else {
      initialIsVertical =
        embed.isVertical === true ||
        embed.originalUrl.includes('/reel/') ||
        embed.originalUrl.includes('/share/r/');
    }
  }

  const [fbResolved, setFbResolved] = useState<{ resolvedUrl: string; aspectRatio: string } | null>(cachedInit ?? null);
  const [fbAspect, setFbAspect] = useState<string>(cachedInit?.aspectRatio ?? (initialIsVertical ? '9/16' : '16/9'));
  const [isFbVertical, setIsFbVertical] = useState(initialIsVertical);

  // Resolve Facebook URL → canonical URL + real aspect ratio (cached, once)
  useEffect(() => {
    if (embed.type !== 'facebook') return;
    resolveFbEmbed(embed.originalUrl).then(({ resolvedUrl, aspectRatio }) => {
      const [w, h] = aspectRatio.split('/').map(Number);
      setFbAspect(aspectRatio);
      setIsFbVertical(h > w);
      setFbResolved({ resolvedUrl, aspectRatio });
    });
  }, [embed.type, embed.originalUrl]);

  // Shared visibility observer for BOTH YouTube and Facebook.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setIsVisible(entry.isIntersecting));
      },
      { threshold: 0.6, rootMargin: '0px' }
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  // YouTube: drive play/pause + mute via postMessage based on visibility
  useEffect(() => {
    if (embed.type !== 'youtube') return;
    if (isVisible) setYtShouldRender(true);

    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    win.postMessage(
      JSON.stringify({ event: 'command', func: isVisible ? 'playVideo' : 'pauseVideo', args: '' }),
      '*'
    );
    win.postMessage(
      JSON.stringify({ event: 'command', func: !isVisible || isMuted ? 'mute' : 'unMute', args: '' }),
      '*'
    );
  }, [isVisible, embed.type, isMuted]);

  const handleToggleYtMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const youtubeUrl = (() => {
    if (embed.type !== 'youtube') return embed.url;
    let url = embed.url;
    if (!url.includes('enablejsapi=1')) url += `${url.includes('?') ? '&' : '?'}enablejsapi=1`;
    if (origin && !url.includes('origin=')) url += `&origin=${encodeURIComponent(origin)}`;
    if (!url.includes('mute=')) url += `&mute=1`;
    if (!url.includes('controls=')) url += `&controls=0`; // custom button replaces native controls reliably
    return url;
  })();

  const isYoutubeVertical = embed.type === 'youtube' && embed.isVertical;

  // FB iframe only rebuilds on visibility (mount/unmount), never on mute —
  // mute is handled entirely by FB's own native control now.
  const fbIframeSrc = useMemo(() => {
    if (!fbResolved) return null;
    return buildFbIframeSrc(fbResolved.resolvedUrl, fbResolved.aspectRatio, isVisible);
  }, [fbResolved, isVisible]);

  useEffect(() => {
    if (fbIframeSrc) setIsLoading(true);
  }, [fbIframeSrc]);

  // ── Facebook ──────────────────────────────────────────────────────────────
  if (embed.type === 'facebook') {
    return (
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden mt-1 bg-black ${isFbVertical ? 'w-full max-w-[320px] mx-auto' : 'w-full'}`}
      >
        <div style={{ aspectRatio: fbAspect, width: '100%', background: '#000' }}>
          {/* Only mounted while actually visible — kills sound instantly on scroll-away */}
          {isVisible && fbIframeSrc && (
            <iframe
              key={fbIframeSrc}
              src={fbIframeSrc}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              scrolling="no"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
              onLoad={() => setIsLoading(false)}
            />
          )}
          {isVisible && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-outline">Loading...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── YouTube ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onClick={handleToggleYtMute}
      className={`relative rounded-xl overflow-hidden mt-1 border border-outline-variant cursor-pointer ${isYoutubeVertical ? 'w-full max-w-[280px] sm:max-w-[300px] mx-auto' : 'w-full'}`}
    >
      {ytShouldRender ? (
        <iframe
          ref={iframeRef}
          src={youtubeUrl}
          className={`w-full ${isYoutubeVertical ? 'aspect-[9/16]' : 'aspect-video'} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          frameBorder="0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <div className={`w-full bg-surface-container-low ${isYoutubeVertical ? 'aspect-[9/16]' : 'aspect-video'}`} />
      )}
      {ytShouldRender && (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleYtMute(); }}
          className="absolute bottom-2 right-2 z-10 bg-black/60 rounded-full p-2 text-white"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>
      )}
    </div>
  );
}

export default memo(SocialEmbed, (prev, next) =>
  prev.embed.originalUrl === next.embed.originalUrl &&
  prev.embed.type === next.embed.type &&
  prev.embed.isVertical === next.embed.isVertical
);
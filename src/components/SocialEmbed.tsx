"use client";

import React, { useRef, useEffect, useState, memo } from "react";

interface SocialEmbedProps {
  embed: {
    type: 'youtube' | 'facebook';
    url: string;
    originalUrl: string;
    isVertical?: boolean;
  };
}

function SocialEmbed({ embed }: SocialEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ytShouldRender, setYtShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize with the parser's best guess to prevent layout shift while fetching metadata
  const initialIsVertical = embed.type === 'facebook' && (embed.isVertical === true || embed.originalUrl.includes('/reel/') || embed.originalUrl.includes('/share/r/'));
  const [fbIframeSrc, setFbIframeSrc] = useState<string | null>(null);
  const [fbAspect, setFbAspect] = useState<string>(initialIsVertical ? '9/16' : '16/9');
  const [isFbVertical, setIsFbVertical] = useState(initialIsVertical);

  // Resolve Facebook URL → get canonical URL + real video aspect ratio
  useEffect(() => {
    if (embed.type !== 'facebook') return;

    const originalUrl = embed.originalUrl;
    const needsResolve =
      originalUrl.includes('/share/r/') || originalUrl.includes('/share/v/');

    const buildIframeSrc = (resolvedUrl: string, vertical: boolean) => {
      const width = vertical ? 320 : 560;
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(resolvedUrl)}&show_text=false&width=${width}&autoplay=0&mute=1`;
    };

    if (needsResolve) {
      fetch(`/api/resolve-fb?url=${encodeURIComponent(originalUrl)}`)
        .then(r => r.json())
        .then(data => {
          const resolvedUrl = data.resolvedUrl ?? originalUrl;
          const aspect = data.aspectRatio ?? '16/9';
          const [w, h] = aspect.split('/').map(Number);
          const vertical = h > w;
          setFbAspect(aspect);
          setIsFbVertical(vertical);
          setFbIframeSrc(buildIframeSrc(resolvedUrl, vertical));
        })
        .catch(() => {
          // Fallback: use original URL with heuristic ratio
          const vertical = originalUrl.includes('/reel/') || originalUrl.includes('/share/r/');
          setIsFbVertical(vertical);
          setFbAspect(vertical ? '9/16' : '16/9');
          setFbIframeSrc(buildIframeSrc(originalUrl, vertical));
        });
    } else {
      // Direct link — use embed.url from parser (already a plugins/video.php URL) 
      // but extract & rebuild with proper dimensions
      const vertical = originalUrl.includes('/reel/') || embed.isVertical === true;
      setIsFbVertical(vertical);
      setFbAspect(vertical ? '9/16' : '16/9');
      setFbIframeSrc(buildIframeSrc(originalUrl, vertical));
    }
  }, [embed.type, embed.originalUrl, embed.isVertical]);

  // YouTube: IntersectionObserver for lazy load + play/pause
  useEffect(() => {
    if (embed.type !== 'youtube') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setYtShouldRender(true);
            iframeRef.current?.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}', '*'
            );
          } else {
            iframeRef.current?.contentWindow?.postMessage(
              '{"event":"command","func":"pauseVideo","args":""}', '*'
            );
          }
        });
      },
      { threshold: 0.2, rootMargin: '200px' }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current);
    };
  }, [embed.type]);

  const youtubeUrl =
    embed.type === 'youtube' && !embed.url.includes('enablejsapi=1')
      ? `${embed.url}&enablejsapi=1`
      : embed.url;

  const isYoutubeVertical = embed.type === 'youtube' && embed.isVertical;

  // ── Facebook (iframe-based, stable) ──────────────────────────────────────
  if (embed.type === 'facebook') {
    return (
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden mt-1 bg-black ${isFbVertical ? 'w-full max-w-[320px] mx-auto' : 'w-full'}`}
      >
        {/* Stable-sized box prevents layout jitter while iframe loads */}
        <div style={{ aspectRatio: fbAspect, width: '100%', background: '#000' }}>
          {fbIframeSrc && (
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
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2">
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
      className={`relative rounded-xl overflow-hidden mt-1 border border-outline-variant ${isYoutubeVertical ? 'w-full max-w-[280px] sm:max-w-[300px] mx-auto' : 'w-full'}`}
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
    </div>
  );
}

export default memo(SocialEmbed, (prev, next) =>
  prev.embed.originalUrl === next.embed.originalUrl &&
  prev.embed.type === next.embed.type &&
  prev.embed.isVertical === next.embed.isVertical
);

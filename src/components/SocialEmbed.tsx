"use client";

import React, { useRef, useEffect, useState } from "react";

interface SocialEmbedProps {
  embed: {
    type: 'youtube' | 'facebook';
    url: string;
    originalUrl: string;
    isVertical?: boolean;
  };
}

declare global {
  interface Window {
    FB: any;
  }
}

export default function SocialEmbed({ embed }: SocialEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fbContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedFbUrl, setResolvedFbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (embed.type === 'facebook' && (embed.originalUrl.includes('/share/r/') || embed.originalUrl.includes('/share/v/'))) {
      setIsLoading(true);
      fetch(`/api/resolve-fb?url=${encodeURIComponent(embed.originalUrl)}`)
        .then(r => r.json())
        .then(data => {
          if (data.resolvedUrl) {
            setResolvedFbUrl(data.resolvedUrl);
          } else {
            setResolvedFbUrl(embed.originalUrl);
          }
        })
        .catch(() => setResolvedFbUrl(embed.originalUrl));
    } else if (embed.type === 'facebook') {
      setResolvedFbUrl(embed.originalUrl);
    }
  }, [embed]);

  // Load FB SDK and parse
  useEffect(() => {
    if (embed.type === 'facebook' && resolvedFbUrl && shouldRender && fbContainerRef.current) {
      setIsLoading(false); 
      
      const parseFB = () => {
        if (window.FB && fbContainerRef.current) {
          window.FB.XFBML.parse(fbContainerRef.current);
        }
      };

      if (window.FB) {
        // Need a slight delay to ensure React has painted the fb-video div
        setTimeout(parseFB, 100);
      } else {
        const scriptId = 'facebook-jssdk';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
          script.async = true;
          script.defer = true;
          script.crossOrigin = "anonymous";
          document.body.appendChild(script);
        }
        
        script.addEventListener('load', parseFB);
        return () => script.removeEventListener('load', parseFB);
      }
    }
  }, [embed.type, resolvedFbUrl, shouldRender]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            // If YouTube, send play command
            if (embed.type === "youtube" && iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }
          } else {
            // If YouTube, send pause command
            if (embed.type === "youtube" && iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [embed.type]);

  // Append enablejsapi=1 for YouTube to allow postMessage controls
  const url = embed.type === "youtube" && !embed.url.includes("enablejsapi=1")
    ? `${embed.url}&enablejsapi=1`
    : embed.url;

  const containerClasses = [
    'relative rounded-xl overflow-hidden mt-1',
    embed.isVertical ? 'w-full max-w-[280px] sm:max-w-[300px] mx-auto' : 'w-full',
    embed.type === 'facebook' ? 'flex justify-center bg-surface-container-low' : 'border border-outline-variant'
  ].join(' ');

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
    >
      {shouldRender ? (
        <>
          {isLoading && embed.type !== 'facebook' && (
            <div className={`absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center gap-sm z-10`}>
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="font-label-sm text-outline">Loading video...</span>
            </div>
          )}
          
          {embed.type === 'facebook' ? (
            <div ref={fbContainerRef} className="w-full flex justify-center min-h-[200px]">
              {resolvedFbUrl && (
                <div 
                  className="fb-video" 
                  data-href={resolvedFbUrl} 
                  data-show-text="false"
                  data-lazy="true"
                  data-autoplay="true"
                />
              )}
            </div>
          ) : (
            <iframe 
              ref={iframeRef}
              src={url} 
              className={`w-full ${embed.isVertical ? 'aspect-[9/16]' : 'aspect-video'} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              frameBorder="0" 
              allowFullScreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              onLoad={() => setIsLoading(false)}
            />
          )}
        </>
      ) : (
        // Placeholder while out of view
        <div className={`w-full bg-surface-container-low ${embed.type === 'facebook' ? 'min-h-[200px]' : (embed.isVertical ? 'aspect-[9/16]' : 'aspect-video')}`} />
      )}
    </div>
  );
}

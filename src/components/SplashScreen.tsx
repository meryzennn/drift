"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Keep it fully visible for 800ms
    const timer1 = setTimeout(() => {
      setIsFadingOut(true);
    }, 800);

    // After fade-out animation completes (e.g. 500ms), unmount
    const timer2 = setTimeout(() => {
      setIsVisible(false);
    }, 1300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-500 ease-in-out ${isFadingOut ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-headline-lg font-black text-primary tracking-tighter text-[56px] leading-none animate-pulse">
          Drift
        </h1>
        <p className="font-body-md text-on-surface-variant animate-pulse tracking-wide font-medium">
          Decentralized Social
        </p>
      </div>
    </div>
  );
}

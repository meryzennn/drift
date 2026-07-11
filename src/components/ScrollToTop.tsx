"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    // Disable browser's default scroll restoration behavior
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    
    // Force scroll to top on mount (e.g. after refresh)
    window.scrollTo(0, 0);
  }, []);

  return null;
}

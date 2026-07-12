"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()}
      className="group w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant hover:border-primary hover:bg-primary/10 transition-all duration-200 active:scale-90 shrink-0"
      title="Go Back"
    >
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors duration-200 group-hover:-translate-x-0.5 inline-block transition-transform">
        arrow_back
      </span>
    </button>
  );
}

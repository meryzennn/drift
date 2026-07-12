import React from "react";
import Link from "next/link";

export const renderContentWithLinks = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <Link 
          key={i} 
          href={`/profile/${part.slice(1)}`} 
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline"
        >
          {part}
        </Link>
      );
    } else if (part.startsWith('#')) {
      return (
        <Link 
          key={i} 
          href={`/explore?q=${part.slice(1)}`} 
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

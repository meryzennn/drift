"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedPriceProps {
  price: number;
  decimals?: number;
  className?: string;
}

export default function AnimatedPrice({ price, decimals, className = "" }: AnimatedPriceProps) {
  const [prevPrice, setPrevPrice] = useState(price);
  const [animation, setAnimation] = useState<"up" | "down" | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (price !== prevPrice) {
      setAnimation(price > prevPrice ? "up" : "down");
      setPrevPrice(price);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setAnimation(null), 1000);
    }
  }, [price, prevPrice]);

  const animationClass = animation === "up"
    ? "animate-price-up"
    : animation === "down"
    ? "animate-price-down"
    : "";

  return (
    <span className={`${className} ${animationClass}`}>
      ${price.toFixed(decimals ?? (price < 1 ? 4 : 2))}
    </span>
  );
}

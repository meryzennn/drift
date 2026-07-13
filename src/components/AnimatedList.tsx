"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

export default function AnimatedList({ children, animationKey }: { children: ReactNode, animationKey: string | number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col flex-1 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

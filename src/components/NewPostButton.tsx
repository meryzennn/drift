"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import CreatePost from "./CreatePost";

export default function NewPostButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-xs mb-lg bg-primary-container text-on-primary-container w-full py-sm rounded-full font-label-md hover:bg-opacity-90 transition-colors"
      >
        New Post
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[600] flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-[10vh] animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-[600px] bg-background border border-outline-variant rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant p-4">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <h2 className="font-headline-sm font-bold text-on-surface">New Post</h2>
              <div className="w-8"></div> {/* Spacer for centering */}
            </div>
            
            {/* Modal Body - We inject CreatePost but remove its border/padding in context if we wanted, or just let it render as is */}
            <div className="p-4 border-none">
              <CreatePost onSuccess={() => setIsOpen(false)} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

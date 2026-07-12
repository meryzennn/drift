"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { createPortal } from "react-dom";

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number;
  onCropComplete: (croppedImageUrl: string) => void;
  onClose: () => void;
  label?: string;
}

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas is empty")); return; }
      resolve(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  });
}

export default function ImageCropper({ imageSrc, aspectRatio, onCropComplete, onClose, label = "Image" }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  const onCropCompleteCallback = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const croppedUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedUrl);
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setApplying(false);
    }
  };

  const targetRes = aspectRatio === 1 ? "800 × 800 px" : "1500 × 500 px";

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[42rem] bg-[#313338] rounded-md shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="font-bold text-white text-[20px]">Edit Image</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>
        
        {/* Cropper Container */}
        <div className="relative w-full bg-[#1e1f22]" style={{ height: aspectRatio === 1 ? "400px" : "320px" }}>
          <Cropper 
            image={imageSrc} 
            crop={crop} 
            zoom={zoom} 
            aspect={aspectRatio} 
            onCropChange={setCrop} 
            onZoomChange={setZoom} 
            onCropComplete={onCropCompleteCallback}
            style={{ 
              containerStyle: { background: "#1e1f22" },
              cropAreaStyle: { border: "2px solid white", color: "rgba(0,0,0,0.5)" }
            }} 
          />
        </div>
        
        {/* Zoom Slider & Controls */}
        <div className="px-6 py-4 flex items-center justify-center gap-4 bg-[#313338]">
          <div className="flex items-center gap-4 w-full max-w-sm">
            <span className="material-symbols-outlined text-[#b5bac1] text-[16px]">image</span>
            <input 
              type="range" 
              min={1} 
              max={3} 
              step={0.05} 
              value={zoom} 
              onChange={(e) => setZoom(Number(e.target.value))} 
              className="flex-1 accent-white h-1.5 bg-[#1e1f22] rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer" 
            />
            <span className="material-symbols-outlined text-[#b5bac1] text-[24px]">image</span>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2b2d31]">
          <button 
            onClick={() => setZoom(1)} 
            className="text-[#00a8fc] font-semibold text-[14px] hover:underline"
          >
            Reset
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2 bg-transparent text-white font-semibold text-[14px] rounded hover:underline transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply} 
              disabled={applying} 
              className="px-8 py-2 bg-[#5865F2] text-white rounded font-semibold text-[14px] hover:bg-[#4752C4] transition-colors disabled:opacity-60"
            >
              {applying ? "Applying..." : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

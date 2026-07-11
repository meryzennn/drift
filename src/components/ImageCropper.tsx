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
      <div className="relative w-full max-w-[42rem] bg-[#0f0f13] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-xl py-md border-b border-[#2a2a3a]">
          <div>
            <h2 className="font-label-lg text-on-surface">Crop {label}</h2>
            <p className="font-body-sm text-on-surface-variant mt-0.5">Target: {targetRes} · Rasio {aspectRatio === 1 ? "1:1" : "3:1"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="relative w-full bg-black" style={{ height: aspectRatio === 1 ? "360px" : "280px" }}>
          <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={aspectRatio} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropCompleteCallback} style={{ containerStyle: { background: "#000" } }} />
        </div>
        <div className="px-xl py-md border-t border-[#2a2a3a] flex items-center gap-md">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">zoom_out</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-primary h-1" />
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">zoom_in</span>
        </div>
        <div className="flex gap-md px-xl pb-xl">
          <button onClick={onClose} className="flex-1 py-sm border border-outline-variant text-on-surface rounded-lg font-label-md hover:bg-surface-container-highest transition-colors">Cancel</button>
          <button onClick={handleApply} disabled={applying} className="flex-1 py-sm bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors disabled:opacity-60">{applying ? "Applying..." : "Apply Crop"}</button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

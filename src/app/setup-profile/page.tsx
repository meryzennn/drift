"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import toast from "react-hot-toast";
import ImageCropper from "@/components/ImageCropper";
import MediaPickerModal from "@/components/MediaPickerModal";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import imageCompression from "browser-image-compression";

export default function SetupProfilePage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [xLink, setXLink] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [customLink, setCustomLink] = useState("");
  
  const { isChecking, isAvailable, suggestions } = useUsernameCheck(username);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  // Cropper & Picker state
  const [cropperSrc, setCropperSrc] = useState("");
  const [cropperTarget, setCropperTarget] = useState<"avatar" | "banner" | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"avatar" | "banner" | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If not connected, wait a bit for auto-connect before redirecting
    if (!connected) {
      const timeout = setTimeout(() => {
        if (!connected) router.push("/");
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [connected, router]);

  const handleGifSelect = useCallback((gifUrl: string) => {
    const target = mediaPickerTarget;
    setMediaPickerTarget(null);
    if (!target) return;
    if (target === "avatar") setAvatarPreview(gifUrl);
    else setBannerPreview(gifUrl);
    toast.success("GIF selected!");
  }, [mediaPickerTarget]);

  const handleFileFromPicker = useCallback((file: File, target: "avatar" | "banner") => {
    setMediaPickerTarget(null);
    if (file.type === "image/gif") {
      const url = URL.createObjectURL(file);
      if (target === "avatar") setAvatarPreview(url);
      else setBannerPreview(url);
      return;
    }
    setCropperSrc(URL.createObjectURL(file));
    setCropperTarget(target);
  }, []);

  const handleCropComplete = useCallback((croppedUrl: string) => {
    if (cropperTarget === "avatar") setAvatarPreview(croppedUrl);
    else if (cropperTarget === "banner") setBannerPreview(croppedUrl);
    setCropperTarget(null);
    setCropperSrc("");
  }, [cropperTarget]);

  const uploadFileFromBlob = async (blobUrl: string, type: "avatar" | "banner"): Promise<string> => {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    let file = new File([blob], `${type}-${Date.now()}.jpg`, { type: "image/jpeg" });
    
    try {
      file = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }) as File;
    } catch (e) {
      console.error("Compression error:", e);
    }
    
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error("Failed to upload image");
    const data = await uploadRes.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    
    setLoading(true);
    setError("");

    try {
      const walletAddress = publicKey.toString();
      
      // Check if username is taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .maybeSingle();
        
      if (existingUser) {
        throw new Error("Username is already taken.");
      }

      // Upload images if they exist
      let finalAvatarUrl = "";
      let finalBannerUrl = "";

      if (avatarPreview) {
        if (avatarPreview.startsWith("blob:")) {
          finalAvatarUrl = await uploadFileFromBlob(avatarPreview, "avatar");
        } else {
          finalAvatarUrl = avatarPreview; // e.g. Giphy URL
        }
      }
      
      if (bannerPreview) {
        if (bannerPreview.startsWith("blob:")) {
          finalBannerUrl = await uploadFileFromBlob(bannerPreview, "banner");
        } else {
          finalBannerUrl = bannerPreview; // e.g. Giphy URL
        }
      }

      // Insert into DB
      const { error: insertError } = await supabase.from("users").insert([
        {
          wallet_address: walletAddress,
          username,
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          banner_url: finalBannerUrl,
          bio,
          x_link: xLink,
          telegram_link: telegramLink,
          instagram_link: instagramLink,
          custom_link: customLink,
          has_set_username_once: true,
        },
      ]);

      if (insertError) throw insertError;

      toast.success("Profile setup complete!");
      // Success, redirect to home
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to setup profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-background p-md py-2xl">
      <div className="w-full max-w-[36rem] bg-surface-container border border-outline-variant rounded-2xl p-xl shadow-2xl">
        <h1 className="font-display text-display text-on-surface mb-xs text-center">Setup Profile</h1>
        <p className="font-body-md text-on-surface-variant mb-xl text-center">Complete your Web3 identity on Drift.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          {/* Banner & Avatar Section */}
          <div className="relative mb-xl">
            {/* Banner */}
            <div
              className="w-full h-32 md:h-44 bg-surface-container-highest rounded-t-xl overflow-hidden relative cursor-pointer group border-b border-outline-variant"
              onClick={() => setMediaPickerTarget("banner")}
            >
              {bannerPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-xs text-outline-variant group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[32px]">add_photo_alternate</span>
                  <span className="font-body-sm">Click to add banner</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex items-center gap-xs bg-black/60 px-md py-sm rounded-full">
                  <span className="material-symbols-outlined text-white text-[18px]">edit</span>
                  <span className="text-white font-label-sm">Change Banner</span>
                </div>
              </div>
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-8 left-md md:left-xl">
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-surface-container bg-surface-container-highest overflow-hidden relative cursor-pointer group"
                onClick={() => setMediaPickerTarget("avatar")}
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-primary/20 text-primary group-hover:bg-primary/30 transition-colors">
                    <span className="material-symbols-outlined text-[28px]">account_circle</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[22px]">edit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-md">
            <label className="block font-label-md text-on-surface mb-xs">Username <span className="text-error">*</span></label>
            <div className="relative flex items-center">
              <span className="absolute left-md text-on-surface-variant font-label-md">@</span>
              <input
                type="text"
                required
                pattern="[a-zA-Z0-9_]+"
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant rounded-lg py-sm pl-xl pr-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
                placeholder="username"
              />
            </div>
            <p className="font-body-sm text-on-surface-variant mt-xs">Letters, numbers, underscores only.</p>
            
            {/* Realtime Username Check UI */}
            {isChecking && (
              <div className="flex items-center gap-xs mt-sm text-on-surface-variant font-label-sm">
                <div className="w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full animate-spin" />
                Checking availability...
              </div>
            )}
            {!isChecking && isAvailable === true && (
              <div className="flex items-center gap-xs mt-sm text-primary font-label-sm">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Username is available!
              </div>
            )}
            {!isChecking && isAvailable === false && (
              <div className="flex flex-col gap-xs mt-sm">
                <div className="flex items-center gap-xs text-error font-label-sm">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Username is already taken.
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-xs mt-xs">
                    <span className="text-on-surface-variant font-body-sm text-[12px] mr-1">Try:</span>
                    {suggestions.map(sugg => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => setUsername(sugg)}
                        className="bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant px-sm py-0.5 rounded-full font-mono text-[12px] text-on-surface transition-colors"
                      >
                        @{sugg}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block font-label-md text-on-surface mb-xs">Display Name <span className="text-error">*</span></label>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface-container-highest border border-outline-variant rounded-lg py-sm px-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
              placeholder="Your Display Name"
            />
          </div>

          <div>
            <label className="block font-label-md text-on-surface mb-xs">Bio</label>
            <textarea
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little bit about yourself..."
              className="w-full bg-surface-container-highest border border-outline-variant rounded-lg py-sm px-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all resize-none h-24"
            />
          </div>

          {/* Social Links Section */}
          <div className="flex flex-col gap-sm border-t border-outline-variant pt-md">
            <h2 className="font-label-lg text-on-surface">Social Links</h2>
            
            {/* X (Twitter) */}
            <div className="flex items-center bg-surface-container-highest border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
              <div className="flex items-center pl-md pr-sm py-sm text-on-surface-variant shrink-0 border-r border-outline-variant">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <span className="px-xs font-label-md text-on-surface-variant shrink-0">@</span>
              <input
                type="text"
                placeholder="username"
                value={xLink}
                onChange={(e) => setXLink(e.target.value.replace(/^@/, ''))}
                className="flex-1 bg-transparent py-sm text-on-surface outline-none"
              />
              {xLink && <span className="pr-md font-body-sm text-outline-variant shrink-0">x.com/{xLink}</span>}
            </div>

            {/* Telegram */}
            <div className="flex items-center bg-surface-container-highest border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
              <div className="flex items-center pl-md pr-sm py-sm text-on-surface-variant shrink-0 border-r border-outline-variant">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </div>
              <span className="px-xs font-label-md text-on-surface-variant shrink-0">@</span>
              <input
                type="text"
                placeholder="username"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value.replace(/^@/, ''))}
                className="flex-1 bg-transparent py-sm text-on-surface outline-none"
              />
              {telegramLink && <span className="pr-md font-body-sm text-outline-variant shrink-0">t.me/{telegramLink}</span>}
            </div>

            {/* Instagram */}
            <div className="flex items-center bg-surface-container-highest border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
              <div className="flex items-center pl-md pr-sm py-sm text-on-surface-variant shrink-0 border-r border-outline-variant">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </div>
              <span className="px-xs font-label-md text-on-surface-variant shrink-0">@</span>
              <input
                type="text"
                placeholder="username"
                value={instagramLink}
                onChange={(e) => setInstagramLink(e.target.value.replace(/^@/, ''))}
                className="flex-1 bg-transparent py-sm text-on-surface outline-none"
              />
              {instagramLink && <span className="pr-md font-body-sm text-outline-variant shrink-0">instagram.com/{instagramLink}</span>}
            </div>

            {/* Custom Link */}
            <div className="flex items-center bg-surface-container-highest border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
              <div className="flex items-center pl-md pr-sm py-sm text-on-surface-variant shrink-0 border-r border-outline-variant">
                <span className="material-symbols-outlined text-[18px]">link</span>
              </div>
              <input
                type="text"
                placeholder="https://my-website.com"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                className="flex-1 bg-transparent py-sm px-sm text-on-surface outline-none"
              />
            </div>
          </div>

          {error && <div className="text-error font-body-sm bg-error/10 p-sm rounded-lg border border-error/20">{error}</div>}

          <button
            type="submit"
            disabled={loading || !username || !displayName || isAvailable === false}
            className="w-full bg-primary text-on-primary font-label-md py-md rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-md"
          >
            {loading ? "Saving Profile..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>

    {/* Image Cropper Modal */}
    {cropperTarget && cropperSrc && (
      <ImageCropper
        imageSrc={cropperSrc}
        aspectRatio={cropperTarget === "avatar" ? 1 : 3}
        label={cropperTarget === "avatar" ? "Profile Photo" : "Banner"}
        onCropComplete={handleCropComplete}
        onClose={() => { setCropperTarget(null); setCropperSrc(""); }}
      />
    )}

    {/* Media Picker Modal */}
    {mediaPickerTarget && (
      <MediaPickerModal
        type={mediaPickerTarget}
        maxMB={mediaPickerTarget === "avatar" ? 5 : 8}
        onFile={(file) => handleFileFromPicker(file, mediaPickerTarget)}
        onGif={handleGifSelect}
        onClose={() => setMediaPickerTarget(null)}
      />
    )}
    </>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { sendTip } from "@/utils/solanaUtils";
import toast from "react-hot-toast";
import ImageCropper from "@/components/ImageCropper";
import MediaPickerModal from "@/components/MediaPickerModal";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";

const ADMIN_WALLET_ADDRESS = "GwYQsXwVtwy1czytYLzNqN5Ao5xacndswrkeKZNJbTbX";
const USERNAME_CHANGE_FEE = 0.05;

export default function EditProfilePage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const router = useRouter();
  
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [hasSetUsernameOnce, setHasSetUsernameOnce] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bio, setBio] = useState("");
  const [xLink, setXLink] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [customLink, setCustomLink] = useState("");
  
  const { isChecking, isAvailable, suggestions } = useUsernameCheck(username, originalUsername);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  // Cropper & Picker state
  const [cropperSrc, setCropperSrc] = useState("");
  const [cropperTarget, setCropperTarget] = useState<"avatar" | "banner" | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"avatar" | "banner" | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!connected) {
      const timeout = setTimeout(() => {
        if (!connected) router.push("/");
      }, 1000);
      return () => clearTimeout(timeout);
    }
    
    if (publicKey) {
      fetchProfile(publicKey.toString());
    }
  }, [connected, publicKey, router]);

  const fetchProfile = async (walletAddress: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setUsername(data.username || "");
        setOriginalUsername(data.username || "");
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url || "");
        setBannerUrl(data.banner_url || "");
        setBio(data.bio || "");
        setXLink(data.x_link || "");
        setTelegramLink(data.telegram_link || "");
        setInstagramLink(data.instagram_link || "");
        setCustomLink(data.custom_link || "");
        setHasSetUsernameOnce(data.has_set_username_once || false);
      } else {
        router.push("/setup-profile");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  const MAX_SIZE = { avatar: 5 * 1024 * 1024, banner: 8 * 1024 * 1024 };

  const openCropper = useCallback((src: string, target: "avatar" | "banner") => {
    setCropperSrc(src);
    setCropperTarget(target);
  }, []);

  const handleImageChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      toast.error(`Format tidak valid. Gunakan JPG, PNG, atau GIF.`);
      return;
    }
    if (file.size > MAX_SIZE[type]) {
      toast.error(`Ukuran file terlalu besar. Maks ${MAX_SIZE[type] / (1024 * 1024)}MB.`);
      return;
    }
    // GIF: skip cropper, use directly
    if (file.type === "image/gif") {
      const url = URL.createObjectURL(file);
      if (type === "avatar") { setAvatarPreview(url); setAvatarFile(file); }
      else { setBannerPreview(url); setBannerFile(file); }
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (type === "avatar") setAvatarFile(file);
    else setBannerFile(file);
    openCropper(previewUrl, type);
    // Reset input
    e.target.value = "";
  }, [openCropper]);

  const handleGifSelect = useCallback((gifUrl: string) => {
    const target = mediaPickerTarget;
    setMediaPickerTarget(null);
    if (!target) return;
    if (target === "avatar") { setAvatarPreview(gifUrl); setAvatarUrl(gifUrl); setAvatarFile(null); }
    else { setBannerPreview(gifUrl); setBannerUrl(gifUrl); setBannerFile(null); }
    toast.success("GIF selected!");
  }, [mediaPickerTarget]);

  const handleFileFromPicker = useCallback((file: File, target: "avatar" | "banner") => {
    setMediaPickerTarget(null);
    if (file.type === "image/gif") {
      const url = URL.createObjectURL(file);
      if (target === "avatar") { setAvatarPreview(url); setAvatarFile(file); }
      else { setBannerPreview(url); setBannerFile(file); }
      return;
    }
    if (target === "avatar") setAvatarFile(file);
    else setBannerFile(file);
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
    const file = new File([blob], `${type}-${Date.now()}.jpg`, { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error("Failed to upload image");
    const data = await uploadRes.json();
    return data.url;
  };

  const requestSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    const isUsernameChanged = username !== originalUsername;
    if (isUsernameChanged && hasSetUsernameOnce) {
      setIsConfirmModalOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!publicKey) return;
    
    setSaving(true);
    setError("");
    setIsConfirmModalOpen(false);

    try {
      const walletAddress = publicKey.toString();
      let isUsernameChanged = username !== originalUsername;

      if (isUsernameChanged && hasSetUsernameOnce) {

        // Send transaction
        try {
          await sendTip(publicKey, ADMIN_WALLET_ADDRESS, USERNAME_CHANGE_FEE, sendTransaction);
        } catch (txError: any) {
          throw new Error("Transaction failed or was rejected: " + txError.message);
        }
      }

      // Check username availability if changed
      if (isUsernameChanged) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("username")
          .eq("username", username)
          .maybeSingle();
          
        if (existingUser) {
          throw new Error("Username is already taken.");
        }
      }

      // Upload images if they exist (avatar/banner as blob URL from crop)
      let newAvatarUrl = avatarUrl;
      let newBannerUrl = bannerUrl;

      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        newAvatarUrl = await uploadFileFromBlob(avatarPreview, "avatar");
      }
      if (bannerPreview && bannerPreview.startsWith("blob:")) {
        newBannerUrl = await uploadFileFromBlob(bannerPreview, "banner");
      }

      // Update DB
      const { error: updateError } = await supabase
        .from("users")
        .update({
          username,
          display_name: displayName,
          avatar_url: newAvatarUrl,
          banner_url: newBannerUrl,
          bio,
          x_link: xLink,
          telegram_link: telegramLink,
          instagram_link: instagramLink,
          custom_link: customLink,
          has_set_username_once: true,
        })
        .eq("wallet_address", walletAddress);

      if (updateError) throw updateError;

      toast.success("Profile updated successfully!");
      router.push("/profile");
      
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!connected) return null;
  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Loading profile...</div>;

  return (
    <>
    <div className="max-w-[36rem] mx-auto py-2xl px-md">
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-xl shadow-2xl">
        <h1 className="font-display text-[32px] text-on-surface mb-xs">Edit Profile</h1>
        <p className="font-body-md text-on-surface-variant mb-xl">Customize your Web3 identity.</p>

        <form onSubmit={requestSave} className="flex flex-col gap-lg">
          {/* Banner & Avatar Section */}
          <div className="relative mb-xl">
            {/* Banner */}
            <div
              className="w-full h-32 md:h-44 bg-surface-container-highest rounded-t-xl overflow-hidden relative cursor-pointer group border-b border-outline-variant"
              onClick={() => setMediaPickerTarget("banner")}
            >
              {(bannerPreview || bannerUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview || bannerUrl} alt="Banner" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
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
            <div className="absolute -bottom-8 left-md">
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-surface-container bg-surface-container-highest overflow-hidden relative cursor-pointer group"
                onClick={() => setMediaPickerTarget("avatar")}
              >
                {(avatarPreview || avatarUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-xl group-hover:bg-primary/30 transition-colors">
                    {publicKey?.toString().slice(0, 2)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[22px]">edit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-md">
            <label className="block font-label-md text-on-surface mb-xs">Username</label>
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
              />
            </div>
            {hasSetUsernameOnce && username !== originalUsername && (
              <p className="font-body-sm text-primary mt-xs">⚠️ Changing username costs a {USERNAME_CHANGE_FEE} SOL fee.</p>
            )}
            
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
            <label className="block font-label-md text-on-surface mb-xs">Display Name</label>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface-container-highest border border-outline-variant rounded-lg py-sm px-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
            />
            <p className="font-body-sm text-on-surface-variant mt-xs">Changing display name is free.</p>
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

          <div className="flex gap-md mt-md">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-transparent text-on-surface border border-outline-variant font-label-md py-md rounded-lg hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !username || !displayName || isAvailable === false}
              className="flex-1 bg-primary text-on-primary font-label-md py-md rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Image Cropper Modal */}
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

    {/* Custom Confirmation Modal */}
    {isConfirmModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-md">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setIsConfirmModalOpen(false)}></div>
        <div 
          className="relative z-10 bg-surface-container border border-outline-variant rounded-xl p-lg shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
          style={{ width: "400px", maxWidth: "90vw" }}
        >
          <h3 className="font-headline-md text-on-surface mb-sm">Confirm Username Change</h3>
          <p className="font-body-md text-on-surface-variant mb-lg">
            Changing your username will cost a network fee of <span className="font-bold text-primary">{USERNAME_CHANGE_FEE} SOL</span>. Do you want to proceed?
          </p>
          <div className="flex gap-sm">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={saving}
              className="flex-1 px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md hover:bg-surface-container-highest transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={executeSave}
              disabled={saving}
              className="flex-1 px-md py-sm rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {saving ? <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "Proceed & Pay"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

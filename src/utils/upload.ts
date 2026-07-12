export async function uploadFileToR2(fileToUpload: File | Blob, filename: string, type: string): Promise<string> {
  // 1. Get presigned URL
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      filename: filename,
      contentType: type
    })
  });

  if (!presignRes.ok) throw new Error("Failed to get presigned URL");
  const { presignedUrl, publicUrl } = await presignRes.json();

  // 2. Upload directly to R2
  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    body: fileToUpload,
    headers: {
      "Content-Type": type,
    }
  });

  if (!uploadRes.ok) throw new Error("Failed to upload to storage");
  
  return publicUrl;
}

export function validateVideoFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("video/")) {
      resolve(null);
      return;
    }
    
    // Check file size first (max 30MB)
    if (file.size > 30 * 1024 * 1024) {
      resolve("Video size must be less than 30MB.");
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > 60) {
        resolve("Video duration must be 60 seconds or less.");
        return;
      }
      
      const maxWidth = Math.max(video.videoWidth, video.videoHeight);
      const minWidth = Math.min(video.videoWidth, video.videoHeight);
      
      // 720p is generally 1280x720 or 720x1280.
      if (maxWidth > 1280 || minWidth > 720) {
        resolve("Video resolution must be 720p or lower.");
        return;
      }
      
      resolve(null); // Valid
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve("Failed to parse video metadata.");
    };

    video.src = URL.createObjectURL(file);
  });
}

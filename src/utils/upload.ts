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

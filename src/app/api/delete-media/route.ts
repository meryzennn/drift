import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Configure the AWS S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

    // Verify that the URL belongs to our R2 bucket
    if (!publicUrlBase || !imageUrl.startsWith(publicUrlBase)) {
      // It's an external URL (e.g. Tenor GIF), we don't delete it
      return NextResponse.json({ message: "External media, skipped deletion" }, { status: 200 });
    }

    // Extract the object key from the URL
    // URL format: https://pub-[id].r2.dev/1723456789-filename.jpg
    const key = imageUrl.substring(publicUrlBase.length + 1); // +1 for the slash
    const bucketName = process.env.R2_BUCKET_NAME || "";

    if (!key) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    // Delete from Cloudflare R2
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return NextResponse.json({ message: "Media deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting from R2:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

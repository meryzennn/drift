// app/api/resolve-fb/route.ts
import { NextResponse } from "next/server";

const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;

async function tryOembed(url: string) {
  if (!FB_APP_ID || !FB_APP_SECRET) return null;
  try {
    const token = `${FB_APP_ID}|${FB_APP_SECRET}`;
    const oembedUrl = `https://graph.facebook.com/v20.0/oembed_video?url=${encodeURIComponent(url)}&access_token=${token}`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.width || !data.height) return null;
    return { width: data.width, height: data.height };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // 1. Coba oEmbed dulu — paling akurat buat dimensi video asli
    const oembedResult = await tryOembed(url);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      redirect: "follow",
    });

    let resolvedUrl = response.url;
    const urlObj = new URL(resolvedUrl);
    resolvedUrl = urlObj.origin + urlObj.pathname;

    const html = await response.text();

    const ogUrlMatch = html.match(/property="og:url"\s+content="([^"]+)"/i) ||
                       html.match(/content="([^"]+)"\s+property="og:url"/i);
    if (ogUrlMatch?.[1] && !ogUrlMatch[1].includes('/share/')) {
      resolvedUrl = ogUrlMatch[1];
    }
    if (resolvedUrl.includes('/share/')) {
      resolvedUrl = urlObj.origin + urlObj.pathname;
    }

    let videoWidth: number | null = oembedResult?.width ?? null;
    let videoHeight: number | null = oembedResult?.height ?? null;

    // 2. Kalau oEmbed gagal, fallback scrape og:video / og:image
    if (!videoWidth || !videoHeight) {
      const videoWidthMatch = html.match(/property="og:video:width"\s+content="(\d+)"/i) ||
                              html.match(/content="(\d+)"\s+property="og:video:width"/i);
      const videoHeightMatch = html.match(/property="og:video:height"\s+content="(\d+)"/i) ||
                               html.match(/content="(\d+)"\s+property="og:video:height"/i);
      videoWidth = videoWidthMatch ? parseInt(videoWidthMatch[1]) : null;
      videoHeight = videoHeightMatch ? parseInt(videoHeightMatch[1]) : null;

      if (!videoWidth || !videoHeight) {
        const imageWidthMatch = html.match(/property="og:image:width"\s+content="(\d+)"/i) ||
                                html.match(/content="(\d+)"\s+property="og:image:width"/i);
        const imageHeightMatch = html.match(/property="og:image:height"\s+content="(\d+)"/i) ||
                                 html.match(/content="(\d+)"\s+property="og:image:height"/i);
        videoWidth = imageWidthMatch ? parseInt(imageWidthMatch[1]) : null;
        videoHeight = imageHeightMatch ? parseInt(imageHeightMatch[1]) : null;
      }
    }

    let aspectRatio: string | null = null;
    if (videoWidth && videoHeight) {
      aspectRatio = `${videoWidth}/${videoHeight}`;
    } else {
      // 3. Heuristic cuma fallback terakhir kalau bener2 nggak ada data
      const isReel = resolvedUrl.includes('/reel/') || url.includes('/share/r/');
      aspectRatio = isReel ? '9/16' : '16/9';
    }

    let videoId: string | null = null;
    const watchMatch = resolvedUrl.match(/[?&]v=(\d+)/);
    const videoPathMatch = resolvedUrl.match(/\/(?:videos|reel)\/(?:.*\/)?([0-9]{10,})/);
    if (watchMatch?.[1]) videoId = watchMatch[1];
    else if (videoPathMatch?.[1]) videoId = videoPathMatch[1];

    const videoIdMatch = resolvedUrl.match(/\/(?:videos|reel)\/(?:.*\/)?([0-9]{10,})/);
    if (videoIdMatch?.[1]) {
      resolvedUrl = `https://www.facebook.com/watch/?v=${videoIdMatch[1]}`;
      if (!videoId) videoId = videoIdMatch[1];
    }

    return NextResponse.json(
      { resolvedUrl, aspectRatio, videoId },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" } }
    );
  } catch (error) {
    console.error("Error resolving FB url:", error);
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 });
  }
}
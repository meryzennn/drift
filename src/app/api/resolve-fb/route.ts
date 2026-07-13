import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Use a real browser UA so Facebook serves OG meta tags with video dimensions
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      redirect: "follow",
    });

    // Use response.url since fetch automatically follows redirects
    let resolvedUrl = response.url;

    // Strip query parameters that might confuse the FB player
    const urlObj = new URL(resolvedUrl);
    resolvedUrl = urlObj.origin + urlObj.pathname;

    // Try to parse HTML for og:url and og:video dimensions
    const html = await response.text();

    // Prefer og:url if available (most accurate canonical URL)
    const ogUrlMatch = html.match(/property="og:url"\s+content="([^"]+)"/i) ||
                       html.match(/content="([^"]+)"\s+property="og:url"/i);
    if (ogUrlMatch?.[1] && !ogUrlMatch[1].includes('/share/')) {
      resolvedUrl = ogUrlMatch[1];
    }

    // If still a /share/ URL, fallback to redirect URL
    if (resolvedUrl.includes('/share/')) {
      resolvedUrl = urlObj.origin + urlObj.pathname;
    }

    // Extract og:video dimensions to determine aspect ratio
    const videoWidthMatch = html.match(/property="og:video:width"\s+content="(\d+)"/i) ||
                            html.match(/content="(\d+)"\s+property="og:video:width"/i);
    const videoHeightMatch = html.match(/property="og:video:height"\s+content="(\d+)"/i) ||
                             html.match(/content="(\d+)"\s+property="og:video:height"/i);

    let videoWidth = videoWidthMatch ? parseInt(videoWidthMatch[1]) : null;
    let videoHeight = videoHeightMatch ? parseInt(videoHeightMatch[1]) : null;

    if (!videoWidth || !videoHeight) {
      const imageWidthMatch = html.match(/property="og:image:width"\s+content="(\d+)"/i) ||
                              html.match(/content="(\d+)"\s+property="og:image:width"/i);
      const imageHeightMatch = html.match(/property="og:image:height"\s+content="(\d+)"/i) ||
                               html.match(/content="(\d+)"\s+property="og:image:height"/i);
      
      videoWidth = imageWidthMatch ? parseInt(imageWidthMatch[1]) : null;
      videoHeight = imageHeightMatch ? parseInt(imageHeightMatch[1]) : null;
    }

    // Determine aspect ratio: vertical = 9:16 (portrait), horizontal = 16:9
    let aspectRatio: string | null = null;
    if (videoWidth && videoHeight) {
      aspectRatio = `${videoWidth}/${videoHeight}`;
    } else {
      // Heuristic: /reel/ or /share/r/ are almost always vertical
      const isReel = resolvedUrl.includes('/reel/') || url.includes('/share/r/');
      aspectRatio = isReel ? '9/16' : '16/9';
    }

    // Extract numeric video ID from resolved URL for use with video/embed endpoint
    let videoId: string | null = null;
    const watchMatch = resolvedUrl.match(/[?&]v=(\d+)/);
    const videoPathMatch = resolvedUrl.match(/\/(?:videos|reel)\/(?:.*\/)?([0-9]{10,})/);
    if (watchMatch?.[1]) videoId = watchMatch[1];
    else if (videoPathMatch?.[1]) videoId = videoPathMatch[1];

    // Normalize long /videos/ or /reel/ URLs to /watch/?v=ID for clean plugin URL
    const videoIdMatch = resolvedUrl.match(/\/(?:videos|reel)\/(?:.*\/)?([0-9]{10,})/);
    if (videoIdMatch?.[1]) {
      resolvedUrl = `https://www.facebook.com/watch/?v=${videoIdMatch[1]}`;
      if (!videoId) videoId = videoIdMatch[1];
    }

    return NextResponse.json(
      { resolvedUrl, aspectRatio, videoId },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      }
    );
  } catch (error) {
    console.error("Error resolving FB url:", error);
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 });
  }
}

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
        "User-Agent": "facebookexternalhit/1.1", // Tell Facebook we are a crawler so it sends og:tags
      },
    });

    const html = await response.text();
    const match = html.match(/og:url[^>]*content=["'](.*?)["']/i);

    if (match && match[1]) {
      let resolvedUrl = match[1];
      // Convert /videos/ to /reel/ format to force vertical formatting in iframe
      const videoMatch = resolvedUrl.match(/\/videos\/(?:.*\/)?(\d+)/);
      if (videoMatch && videoMatch[1]) {
        resolvedUrl = `https://www.facebook.com/reel/${videoMatch[1]}`;
      }
      return NextResponse.json({ resolvedUrl });
    }

    return NextResponse.json({ error: "Could not find og:url" }, { status: 404 });
  } catch (error) {
    console.error("Error resolving FB url:", error);
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 });
  }
}

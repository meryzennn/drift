import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error('Failed to fetch image');

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();
    
    // Extract a reasonable filename or use a default
    const urlParts = imageUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1].split('?')[0];
    const fileName = originalFileName || 'drift-image.jpg';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="drift-${fileName}"`,
        // Also allow CORS just in case
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response('Error fetching image', { status: 500 });
  }
}

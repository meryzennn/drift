import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.0x5zen.dev',
      },
      {
        protocol: 'https',
        hostname: 'prbtlkczozvbdxfcjrvo.supabase.co',
      },
    ],
  },
};

export default nextConfig;

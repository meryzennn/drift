import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import SplashScreen from "@/components/SplashScreen";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Drift | Decentralized Social",
  description: "A decentralized social network built on Solana",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Drift",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Drift" />
        <meta name="theme-color" content="#09090b" />
      </head>
      <body className={`${inter.className} ${jetbrainsMono.variable} ${spaceGrotesk.variable} bg-background text-on-background min-h-screen antialiased flex flex-col`}>
        <Script id="service-worker-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) { console.log('SW registered'); },
                  function(err) { console.log('SW registration failed: ', err); }
                );
              });
            }
          `}
        </Script>
        {/* Facebook SDK — loaded globally so all fb-video embeds work reliably */}
        <Script
          id="facebook-jssdk"
          src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"
          strategy="lazyOnload"
        />
        <SplashScreen />
        <WalletContextProvider>
          <Navbar />
          <div className="flex-1 w-full relative">
            {children}
          </div>
          <MobileBottomNav />
          <Toaster 
            position="top-center"
            containerStyle={{ top: 80 }}
            toastOptions={{
              style: {
                background: '#1b1b1e',
                color: '#e4e1e6',
                border: '1px solid #434655',
                borderRadius: '12px',
                fontSize: '14px',
                maxWidth: '320px',
              },
              duration: 3000,
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}

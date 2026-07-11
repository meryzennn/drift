import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "Drift | Decentralized Social",
  description: "A decentralized social network built on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} ${jetbrainsMono.variable} bg-background text-on-background min-h-screen antialiased flex flex-col`}>
        <WalletContextProvider>
          <Navbar />
          <div className="flex-1 w-full relative">
            {children}
          </div>
          <MobileBottomNav />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1b1b1e',
                color: '#e4e1e6',
                border: '1px solid #434655',
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}

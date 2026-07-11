"use client";

import { FC, ReactNode, useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletError } from "@solana/wallet-adapter-base";
import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}


import AuthProvider from "./AuthProvider";

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = "devnet"; // Using devnet for free testing

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const onError = useCallback(
    (error: WalletError) => {
      // Typically handled via a toast notification like react-hot-toast
      console.error("Wallet Error:", error);
      if (error.name === "WalletSignTransactionError" || error.name === "WalletConnectionError") {
         alert("Permintaan wallet dibatalkan atau ditolak.");
      }
    },
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

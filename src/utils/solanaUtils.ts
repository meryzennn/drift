import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Devnet connection for testing
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export const sendTip = async (
  fromPublicKey: PublicKey,
  toAddressString: string,
  amountInSol: number,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
) => {
  try {
    const toPublicKey = new PublicKey(toAddressString);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: amountInSol * LAMPORTS_PER_SOL,
      })
    );

    // Get the latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = fromPublicKey;

    // Send the transaction using the wallet adapter
    const signature = await sendTransaction(transaction, connection);
    console.log("Tip transaction sent! Signature:", signature);
    
    // Wait for confirmation using the recommended strategy
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, "confirmed");
    console.log("Tip transaction confirmed!");
    
    return signature;
  } catch (error) {
    console.error("Error in sendTip:", error);
    throw error;
  }
};

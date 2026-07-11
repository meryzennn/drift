import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import bs58 from 'bs58';

/**
 * Derives an X25519 encryption keypair from a Ed25519 signature (seed).
 * The signature acts as deterministic entropy.
 */
export const deriveChatKeypair = (signatureBytes: Uint8Array) => {
  // We use the first 32 bytes of the 64-byte signature as the seed for our secret key.
  const seed = signatureBytes.slice(0, 32);
  const keypair = nacl.box.keyPair.fromSecretKey(seed);
  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey)
  };
};

/**
 * Encrypts a string message for a specific recipient.
 */
export const encryptMessage = (message: string, mySecretKeyBs58: string, theirPublicKeyBs58: string): string => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = decodeUTF8(message);
  
  const encrypted = nacl.box(
    messageUint8,
    nonce,
    bs58.decode(theirPublicKeyBs58),
    bs58.decode(mySecretKeyBs58)
  );
  
  // Combine nonce and encrypted message to store them together
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return encodeBase64(fullMessage);
};

/**
 * Decrypts a received message.
 */
export const decryptMessage = (encryptedMessageBase64: string, mySecretKeyBs58: string, theirPublicKeyBs58: string): string | null => {
  try {
    const fullMessage = decodeBase64(encryptedMessageBase64);
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const encrypted = fullMessage.slice(nacl.box.nonceLength);
    
    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      bs58.decode(theirPublicKeyBs58),
      bs58.decode(mySecretKeyBs58)
    );
    
    if (!decrypted) {
      return null; // Decryption failed (wrong key)
    }
    
    return encodeUTF8(decrypted);
  } catch (err) {
    console.error("Decryption error", err);
    return null;
  }
};

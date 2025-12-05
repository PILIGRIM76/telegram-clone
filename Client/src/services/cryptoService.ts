
import type { Identity } from '../types';

/**
 * Generates a short fingerprint of the key for visual verification.
 */
export const generateFingerprint = (key: string): string => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Return hex string, take first 8 chars and uppercase
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase().padStart(8, '0');
};

/**
 * Generates a new identity.
 */
export const generateIdentity = (): Identity => {
  const privateKey = `priv_key_${crypto.randomUUID()}`;
  const publicKey = `pub_key_${crypto.randomUUID()}`;
  // UID is simulated as a hash of public key
  const uid = `uid_${btoa(publicKey).substring(0, 24)}`;
  const keyFingerprint = generateFingerprint(publicKey);

  return { uid, publicKey, privateKey, keyFingerprint };
};

export const encrypt = (text: string, _key: string): string => {
  try {
    return btoa(encodeURIComponent(text));
  } catch (e) {
    console.error('Encryption failed', e);
    return '';
  }
};

export const decrypt = (encryptedText: string, _key: string): string => {
  try {
    return decodeURIComponent(atob(encryptedText));
  } catch (e) {
    console.error('Decryption failed', e);
    return '[Decryption Error]';
  }
};

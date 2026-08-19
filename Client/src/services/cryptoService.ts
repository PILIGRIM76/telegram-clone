
import type { Identity } from '../types';

export const generateFingerprint = (key: string): string => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
    }
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase().padStart(8, '0');
};

export const generateIdentity = (): Identity => {
  const privateKey = `priv_key_${crypto.randomUUID()}`;
  const publicKey = `pub_key_${crypto.randomUUID()}`;
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

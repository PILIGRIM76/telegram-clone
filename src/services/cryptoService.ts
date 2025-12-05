
import type { Identity } from '../types';

// В реальном приложении здесь бы использовались надежные криптографические библиотеки,
// такие как libsodium.js или Web Crypto API.

/**
 * Генерирует короткий отпечаток (хеш) ключа для визуальной верификации.
 */
export const generateFingerprint = (key: string): string => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Возвращаем hex строку, берем первые 8 символов и переводим в верхний регистр
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase().padStart(8, '0');
};

/**
 * Генерирует новую имитационную личность.
 */
export const generateIdentity = (): Identity => {
  const privateKey = `priv_key_${crypto.randomUUID()}`;
  const publicKey = `pub_key_${crypto.randomUUID()}`;
  // UID часто является хешем публичного ключа. Мы это упростим.
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

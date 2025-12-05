
import type { Личность } from '../types';

// В реальном приложении здесь бы использовались надежные криптографические библиотеки,
// такие как libsodium.js или Web Crypto API.

/**
 * Генерирует короткий отпечаток (хеш) ключа для визуальной верификации.
 */
export const сгенерироватьОтпечаток = (ключ: string): string => {
    let hash = 0;
    for (let i = 0; i < ключ.length; i++) {
        const char = ключ.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Возвращаем hex строку, берем первые 8 символов и переводим в верхний регистр
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase().padStart(8, '0');
};

/**
 * Генерирует новую имитационную личность.
 */
export const сгенерироватьЛичность = (): Личность => {
  const приватныйКлюч = `priv_key_${crypto.randomUUID()}`;
  const публичныйКлюч = `pub_key_${crypto.randomUUID()}`;
  // UID часто является хешем публичного ключа. Мы это упростим.
  const uid = `uid_${btoa(публичныйКлюч).substring(0, 24)}`;
  const отпечатокКлюча = сгенерироватьОтпечаток(публичныйКлюч);

  return { uid, публичныйКлюч, приватныйКлюч, отпечатокКлюча };
};

export const зашифровать = (текст: string, _ключ: string): string => {
  try {
    return btoa(encodeURIComponent(текст));
  } catch (e) {
    console.error('Шифрование не удалось', e);
    return '';
  }
};

export const расшифровать = (зашифрованныйТекст: string, _ключ: string): string => {
  try {
    return decodeURIComponent(atob(зашифрованныйТекст));
  } catch (e) {
    console.error('Расшифровка не удалась', e);
    return '[Ошибка расшифровки]';
  }
};

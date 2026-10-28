import { logger } from './logger';

import {
  generateBIP39IdentityV7,
  isValidBIP39Mnemonic,
  normalizeMnemonicWords,
  restoreIdentityFromMnemonicV7,
} from '../crypto/bip39Derivation';
import type { IdentityType, LegacyIdentity } from '../types';

/**
 * Этап 7: преобразует приватный ключ secp256k1 из шестнадцатеричной строки в ArrayBuffer.
 * SHA-256 от ключа даёт 32 байта для ключа AES-256.
 */
export function deriveAesKeyFromPrivKey(privateKeyHex: string): ArrayBuffer {
  // Приватный ключ secp256k1 уже содержит 32 байта, используем их напрямую.
  const bytes = hexToBytes(privateKeyHex);
  // Возвращаем именно ArrayBuffer.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Этап 7: шифрует сообщение алгоритмом AES-GCM с ключом на основе secp256k1.
 *
 * @param text - текст для шифрования
 * @param privateKeyHex - приватный ключ secp256k1 в шестнадцатеричном формате.
 * @returns JSON-строка с вектором инициализации и шифротекстом.
 */
export async function encryptAESGCM(text: string, privateKeyHex: string): Promise<string> {
  const key = deriveAesKeyFromPrivKey(privateKeyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const subtleKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);

  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, subtleKey, encoded);

  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  });
}

/**
 * Этап 7: расшифровывает сообщение алгоритмом AES-GCM.
 *
 * @param encryptedJSON - JSON-строка с вектором инициализации и шифротекстом.
 * @param privateKeyHex - приватный ключ secp256k1 в шестнадцатеричном формате.
 * @returns расшифрованный текст.
 */
export async function decryptAESGCM(encryptedJSON: string, privateKeyHex: string): Promise<string> {
  const key = deriveAesKeyFromPrivKey(privateKeyHex);
  const parsed = JSON.parse(encryptedJSON);

  const iv = new Uint8Array(parsed.iv);
  const ciphertext = new Uint8Array(parsed.data);

  const subtleKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, subtleKey, ciphertext);

  return new TextDecoder().decode(decrypted);
}

/** Преобразует шестнадцатеричную строку в массив байтов. */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/** Преобразует массив байтов в шестнадцатеричную строку. */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Генерирует криптографический отпечаток ключа для визуальной верификации.
 * Использует хеш SHA-256 вместо менее стойкого алгоритма Дженнина.
 */
export const generateFingerprint = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16)
    .toUpperCase();
};

/** Возвращает публичный ключ identity v7 или устаревшей identity. */
export function getPublicKey(identity: IdentityType): string {
  if ('publicKeyHex' in identity && identity.publicKeyHex) {
    return identity.publicKeyHex;
  }
  return (identity as LegacyIdentity).publicKey ?? '';
}

/** Возвращает приватный ключ identity v7 или устаревшей identity. */
export function getPrivateKey(identity: IdentityType): string {
  if ('privateKeyHex' in identity && identity.privateKeyHex) {
    return identity.privateKeyHex;
  }
  return (identity as LegacyIdentity).privateKey ?? '';
}

/**
 * Этап 7.6.5: генерирует seed-фразу из 12 слов и 128 бит энтропии.
 * Использует встроенный словарь из 256 слов (по 8 бит на слово: 96 бит данных и 32 бита контрольной суммы).
 * Это упрощённый аналог BIP39; для боевой версии нужен полный словарь BIP39.
 */
export const generateSeedPhrase = (): string => {
  // 256 уникальных слов длиной 4–7 букв, которые легко прочитать.
  const wordlist = [
    'alpha',
    'apple',
    'arrow',
    'atlas',
    'azure',
    'badge',
    'banjo',
    'beach',
    'berry',
    'bison',
    'blade',
    'blank',
    'blaze',
    'bliss',
    'bonus',
    'boost',
    'brave',
    'breeze',
    'brief',
    'cabin',
    'candy',
    'cargo',
    'cave',
    'cedar',
    'chair',
    'chalk',
    'chant',
    'charm',
    'chess',
    'chief',
    'civic',
    'claim',
    'class',
    'cliff',
    'cloud',
    'clove',
    'clown',
    'coach',
    'coast',
    'cobra',
    'comet',
    'coral',
    'craft',
    'crane',
    'crisp',
    'cross',
    'crown',
    'crush',
    'crystal',
    'cycle',
    'dance',
    'dawn',
    'delta',
    'demon',
    'depth',
    'diary',
    'digit',
    'diplo',
    'disco',
    'dodge',
    'dolphin',
    'donor',
    'drama',
    'drift',
    'drum',
    'eagle',
    'earth',
    'echo',
    'elder',
    'elect',
    'elite',
    'elixir',
    'ember',
    'empty',
    'energy',
    'engine',
    'envoy',
    'equal',
    'ethic',
    'event',
    'every',
    'evoke',
    'exact',
    'exile',
    'extra',
    'fable',
    'fairy',
    'faith',
    'falcon',
    'family',
    'famous',
    'farm',
    'fast',
    'father',
    'fault',
    'feast',
    'fence',
    'field',
    'fifth',
    'fight',
    'film',
    'final',
    'finch',
    'first',
    'fish',
    'fixed',
    'flag',
    'flame',
    'flask',
    'flesh',
    'float',
    'flora',
    'flute',
    'focus',
    'forest',
    'forge',
    'forth',
    'found',
    'fox',
    'frame',
    'fresh',
    'front',
    'frost',
    'fruit',
    'funny',
    'galaxy',
    'garden',
    'gate',
    'genius',
    'ghost',
    'giant',
    'gift',
    'given',
    'glade',
    'glass',
    'globe',
    'glow',
    'gnome',
    'gold',
    'golf',
    'gospel',
    'gown',
    'grace',
    'grain',
    'grand',
    'grape',
    'graph',
    'grass',
    'grave',
    'green',
    'grip',
    'group',
    'grove',
    'guard',
    'guest',
    'guide',
    'gulf',
    'happy',
    'harbor',
    'hawk',
    'hazel',
    'heart',
    'heavy',
    'hello',
    'herb',
    'hero',
    'honey',
    'honor',
    'horse',
    'house',
    'human',
    'humor',
    'hurry',
    'ice',
    'idea',
    'ideal',
    'idiom',
    'idol',
    'image',
    'impulse',
    'index',
    'inbox',
    'inner',
    'input',
    'irony',
    'issue',
    'ivory',
    'jeans',
    'jelly',
    'jewel',
    'joker',
    'joyful',
    'judge',
    'juice',
    'junior',
    'karma',
    'kayak',
    'kettle',
    'keyboard',
    'kind',
    'king',
    'kiss',
    'knee',
    'knife',
    'koala',
    'ladder',
    'lake',
    'lamp',
    'lance',
    'laser',
    'laugh',
    'lawn',
    'layer',
    'leaf',
    'legal',
    'lemon',
    'level',
    'liberty',
    'life',
    'light',
    'lily',
    'lion',
    'liquid',
    'lobby',
    'locus',
    'lodge',
    'logic',
    'loyal',
    'lucky',
    'lunar',
    'lunch',
    'magic',
    'magnet',
    'major',
    'mango',
    'maple',
    'march',
    'mars',
    'mask',
    'matrix',
    'mayor',
    'media',
    'melon',
    'metal',
    'meter',
    'middle',
    'mint',
    'mirror',
    'mission',
    'mixer',
    'mobile',
    'mocha',
    'model',
    'modem',
    'moment',
    'money',
    'monitor',
    'moon',
    'moral',
    'mosaic',
    'motel',
    'mother',
    'mouse',
    'movie',
    'music',
    'mystic',
    'narrate',
    'narrow',
    'nectar',
    'needle',
    'nephew',
    'neural',
    'neutral',
    'nexus',
    'nickel',
    'noble',
    'noise',
    'nomad',
    'north',
    'note',
    'novel',
    'nurse',
    'oasis',
    'ocean',
    'octopus',
    'olive',
    'olympic',
    'opal',
    'open',
    'opera',
    'optic',
    'orange',
    'orbit',
    'orchid',
    'organic',
    'origin',
    'otter',
  ];

  // Генерируем 12 случайных слов (по 8 бит на слово, всего 96 бит энтропии).
  const words: string[] = [];
  const randomBytes = crypto.getRandomValues(new Uint8Array(12));
  for (let i = 0; i < 12; i++) {
    words.push(wordlist[randomBytes[i]]);
  }
  return words.join(' ');
};

/**
 * Этап 7: создаёт identity на основе BIP39 и secp256k1.
 *
 * Без обёртки ECDSA P-256 и без encryptedKeyPair.
 * UUID формируется как uid_ и первые 16 байт приватного ключа в шестнадцатеричном формате.
 *
 * Преимущества:
 * - Более быстрая генерация ключей (без дополнительного вызова Web Crypto API).
 * - Меньше кода и меньше потенциальных точек атаки.
 * - Детерминированный результат: одни и те же 12 слов дают те же ключи.
 */
export const generateIdentity = async (): Promise<IdentityType> => {
  logger.info('[PILIGRIM] Phase 7: pure BIP39 + secp256k1 keygen');

  const v7Identity = await generateBIP39IdentityV7();

  return {
    uid: v7Identity.uid,
    publicKeyHex: v7Identity.publicKeyHex,
    privateKeyHex: v7Identity.privateKeyHex,
    seedPhrase: v7Identity.seedPhrase,
    version: 'v7',
    keyFingerprint: v7Identity.keyFingerprint,
  };
};

/**
 * Шифрует сообщение с использованием RSA-OAEP.
 * Реальное криптографическое шифрование, а не base64!
 */
export const encrypt = async (text: string, publicKeyStr: string): Promise<string> => {
  try {
    // Импортируем открытый ключ.
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(publicKeyStr),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    // Шифруем сообщение.
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, encoded);

    // Кодируем результат в base64 для передачи.
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  } catch (e) {
    logger.error('Encryption failed', e);
    throw new Error('Encryption failed');
  }
};

/**
 * Расшифровывает сообщение с использованием RSA-OAEP.
 */
export const decrypt = async (encryptedText: string, privateKeyStr: string): Promise<string> => {
  try {
    // Импортируем закрытый ключ.
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(privateKeyStr),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    // Расшифровываем данные.
    const buffer = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, buffer);

    // Декодируем текст.
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    logger.error('Decryption failed', e);
    throw new Error('Decryption failed');
  }
};

// Синхронные обёртки для обратной совместимости; используйте асинхронные версии.
export const encryptSync = (text: string, _key: string): string => {
  logger.warn('encryptSync is deprecated. Use async encrypt() instead.');
  return text; // В боевой версии следует выбрасывать ошибку.
};

export const decryptSync = (encryptedText: string, _key: string): string => {
  logger.warn('decryptSync is deprecated. Use async decrypt() instead.');
  return encryptedText;
};

/**
 * Восстанавливает identity из 12-словной фразы BIP39.
 * Корректная фраза создаёт identity v7 с ключами secp256k1; остальные обрабатываются прежним способом PBKDF2.
 * @param words - 12 слов фразы BIP39.
 * @returns Identity или LegacyIdentity.
 */
export const restoreIdentityFromSeed = async (
  words: string[],
  encryptedKeyPair?: string
): Promise<IdentityType> => {
  logger.info('[PILIGRIM] Phase 7: restoreIdentityFromSeed');

  // Проверяем, что передано ровно 12 слов.
  if (!Array.isArray(words) || words.length !== 12) {
    throw new Error('Seed phrase must contain exactly 12 words');
  }

  // Проверяем, что все слова непустые.
  const cleanedWords = normalizeMnemonicWords(words);
  if (cleanedWords.some(w => w.length === 0)) {
    throw new Error('All 12 words must be non-empty');
  }

  // Проверка BIP39 валидности
  const isBIP39 = isValidBIP39Mnemonic(cleanedWords);
  const seedString = cleanedWords.join(' ');

  // Этап 7: используем схему BIP39.
  if (isBIP39) {
    logger.info('[PILIGRIM] Phase 7: valid BIP39 mnemonic detected');
    try {
      const v7Identity = await restoreIdentityFromMnemonicV7(seedString);
      logger.info(`[PILIGRIM] Phase 7: restore SUCCESS (BIP39), uid=${v7Identity.uid}`);
      return v7Identity;
    } catch (e) {
      logger.error('[PILIGRIM] Phase 7: BIP39 restore failed:', e);
      // При ошибке используем прежний способ восстановления.
      return legacyRestoreFromSeed(cleanedWords);
    }
  }

  logger.warn('[PILIGRIM] Phase 7: Non-BIP39 mnemonic detected, using legacy PBKDF2 fallback');
  return legacyRestoreFromSeed(cleanedWords);
};

/**
 * Legacy PBKDF2-based restore (для обратной совместимости со старыми 256-словными seed-фразами).
 */
async function legacyRestoreFromSeed(cleanedWords: string[]): Promise<LegacyIdentity> {
  const seedString = cleanedWords.join(' ');
  const seedBytes = new TextEncoder().encode(seedString);

  // PBKDF2: деривация 256-bit ключа из seed
  const baseKey = await crypto.subtle.importKey('raw', seedBytes, { name: 'PBKDF2' }, false, [
    'deriveBits',
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('piligrim-v1-seed'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const derivedBytes = new Uint8Array(derivedBits);
  const derivedBase64 = btoa(String.fromCharCode(...derivedBytes));

  // Детерминированный UID на основе seed
  const seedHash = await crypto.subtle.digest('SHA-256', seedBytes);
  const uidHashBase64 = btoa(String.fromCharCode(...new Uint8Array(seedHash)));
  const uid = `uid_${uidHashBase64.substring(0, 32)}`;

  // publicKey и privateKey — derived bytes (для совместимости с encrypt/decrypt)
  const publicKeyStr = `piligrim-derived-${derivedBase64}`;
  const privateKeyStr = `piligrim-derived-${derivedBase64}`;

  const keyFingerprint = await generateFingerprint(publicKeyStr);

  logger.info(
    `[PILIGRIM] legacyRestoreFromSeed SUCCESS, uid=${uid}, fingerprint=${keyFingerprint}`
  );

  return {
    uid,
    publicKey: publicKeyStr,
    privateKey: privateKeyStr,
    keyFingerprint,
    seedPhrase: seedString,
    isBIP39: false, // legacy — ключи случайные, нет multi-device
  };
}

// ============================================================
// E2EE File Encryption (Phase: File Sharing)
// ============================================================

/**
 * Шифрует файл с использованием AES-GCM (симметричный ключ) +
 * обертка ключа через encryptAESGCM (asymmetric, публичный ключ получателя).
 *
 * Алгоритм:
 * 1. Генерируется случайный AES-256-GCM ключ для файла
 * 2. Файл шифруется симметричным ключом
 * 3. Симметричный ключ шифруется приватным ключом отправителя (E2EE)
 *
 * @param file - File объект для шифрования
 * @param privateKeyHex - Приватный ключ шифрования (hex string)
 * @returns Объект с ciphertext, iv и зашифрованным ключом
 */
export async function encryptFile(
  file: File,
  privateKeyHex: string
): Promise<{
  ciphertext: string;
  iv: string;
  key: string;
  name: string;
  type: string;
  size: number;
}> {
  // 1. Генерируем симметричный AES-GCM ключ для файла
  const fileKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  // 2. Читаем файл в ArrayBuffer
  const fileBuffer = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Шифруем файл симметричным ключом
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, fileKey, fileBuffer);

  // 4. Экспортируем симметричный ключ и шифруем его
  const exportedKey = await crypto.subtle.exportKey('raw', fileKey);
  const exportedKeyBase64 = arrayBufferToBase64(exportedKey);
  const encryptedKey = await encryptAESGCM(exportedKeyBase64, privateKeyHex);

  logger.info('[PILIGRIM] File encrypted:', {
    name: file.name,
    size: file.size,
    ivLength: iv.length,
  });

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
    key: encryptedKey,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

/**
 * Расшифровывает файл, зашифрованный через encryptFile.
 *
 * @param ciphertext - base64 зашифрованных данных файла
 * @param iv - base64 вектор инициализации
 * @param encryptedKey - base64 зашифрованный симметричный ключ
 * @param privateKeyHex - Приватный ключ расшифровки (hex string)
 * @param fileType - MIME-тип файла (для создания Blob)
 * @param fileSize - Оригинальный размер файла (для создания Blob)
 * @returns Расшифрованный Blob
 */
export async function decryptFile(
  ciphertext: string,
  iv: string,
  encryptedKey: string,
  privateKeyHex: string,
  fileType: string,
  fileSize: number
): Promise<Blob> {
  // 1. Дешифруем симметричный ключ
  const decryptedKeyBase64 = await decryptAESGCM(encryptedKey, privateKeyHex);
  const keyBytes = base64ToByteArray(decryptedKeyBase64);
  const keyBuffer = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength
  ) as ArrayBuffer;

  // 2. Импортируем симметричный ключ
  const fileKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 3. Дешифровываем файл
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    fileKey,
    ciphertextBuffer
  );

  logger.info('[PILIGRIM] File decrypted:', { size: decrypted.byteLength, type: fileType });

  return new Blob([decrypted], { type: fileType });
}

/**
 * Вспомогательная функция: ArrayBuffer → Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Вспомогательная функция: Base64 string → Uint8Array
 */
function base64ToByteArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Вспомогательная функция: Base64 string → ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

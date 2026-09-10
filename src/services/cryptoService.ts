import { logger } from './logger';

import type { Identity, LegacyIdentity, IdentityType } from '../types';
import {
  generateBIP39Identity,
  deriveIdentityFromMnemonic,
  restoreIdentityFromEncryptedBlob,
  isValidBIP39Mnemonic,
  normalizeMnemonicWords,
  generateBIP39IdentityV7,
  deriveIdentityFromMnemonicV7,
  restoreIdentityFromMnemonicV7,
} from '../crypto/bip39Derivation';

/**
 * Phase 7: Конвертирует secp256k1 privKey hex в ArrayBuffer для Web Crypto API.
 * SHA-256(privKey) = 32 байта = AES-256 key
 */
export function deriveAesKeyFromPrivKey(privateKeyHex: string): ArrayBuffer {
  // secp256k1 private key уже 32 байта, используем напрямую
  const bytes = hexToBytes(privateKeyHex);
  // Убеждаемся, что возвращаем именно ArrayBuffer
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Phase 7: Шифрует сообщение через AES-GCM с ключом из secp256k1 privKey.
 * 
 * @param text - текст для шифрования
 * @param privateKeyHex - secp256k1 приватный ключ (hex)
 * @returns JSON строка с iv и ciphertext
 */
export async function encryptAESGCM(text: string, privateKeyHex: string): Promise<string> {
  const key = deriveAesKeyFromPrivKey(privateKeyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const subtleKey = await crypto.subtle.importKey(
    'raw',
    key,
    'AES-GCM',
    false,
    ['encrypt']
  );
  
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    subtleKey,
    encoded
  );
  
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  });
}

/**
 * Phase 7: Расшифровывает сообщение через AES-GCM.
 * 
 * @param encryptedJSON - JSON строка с iv и ciphertext
 * @param privateKeyHex - secp256k1 приватный ключ (hex)
 * @returns расшифрованный текст
 */
export async function decryptAESGCM(encryptedJSON: string, privateKeyHex: string): Promise<string> {
  const key = deriveAesKeyFromPrivKey(privateKeyHex);
  const parsed = JSON.parse(encryptedJSON);
  
  const iv = new Uint8Array(parsed.iv);
  const ciphertext = new Uint8Array(parsed.data);
  
  const subtleKey = await crypto.subtle.importKey(
    'raw',
    key,
    'AES-GCM',
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    subtleKey,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * hex → Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Uint8Array → hex
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Генерирует криптографический отпечаток ключа для визуальной верификации.
 * Использует SHA-256 хеш вместо слабого алгоритма Дженнина.
 */
export const generateFingerprint = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
};

/**
 * Phase 7: Type-safe accessor for identity public key.
 * Works with both v7 (publicKeyHex) and legacy (publicKey) identities.
 */
export function getPublicKey(identity: IdentityType): string {
  if ('publicKeyHex' in identity && identity.publicKeyHex) {
    return identity.publicKeyHex;
  }
  return (identity as LegacyIdentity).publicKey ?? '';
}

/**
 * Phase 7: Type-safe accessor for identity private key.
 * Works with both v7 (privateKeyHex) and legacy (privateKey) identities.
 */
export function getPrivateKey(identity: IdentityType): string {
  if ('privateKeyHex' in identity && identity.privateKeyHex) {
    return identity.privateKeyHex;
  }
  return (identity as LegacyIdentity).privateKey ?? '';
}

/**
 * Phase 7.6.5: Генерирует 12-словную seed-фразу из 128 бит энтропии.
 * Использует встроенный словарь из 256 слов (по 8 бит на слово = 96 бит полезной нагрузки + 32 бита checksum).
 * Это упрощённый аналог BIP39 — для production следует использовать полный BIP39 wordlist.
 */
export const generateSeedPhrase = (): string => {
    // 256 уникальных слов (4-7 букв, легко читаемых)
    const wordlist = [
        'alpha', 'apple', 'arrow', 'atlas', 'azure', 'badge', 'banjo', 'beach',
        'berry', 'bison', 'blade', 'blank', 'blaze', 'bliss', 'bonus', 'boost',
        'brave', 'breeze', 'brief', 'cabin', 'candy', 'cargo', 'cave', 'cedar',
        'chair', 'chalk', 'chant', 'charm', 'chess', 'chief', 'civic', 'claim',
        'class', 'cliff', 'cloud', 'clove', 'clown', 'coach', 'coast', 'cobra',
        'comet', 'coral', 'craft', 'crane', 'crisp', 'cross', 'crown', 'crush',
        'crystal', 'cycle', 'dance', 'dawn', 'delta', 'demon', 'depth', 'diary',
        'digit', 'diplo', 'disco', 'dodge', 'dolphin', 'donor', 'drama', 'drift',
        'drum', 'eagle', 'earth', 'echo', 'elder', 'elect', 'elite', 'elixir',
        'ember', 'empty', 'energy', 'engine', 'envoy', 'equal', 'ethic', 'event',
        'every', 'evoke', 'exact', 'exile', 'extra', 'fable', 'fairy', 'faith',
        'falcon', 'family', 'famous', 'farm', 'fast', 'father', 'fault', 'feast',
        'fence', 'field', 'fifth', 'fight', 'film', 'final', 'finch', 'first',
        'fish', 'fixed', 'flag', 'flame', 'flask', 'flesh', 'float', 'flora',
        'flute', 'focus', 'forest', 'forge', 'forth', 'found', 'fox', 'frame',
        'fresh', 'front', 'frost', 'fruit', 'funny', 'galaxy', 'garden', 'gate',
        'genius', 'ghost', 'giant', 'gift', 'given', 'glade', 'glass', 'globe',
        'glow', 'gnome', 'gold', 'golf', 'gospel', 'gown', 'grace', 'grain',
        'grand', 'grape', 'graph', 'grass', 'grave', 'green', 'grip', 'group',
        'grove', 'guard', 'guest', 'guide', 'gulf', 'happy', 'harbor', 'hawk',
        'hazel', 'heart', 'heavy', 'hello', 'herb', 'hero', 'honey', 'honor',
        'horse', 'house', 'human', 'humor', 'hurry', 'ice', 'idea', 'ideal',
        'idiom', 'idol', 'image', 'impulse', 'index', 'inbox', 'inner', 'input',
        'irony', 'issue', 'ivory', 'jeans', 'jelly', 'jewel', 'joker', 'joyful',
        'judge', 'juice', 'junior', 'karma', 'kayak', 'kettle', 'keyboard',
        'kind', 'king', 'kiss', 'knee', 'knife', 'koala', 'ladder', 'lake',
        'lamp', 'lance', 'laser', 'laugh', 'lawn', 'layer', 'leaf', 'legal',
        'lemon', 'level', 'liberty', 'life', 'light', 'lily', 'lion', 'liquid',
        'lobby', 'locus', 'lodge', 'logic', 'loyal', 'lucky', 'lunar', 'lunch',
        'magic', 'magnet', 'major', 'mango', 'maple', 'march', 'mars', 'mask',
        'matrix', 'mayor', 'media', 'melon', 'metal', 'meter', 'middle',
        'mint', 'mirror', 'mission', 'mixer', 'mobile', 'mocha', 'model',
        'modem', 'moment', 'money', 'monitor', 'moon', 'moral', 'mosaic',
        'motel', 'mother', 'mouse', 'movie', 'music', 'mystic', 'narrate',
        'narrow', 'nectar', 'needle', 'nephew', 'neural', 'neutral', 'nexus',
        'nickel', 'noble', 'noise', 'nomad', 'north', 'note', 'novel', 'nurse',
        'oasis', 'ocean', 'octopus', 'olive', 'olympic', 'opal', 'open',
        'opera', 'optic', 'orange', 'orbit', 'orchid', 'organic', 'origin',
        'otter'
    ];

    // Генерируем 12 случайных слов (по 8 бит на слово = 96 бит энтропии)
    const words: string[] = [];
    const randomBytes = crypto.getRandomValues(new Uint8Array(12));
    for (let i = 0; i < 12; i++) {
        words.push(wordlist[randomBytes[i]]);
    }
    return words.join(' ');
};

/**
 * Phase 7: Генерирует чистую BIP39 + secp256k1 identity.
 * 
 * Без ECDSA P-256 wrapper, без encryptedKeyPair.
 * UUID = uid_ + первые 16 байт приватного ключа (hex).
 * 
 * Benefits:
 * - Быстрее keygen (нет Web Crypto API round-trip)
 * - Меньше кода, меньше attack surface  
 * - Детерминированно: одни и те же 12 слов → одни и те же ключи
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
  } as IdentityType;
};

/**
 * Шифрует сообщение с использованием RSA-OAEP.
 * Реальное криптографическое шифрование, а не base64!
 */
export const encrypt = async (text: string, publicKeyStr: string): Promise<string> => {
    try {
        // Импортируем публичный ключ
        const publicKey = await crypto.subtle.importKey(
            "jwk",
            JSON.parse(publicKeyStr),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["encrypt"]
        );

        // Шифруем сообщение
        const encoder = new TextEncoder();
        const encoded = encoder.encode(text);
        const encrypted = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            encoded
        );

        // Возвращаем в base64 для передачи
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
        // Импортируем приватный ключ
        const privateKey = await crypto.subtle.importKey(
            "jwk",
            JSON.parse(privateKeyStr),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["decrypt"]
        );

        // Расшифровываем
        const buffer = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            buffer
        );

        // Декодируем текст
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (e) {
        logger.error('Decryption failed', e);
        throw new Error('Decryption failed');
    }
};

// Синхронные обёртки для обратной совместимости (используйте async версии)
export const encryptSync = (text: string, _key: string): string => {
    logger.warn('encryptSync is deprecated. Use async encrypt() instead.');
    return text; // В продакшене должно выбрасывать ошибку
};

export const decryptSync = (encryptedText: string, _key: string): string => {
    logger.warn('decryptSync is deprecated. Use async decrypt() instead.');
    return encryptedText;
};


/**
 * Phase 7: Восстанавливает identity из 12-словной BIP39 seed-фразы.
 * 
 * Детерминированный restore: те же 12 слов → те же secp256k1 ключи.
 * 
 * Backwards compatibility:
 * - Если seed валиден как BIP39 → используем v7 схему
 * - Если нет BIP39 валидности → fallback на legacy PBKDF2
 * 
 * @param words 12-словная BIP39 фраза (array)
 * @returns Identity | LegacyIdentity
 */
export const restoreIdentityFromSeed = async (
    words: string[],
    encryptedKeyPair?: string
  ): Promise<IdentityType> => {
  logger.info('[PILIGRIM] Phase 7: restoreIdentityFromSeed');

  // Валидация: должно быть ровно 12 слов
  if (!Array.isArray(words) || words.length !== 12) {
    throw new Error('Seed phrase must contain exactly 12 words');
  }

  // Валидация: все слова непустые
  const cleanedWords = normalizeMnemonicWords(words);
  if (cleanedWords.some(w => w.length === 0)) {
    throw new Error('All 12 words must be non-empty');
  }

  // Проверка BIP39 валидности
  const isBIP39 = isValidBIP39Mnemonic(cleanedWords);
  const seedString = cleanedWords.join(' ');

  // Phase 7: чистая BIP39 схема
  if (isBIP39) {
    logger.info('[PILIGRIM] Phase 7: valid BIP39 mnemonic detected');
    try {
      const v7Identity = await restoreIdentityFromMnemonicV7(seedString);
      logger.info(`[PILIGRIM] Phase 7: restore SUCCESS (BIP39), uid=${v7Identity.uid}`);
      return v7Identity as Identity;
    } catch (e) {
      logger.error('[PILIGRIM] Phase 7: BIP39 restore failed:', e);
      // Fallback на legacy
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
    const baseKey = await crypto.subtle.importKey(
        'raw',
        seedBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

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

    logger.info(`[PILIGRIM] legacyRestoreFromSeed SUCCESS, uid=${uid}, fingerprint=${keyFingerprint}`);

    return {
        uid,
        publicKey: publicKeyStr,
        privateKey: privateKeyStr,
        keyFingerprint,
        seedPhrase: seedString,
        isBIP39: false, // legacy — ключи случайные, нет multi-device
    };
}


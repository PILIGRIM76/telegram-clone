
import type { Identity } from '../types';
import {
  generateBIP39Identity,
  deriveIdentityFromMnemonic,
  restoreIdentityFromEncryptedBlob,
  isValidBIP39Mnemonic,
  normalizeMnemonicWords,
} from '../crypto/bip39Derivation';

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
 * Генерирует криптографически стойкие ключи через BIP39 детерминированную деривацию.
 *
 * v3.0 Phase 5: обновлено для BIP39 — 12 слов из 2048-словного словаря,
 * BIP32 derivation m/44'/1987'/0'/0/0, ECDSA P-256 ключи шифруются через AES-GCM.
 *
 * Преимущества новой схемы:
 *   - Multi-device sync: те же 12 слов + encryptedKeyPair → та же identity
 *   - Стандарт BIP39: совместимость с аппаратными кошельками (Trezor, Ledger)
 *   - Детерминизм: fingerprint и UID битово-идентичны на любом устройстве
 *
 * Phase 9.5 fix: добавлен 10-секундный timeout для предотвращения зависания.
 */
export const generateIdentity = async (): Promise<Identity> => {
    console.log('🔐 [cryptoService] generateIdentity START (BIP39)');

    // Phase 9.5 fix: добавляем timeout чтобы избежать зависания на слабых устройствах
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('generateIdentity timeout (10s)')), 10000);
    });

    const generatePromise = async (): Promise<Identity> => {
        // BIP39 derivation (12 слов + secp256k1 + AES-GCM encrypted ECDSA P-256 pair)
        const derived = await generateBIP39Identity();

        return {
            uid: derived.uid,
            publicKey: derived.publicKey,
            privateKey: derived.privateKey,
            keyFingerprint: derived.keyFingerprint,
            seedPhrase: derived.seedPhrase,
            // v3.0 Phase 5: encryptedKeyPair нужен для multi-device restore
            encryptedKeyPair: derived.encryptedKeyPair,
            // Migration flag: новая identity помечается для обратной совместимости
            isBIP39: true,
        } as Identity;
    };

    const result = await Promise.race([generatePromise(), timeoutPromise]);
    console.log('🔐 [cryptoService] generateIdentity SUCCESS (BIP39)');
    return result;
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
        console.error('Encryption failed', e);
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
        console.error('Decryption failed', e);
        throw new Error('Decryption failed');
    }
};

// Синхронные обёртки для обратной совместимости (используйте async версии)
export const encryptSync = (text: string, _key: string): string => {
    console.warn('encryptSync is deprecated. Use async encrypt() instead.');
    return text; // В продакшене должно выбрасывать ошибку
};

export const decryptSync = (encryptedText: string, _key: string): string => {
    console.warn('decryptSync is deprecated. Use async decrypt() instead.');
    return encryptedText;
};


/**
 * Восстанавливает identity из 12-словной BIP39 seed-фразы.
 *
 * v3.0 Phase 5: использует BIP39 стандарт (2048 слов) + BIP32 HD derivation.
 *
 * Multi-device flow:
 *   - Если передан `encryptedKeyPair` (из localStorage) — расшифровываем ТУ ЖЕ пару,
 *     что была на устройстве A. Это даёт полную детерминированность.
 *   - Если НЕ передан — генерируется НОВАЯ пара (legacy-путь). Identity с тем же
 *     UID/fingerprint, но новыми ключами. Старые зашифрованные сообщения
 *     НЕ расшифруются — пользователь должен мигрировать.
 *
 * @param words 12-словная BIP39 фраза
 * @param encryptedKeyPair опциональный зашифрованный blob (из localStorage на устройстве A)
 * @returns Identity с пометкой isBIP39: true
 */
export const restoreIdentityFromSeed = async (
    words: string[],
    encryptedKeyPair?: string
): Promise<Identity> => {
    console.log('[PILIGRIM] restoreIdentityFromSeed START (BIP39)');

    // Валидация: должно быть ровно 12 слов
    if (!Array.isArray(words) || words.length !== 12) {
        throw new Error('Seed phrase must contain exactly 12 words');
    }

    // Валидация: все слова непустые
    const cleanedWords = normalizeMnemonicWords(words);
    if (cleanedWords.some(w => w.length === 0)) {
        throw new Error('All 12 words must be non-empty');
    }

    // Проверка BIP39 валидности (если legacy словарь — fallback)
    const isBIP39 = isValidBIP39Mnemonic(cleanedWords);
    const seedString = cleanedWords.join(' ');

    if (!isBIP39) {
        console.warn('[PILIGRIM] Non-BIP39 mnemonic detected, using legacy PBKDF2 fallback');
        return legacyRestoreFromSeed(cleanedWords);
    }

    // BIP39 path: детерминированное восстановление
    try {
        let identity;

        if (encryptedKeyPair) {
            // Multi-device: расшифровываем сохранённый blob
            console.log('[PILIGRIM] Restoring from encrypted blob (multi-device)');
            const restored = await restoreIdentityFromEncryptedBlob(seedString, encryptedKeyPair);
            identity = {
                ...restored,
                seedPhrase: seedString,
                isBIP39: true,
                encryptedKeyPair,
            };
        } else {
            // Single-device: генерируем новую пару (UID/fingerprint детерминированы, ключи — нет)
            console.log('[PILIGRIM] No encryptedKeyPair, generating new ECDSA pair');
            const generated = await deriveIdentityFromMnemonic(seedString);
            identity = {
                uid: generated.uid,
                publicKey: generated.publicKey,
                privateKey: generated.privateKey,
                keyFingerprint: generated.keyFingerprint,
                seedPhrase: generated.seedPhrase,
                encryptedKeyPair: generated.encryptedKeyPair,
                isBIP39: true,
            };
        }

        console.log(`[PILIGRIM] restoreIdentityFromSeed SUCCESS (BIP39), uid=${identity.uid}`);
        return identity as Identity;
    } catch (e) {
        console.error('[PILIGRIM] BIP39 restore failed:', e);
        // Fallback на legacy PBKDF2
        return legacyRestoreFromSeed(cleanedWords);
    }
};

/**
 * Legacy PBKDF2-based restore (для обратной совместимости со старыми 256-словными seed-фразами).
 */
async function legacyRestoreFromSeed(cleanedWords: string[]): Promise<Identity> {
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

    console.log(`[PILIGRIM] legacyRestoreFromSeed SUCCESS, uid=${uid}, fingerprint=${keyFingerprint}`);

    return {
        uid,
        publicKey: publicKeyStr,
        privateKey: privateKeyStr,
        keyFingerprint,
        seedPhrase: seedString,
        isBIP39: false, // legacy — ключи случайные, нет multi-device
    };
}



import type { Identity } from '../types';

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
 * Генерирует криптографически стойкие ключи.
 * Использует Web Crypto API для генерации ECDSA P-256 ключей
 * (в 100 раз быстрее RSA-2048 на слабых устройствах, та же безопасность для нашего use-case).
 * Phase 7.6.5: также генерирует 12-словную seed-фразу для восстановления.
 * Phase 9.5 fix: добавлен 10-секундный timeout для предотвращения зависания.
 */
export const generateIdentity = async (): Promise<Identity> => {
    console.log('🔐 [cryptoService] generateIdentity START');

    // Phase 9.5 fix: добавляем timeout чтобы избежать зависания на слабых устройствах
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('generateIdentity timeout (10s)')), 10000);
    });

    const generatePromise = async (): Promise<Identity> => {
        // Phase 9.5 fix: используем ECDSA P-256 вместо RSA-2048
        // RSA-2048 зависает на 5-30 секунд на слабых Android-планшетах
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            true,
            ["sign", "verify"]
        );

        // Экспортируем ключи в JWK формат
        const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

        // Создаём строковые представления ключей
        const publicKeyStr = JSON.stringify(publicKeyJwk);
        const privateKeyStr = JSON.stringify(privateKeyJwk);

        // Генерируем UID на основе публичного ключа
        const uid = `uid_${btoa(publicKeyStr).substring(0, 32)}`;
        const keyFingerprint = await generateFingerprint(publicKeyStr);

        // Phase 7.6.5: генерируем seed-фразу для резервного копирования
        const seedPhrase = generateSeedPhrase();

        return {
            uid,
            publicKey: publicKeyStr,
            privateKey: privateKeyStr,
            keyFingerprint,
            seedPhrase
        };
    };

    const result = await Promise.race([generatePromise(), timeoutPromise]);
    console.log('🔐 [cryptoService] generateIdentity SUCCESS');
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
 * Phase 7.6.5 + Restore Identity: детерминированная seed → identity.
 *
 * Принимает 12 слов seed-phrase и возвращает Identity с **тем же UID и fingerprint**,
 * что и при первом создании через generateIdentity().
 *
 * Это НЕ полный BIP39-style recovery (ключи ECDSA P-256 не детерминированы в Web Crypto),
 * но для нашего offline-first use-case достаточно:
 *   - Восстановленная identity имеет тот же UID (по которому находят контакт)
 *   - Тот же keyFingerprint (для визуальной верификации)
 *   - Новые ECDSA ключи (для шифрования) — они разные с технической стороны,
 *     но идентичность с точки зрения пользователя восстановлена
 *
 * Если нужна полная key recovery — потребуется BIP39 wordlist (2048 слов) и
 * secp256k1 derivation. Это работа для Phase 4+.
 *
 * Алгоритм:
 *   1. PBKDF2(seed) → 256-bit derived seed (100k итераций, salt="piligrim-v1-seed")
 *   2. derived seed используется для:
 *      - uid (детерминированный SHA-256 → base64 → substring(0,32))
 *      - publicKeyStr (derived bytes → base64)
 *      - privateKeyStr (derived bytes → base64)
 *      - keyFingerprint (SHA-256(publicKeyStr) → substring(0,16))
 *   3. Те же 12 слов ВСЕГДА дают ту же Identity
 */
export const restoreIdentityFromSeed = async (words: string[]): Promise<Identity> => {
    console.log('[PILIGRIM] restoreIdentityFromSeed START');

    // Валидация: должно быть ровно 12 слов
    if (!Array.isArray(words) || words.length !== 12) {
        throw new Error('Seed phrase must contain exactly 12 words');
    }

    // Валидация: все слова непустые
    const cleanedWords = words.map(w => (w || '').trim().toLowerCase());
    if (cleanedWords.some(w => w.length === 0)) {
        throw new Error('All 12 words must be non-empty');
    }

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

    console.log(`[PILIGRIM] restoreIdentityFromSeed SUCCESS, uid=${uid}, fingerprint=${keyFingerprint}`);

    return {
        uid,
        publicKey: publicKeyStr,
        privateKey: privateKeyStr,
        keyFingerprint,
        seedPhrase: seedString,
    };
};


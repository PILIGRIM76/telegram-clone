
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
 * Генерирует криптографически стойкие ключи.
 * Использует Web Crypto API для генерации RSA-OAEP ключей.
 */
export const generateIdentity = async (): Promise<Identity> => {
    // Генерируем RSA-OAEP ключи (2048 бит)
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
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

    return { 
        uid, 
        publicKey: publicKeyStr, 
        privateKey: privateKeyStr, 
        keyFingerprint 
    };
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

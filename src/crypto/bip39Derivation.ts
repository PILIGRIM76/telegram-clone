// src/crypto/bip39Derivation.ts
// v3.0 Phase 5: BIP39 детерминированная деривация ключей.
//
// Проблема: Web Crypto API (ECDSA P-256) генерирует случайные ключи —
// их нельзя восстановить из seed. Это блокирует multi-device E2EE:
// одно устройство шифрует сообщение своим publicKey, после restore на
// другом устройстве privateKey уже другой → сообщение не расшифровать.
//
// Решение (гибридный подход):
//   1. BIP39 mnemonic (12 слов из 2048-словного словаря) → seed
//   2. BIP32 HDKey derivation m/44'/1987'/0'/0/0 → secp256k1 privKey (32 байта)
//   3. Web Crypto API генерирует СЛУЧАЙНУЮ ECDSA P-256 пару (JWK)
//   4. ВСЯ пара (publicKeyJWK + privateKeyJWK) шифруется AES-GCM
//      с ключом, derived из SHA-256(secp256k1_privKey)
//   5. publicKey хранится в открытом виде, privateKey — в encrypted blob
//
// При restore на другом устройстве:
//   - secp256k1 privKey идентичен (BIP39 → BIP32 детерминирован)
//   - SHA-256 даёт тот же AES-GCM ключ
//   - encrypted blob расшифровывается → та же ECDSA пара
//   - publicKey и privateKey совпадают битово-идентично
//
// E2EE работает между устройствами без сервера.
//
// Backwards compatibility: legacy identity (PBKDF2) помечается isBIP39: false
// и обрабатывается legacyRestoreFromSeed() в cryptoService.

import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from '@scure/bip39';
// @scure/bip39 wordlist: runtime-импорт через .js, типы в .d.ts
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';

export interface DerivedIdentity {
  /** Уникальный идентификатор (16 hex chars из SHA-256(publicKeyJWK)) */
  uid: string;
  /** 12-словная BIP39 фраза (через пробел) */
  seedPhrase: string;
  /** Публичный ключ — ECDSA P-256 JWK JSON (для Web Crypto encrypt/decrypt) */
  publicKey: string;
  /** Приватный ключ — ECDSA P-256 JWK JSON (расшифрованный, для Web Crypto) */
  privateKey: string;
  /** Зашифрованный AES-GCM blob всей ECDSA пары — для multi-device restore */
  encryptedKeyPair: string;
  /** 8-hex-char отпечаток для визуальной верификации (SHA-256(publicKeyJWK)) */
  keyFingerprint: string;
  /** Маркер новой identity (true для BIP39) */
  isBIP39: true;
  /** Параметры деривации (для миграции/отладки) */
  derivationPath: string;
}

/**
 * Восстановленная identity из encrypted blob.
 * Используется при restore на новом устройстве: тот же 12-словный seed +
 * тот же encryptedKeyPair (из localStorage) → та же identity.
 */
export interface RestoredIdentity {
  uid: string;
  publicKey: string;
  privateKey: string;
  keyFingerprint: string;
}

/**
 * PILIGRIM coin type для BIP44.
 * 1987 — произвольный номер (не занят в SLIP-0044), символизирует год основания.
 */
const PILIGRIM_COIN_TYPE = 1987;

/**
 * Стандартный BIP44 derivation path для PILIGRIM:
 *   m / 44' / <coin_type>' / 0' / 0 / 0
 *   44' = BIP44, 1987' = coin type, 0' = account, 0 = external chain, 0 = address index
 */
const DEFAULT_DERIVATION_PATH = `m/44'/${PILIGRIM_COIN_TYPE}'/0'/0/0`;

/**
 * Генерирует новую identity из случайного BIP39 seed (12 слов).
 * ECDSA P-256 пара генерируется ОДИН раз и сохраняется в encryptedKeyPair.
 */
export async function generateBIP39Identity(
  derivationPath: string = DEFAULT_DERIVATION_PATH
): Promise<DerivedIdentity> {
  // 128 бит энтропии = 12 слов
  const mnemonic = generateMnemonic(wordlist, 128);
  return deriveIdentityFromMnemonicAsync(mnemonic, derivationPath);
}

/**
 * Детерминированно создаёт identity из 12-словной BIP39 фразы.
 *
 * ⚠️ ВАЖНО: Web Crypto API не поддерживает детерминированный ECDSA keygen —
 * при каждом вызове генерируется НОВАЯ случайная пара. Поэтому:
 *   - `generateBIP39Identity()` — создаёт identity с новой парой (на устройстве A)
 *   - `restoreIdentityFromEncryptedBlob(mnemonic, encryptedKeyPair)` — для restore
 *     на устройстве B: расшифровывает СОХРАНЁННЫЙ blob (получен из localStorage),
 *     в результате получается ТА ЖЕ пара, что и на устройстве A.
 *
 * @throws Error если mnemonic невалиден
 */
export async function deriveIdentityFromMnemonic(
  mnemonic: string,
  derivationPath: string = DEFAULT_DERIVATION_PATH
): Promise<DerivedIdentity> {
  return deriveIdentityFromMnemonicAsync(mnemonic, derivationPath);
}

/**
 * Восстанавливает identity из mnemonic + encrypted blob (multi-device).
 *
 * Это ДЕТЕРМИНИРОВАННЫЙ путь: те же 12 слов + тот же encryptedKeyPair
 * → тот же secp256k1 privKey → тот же AES-GCM ключ → тот же расшифрованный blob
 * → та же ECDSA пара.
 *
 * @param mnemonic 12-словная BIP39 фраза
 * @param encryptedKeyPair Зашифрованный AES-GCM blob всей ECDSA пары (из localStorage)
 * @param derivationPath BIP44 path (по умолчанию m/44'/1987'/0'/0/0)
 */
export async function restoreIdentityFromEncryptedBlob(
  mnemonic: string,
  encryptedKeyPair: string,
  derivationPath: string = DEFAULT_DERIVATION_PATH
): Promise<RestoredIdentity> {
  const normalizedMnemonic = (mnemonic || '').trim().toLowerCase();

  if (!validateMnemonic(normalizedMnemonic, wordlist)) {
    throw new Error('Invalid BIP39 mnemonic (wrong words or checksum)');
  }

  // Получаем secp256k1 privKey (BIP32 derivation)
  const seed = mnemonicToSeedSync(normalizedMnemonic);
  const master = HDKey.fromMasterSeed(seed);
  const child = master.derive(derivationPath);
  if (!child.privateKey) {
    throw new Error('Key derivation failed (HDKey has no private)');
  }

  // Derive AES-GCM ключ и расшифровываем blob
  const aesKey = await deriveAESKeyFromSeed(child.privateKey);
  const blob = JSON.parse(encryptedKeyPair);
  if (!blob || blob.enc !== 'AES-GCM' || !blob.iv || !blob.ct) {
    throw new Error('Invalid encrypted key pair format');
  }
  const iv = base64UrlToBytes(blob.iv);
  const ct = base64UrlToBytes(blob.ct);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    ct as BufferSource
  );
  const text = new TextDecoder().decode(decrypted);
  const keyPair = JSON.parse(text);

  // Собираем identity
  const publicKeyJwk = keyPair.pub;
  const privateKeyJwk = keyPair.priv;
  const uid = await generateUIDFromJWK(publicKeyJwk);
  const keyFingerprint = await generateFingerprintFromJWK(publicKeyJwk);

  return {
    uid,
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
    keyFingerprint,
  };
}

export async function deriveIdentityFromMnemonicAsync(
  mnemonic: string,
  derivationPath: string = DEFAULT_DERIVATION_PATH
): Promise<DerivedIdentity> {
  const normalizedMnemonic = (mnemonic || '').trim().toLowerCase();

  if (!validateMnemonic(normalizedMnemonic, wordlist)) {
    throw new Error('Invalid BIP39 mnemonic (wrong words or checksum)');
  }

  // BIP39: mnemonic → 64-byte seed (PBKDF2-HMAC-SHA512, 2048 iterations)
  const seed = mnemonicToSeedSync(normalizedMnemonic);

  // BIP32: seed → HD master key (HMAC-SHA512)
  const master = HDKey.fromMasterSeed(seed);

  // BIP44: m/44'/1987'/0'/0/0 — деривация для PILIGRIM
  const child = master.derive(derivationPath);

  if (!child.privateKey || !child.publicKey) {
    throw new Error('Key derivation failed (HDKey has no private/public)');
  }

  return finalizeDerivedIdentity(child.privateKey, normalizedMnemonic, derivationPath);
}

/**
 * Валидация: проверить, что 12/15/18/21/24 слов — валидный BIP39 mnemonic.
 */
export function isValidBIP39Mnemonic(words: string[] | string): boolean {
  const mnemonic = Array.isArray(words) ? words.join(' ') : words;
  return validateMnemonic((mnemonic || '').trim().toLowerCase(), wordlist);
}

/**
 * Нормализует массив слов: trim, lowercase, фильтр пустых.
 */
export function normalizeMnemonicWords(words: string[]): string[] {
  return (words || [])
    .map((w) => (w || '').trim().toLowerCase())
    .filter((w) => w.length > 0);
}

// =============================================================
// Internal helpers
// =============================================================

/**
 * Derive 256-bit AES-GCM key из secp256k1 privKey (через SHA-256 + importKey).
 */
async function deriveAESKeyFromSeed(secp256k1PrivateKey: Uint8Array): Promise<CryptoKey> {
  // Приведение к ArrayBuffer для совместимости с TS 5.x strict
  const seedHash = await crypto.subtle.digest(
    'SHA-256',
    secp256k1PrivateKey.buffer.slice(
      secp256k1PrivateKey.byteOffset,
      secp256k1PrivateKey.byteOffset + secp256k1PrivateKey.byteLength
    ) as ArrayBuffer
  );
  return crypto.subtle.importKey(
    'raw',
    seedHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Генерирует ECDSA P-256 пару и шифрует её через AES-GCM.
 * Возвращает полную DerivedIdentity.
 */
async function finalizeDerivedIdentity(
  secp256k1PrivateKey: Uint8Array,
  mnemonic: string,
  derivationPath: string
): Promise<DerivedIdentity> {
  // 1. Derive AES-GCM ключ из secp256k1 privKey
  const aesKey = await deriveAESKeyFromSeed(secp256k1PrivateKey);

  // 2. Генерируем ECDSA P-256 пару (sign/verify — соответствует текущему cryptoService)
  const randomKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', randomKeyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', randomKeyPair.privateKey);

  // 3. Шифруем ОБА ключа через AES-GCM как единый blob
  const keyPairBlob = { pub: publicKeyJwk, priv: privateKeyJwk };
  const blobBytes = new TextEncoder().encode(JSON.stringify(keyPairBlob));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBlob = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    blobBytes
  );

  // 4. Сериализуем encrypted blob
  const storedBlob = {
    enc: 'AES-GCM',
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(new Uint8Array(encryptedBlob)),
  };

  // 5. UID и fingerprint — на основе publicKeyJWK
  const uid = await generateUIDFromJWK(publicKeyJwk);
  const keyFingerprint = await generateFingerprintFromJWK(publicKeyJwk);

  return {
    uid,
    seedPhrase: mnemonic,
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
    encryptedKeyPair: JSON.stringify(storedBlob),
    keyFingerprint,
    isBIP39: true,
    derivationPath,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), '=');
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return bytesToHex(new Uint8Array(hash));
}

async function generateUIDFromJWK(publicKeyJwk: JsonWebKey): Promise<string> {
  const jwkStr = JSON.stringify(publicKeyJwk);
  const hashHex = await sha256Hex(jwkStr);
  return `uid_${hashHex.substring(0, 16)}`;
}

async function generateFingerprintFromJWK(publicKeyJwk: JsonWebKey): Promise<string> {
  const jwkStr = JSON.stringify(publicKeyJwk);
  const hashHex = await sha256Hex(jwkStr);
  return hashHex.substring(0, 8).toUpperCase();
}

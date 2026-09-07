
export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
    message?: string;
    requires2FA?: boolean;
    sessionToken?: string;
    qrCode?: string;
    secret?: string;
}

export interface TwoFactorSetup {
    success?: boolean;
    error?: string;
    secret: string;
    qrCode: string;
    manualKey: string;
}

export interface User {
    uid: string;
    имяПользователя?: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'received';
export type E2EEStatus = 'verified' | 'pending' | 'unverified';
export type OrderStatus = 'new' | 'processing' | 'shipped' | 'completed' | 'paid' | 'cancelled';

/**
 * Phase 7: Pure BIP39 + secp256k1 Identity (v7)
 * 
 * Новая схема: BIP39 → secp256k1 → identity (ключи напрямую, без ECDSA wrapper)
 * - publicKeyHex: 33 байта compressed secp256k1 public key (hex string, 66 chars)
 * - privateKeyHex: 32 байта secp256k1 private key (hex string, 64 chars)
 * - UID = uid_ + первые 16 байт приватного ключа (hex)
 * 
 * Benefits:
 * - Быстрее keygen (нет Web Crypto API round-trip)
 * - Меньше кода, меньше attack surface
 * - Детерминированно: одни и те же 12 слов → одни и те же ключи
 */
export interface Identity {
  uid: string;
  /** Phase 7: secp256k1 public key in compressed hex format (33 bytes = 66 hex chars) */
  publicKeyHex: string;
  /** Phase 7: secp256k1 private key in hex format (32 bytes = 64 hex chars) */
  privateKeyHex: string;
  /** Username for display */
  username?: string;
  /** Avatar image base64 data URL */
  avatar?: string;
  /** Store data (for marketplace feature) */
  store?: Store;
  /** Announcement boards */
  boards?: NoticeBoard[];
  /** 8-hex-char fingerprint for visual verification (SHA-256(truncated) of publicKeyHex) */
  keyFingerprint?: string;
  /** 12-word BIP39 seed phrase (stored as space-separated string for Phase 7) */
  seedPhrase?: string;
  /** Version marker: 'v7' for new pure BIP39/secp256k1 scheme */
  version?: 'v7';
  /** Always true for new identities */
  isBIP39?: boolean;
}

/**
 * Legacy identity (pre-Phase 7): с использованием ECDSA P-256 и encryptedKeyPair.
 * Автоматически мигрируется при восстановлении из seed-фразы.
 */
export interface LegacyIdentity {
  uid: string;
  /** ECDSA P-256 JWK public key (legacy) */
  publicKey: string;
  /** ECDSA P-256 JWK private key (legacy) */
  privateKey: string;
  username?: string;
  avatar?: string;
  store?: Store;
  boards?: NoticeBoard[];
  keyFingerprint?: string;
  /** 12-словная BIP39 фраза */
  seedPhrase?: string;
  /** Зашифрованный ECDSA JWK (legacy) */
  encryptedKeyPair?: string;
  /** false/undefined = legacy PBKDF2 identity */
  isBIP39?: boolean;
}

/**
 * Union type for all identity variants.
 * Use isBIP39/version to distinguish at runtime.
 */
export type IdentityType = Identity | LegacyIdentity;

export interface Contact {
  id: string; // Локальный ID
  uid: string;
  name: string;
  verified: boolean;
  /** Phase 7: secp256k1 public key in hex format (66 chars) OR ECDSA JWK (legacy) */
  publicKey?: string;
  /** Phase 7: secp256k1 public key hex (preferred) */
  publicKeyHex?: string;
  keyFingerprint?: string;
  mutedUntil?: number | 'forever';
  archived?: boolean;
  /** v3.0 Phase 4: E2EE status of contact */
  e2eeStatus?: E2EEStatus;
  /** Online status */
  online?: boolean;
  /** Last seen timestamp */
  lastSeen?: string;
}

export interface Group {
    id: string; // ID на сервере
    name: string;
    members: string[]; // UID участников
    ownerId: string;
    type: 'public' | 'private';
    inviteToken?: string;
}

export interface Gift {
    id: string;
    name: string;
    emoji: string;
    type: 'free' | 'premium';
    price?: number;
    currency?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status?: MessageStatus;
  groupId?: string; // Если сообщение в группе
  type?: 'user' | 'system' | 'read';

  // Медиа файлы
  media?: string; // Base64 строка (legacy single media)
  mediaType?: 'image' | 'video';

  // v3.0 Phase 5: массив вложений (фото-галерея)
  attachments?: { id: string; dataUrl: string; name: string }[];

  // Для исчезающих сообщений
  disappearIn?: number; // В секундах
  timerSetAt?: number; // Timestamp установки

  // Для сложных данных (заказы, обновления, подарки)
  payload?: any;

    // Phase 7.6 / Stage 4: E2EE (RSA-OAEP)
  /** Зашифрованный текст (base64). Если есть — UI показывает иконку 🔒. */
  encryptedPayload?: string;
  /** Флаг: true если сообщение было зашифровано при отправке. */
  isEncrypted?: boolean;
    /** v3.0 Phase 3: ID родительского сообщения, на которое данное является ответом */
  replyTo?: string;

  /** v3.0 Phase 4: E2EE status of individual message */
  e2eeStatus?: E2EEStatus;
}

export interface Chat {
  contactId: string; // Может быть ID контакта или ID группы
  messages: Message[];
  disappearTimer?: number; // Текущая настройка таймера для этого чата
  /** v1.6 Batch 4: timestamp до которого уведомления чата заглушены (Number.MAX_SAFE_INTEGER = forever) */
  mutedUntil?: number;
  /** v1.6 Batch 4: чат в архиве (скрыт из основного списка) */
  archived?: boolean;
  /** v3.0 Phase 4 (Signal Protocol): тип шифрования чата — 'signal' (PFS, Double Ratchet) или 'nacl' (legacy). */
  encryptionType?: 'signal' | 'nacl';
}

// --- E-Commerce и Доски ---

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string; // Обычно 'USDT' или 'BTC' (симуляция)
    image?: string; // Base64
}

export interface Order {
    id: string;
    product: Product;
    buyerUid: string;
    status: OrderStatus;
    createdAt: number;
    txid?: string; // ID транзакции оплаты
}

export interface Store {
    name: string;
    description: string;
    type: 'public' | 'private';
    products: Product[];
    sellerWallet?: string;
    paymentAddress?: string; // Смарт-контракт
    inviteToken?: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    publishedAt: number;
}

export interface NoticeBoard {
    id: string;
    ownerUid: string;
    name: string;
    description: string;
    announcements: Announcement[];
    
    // Монетизация
    expiresAt?: number; // Timestamp
    pricePerAd?: number;
    ownerWallet?: string;
    contractAddress?: string;
}

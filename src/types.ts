
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
export type OrderStatus = 'new' | 'processing' | 'shipped' | 'completed' | 'paid' | 'cancelled';

export interface Identity {
  uid: string;
  publicKey: string;
  privateKey: string;
  username?: string;
  avatar?: string;
  store?: Store;
  boards?: NoticeBoard[];
  keyFingerprint?: string;
  seedPhrase?: string; // Phase 7.6.5: 12-словная фраза для восстановления (опционально для старых Identity)
}

export interface Contact {
  id: string; // Локальный ID
  uid: string;
  name: string;
  verified: boolean;
  keyFingerprint?: string;
  publicKey?: string; // Phase 7.6: JWK-строка публичного ключа для E2EE шифрования
  mutedUntil?: number | 'forever';
  archived?: boolean;
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
  media?: string; // Base64 строка
  mediaType?: 'image' | 'video';

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
}

export interface Chat {
  contactId: string; // Может быть ID контакта или ID группы
  messages: Message[];
  disappearTimer?: number; // Текущая настройка таймера для этого чата
  /** v1.6 Batch 4: timestamp до которого уведомления чата заглушены (Number.MAX_SAFE_INTEGER = forever) */
  mutedUntil?: number;
  /** v1.6 Batch 4: чат в архиве (скрыт из основного списка) */
  archived?: boolean;
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

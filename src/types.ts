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

/** Identity v7 на основе BIP39 и secp256k1, без обёртки ECDSA. */
export interface Identity {
  uid: string;
  /** Публичный ключ secp256k1 в сжатом hex-формате (33 байта, 66 символов). */
  publicKeyHex: string;
  /** Приватный ключ secp256k1 в hex-формате (32 байта, 64 символа). */
  privateKeyHex: string;

  username?: string;
  /** Изображение аватара в формате base64 data URL. */
  avatar?: string;

  store?: Store;
  /** Доски объявлений пользователя. */
  boards?: NoticeBoard[];
  /** Отпечаток из 8 hex-символов для визуальной проверки: усечённый SHA-256 публичного ключа. */
  keyFingerprint?: string;
  /** Фраза BIP39 из 12 слов, сохранённая одной строкой. */
  seedPhrase?: string;
  /** Версия identity: v7 использует BIP39 и secp256k1. */
  version?: 'v7';

  isBIP39?: boolean;
  /** Публичный транспортный ключ NaCl box в base64 для сквозного шифрования сообщений. */
  transportPublicKey?: string;
}

/**
 * Устаревший формат identity до этапа 7: использует ECDSA P-256 и encryptedKeyPair.
 * Автоматически мигрируется при восстановлении из seed-фразы.
 */
export interface LegacyIdentity {
  uid: string;
  /** Публичный ключ ECDSA P-256 в формате JWK для identity старого формата. */
  publicKey: string;
  /** Приватный ключ ECDSA P-256 в формате JWK для identity старого формата. */
  privateKey: string;
  username?: string;
  avatar?: string;
  store?: Store;
  boards?: NoticeBoard[];
  keyFingerprint?: string;
  /** Фраза BIP39 из 12 слов. */
  seedPhrase?: string;
  /** Зашифрованный ключ ECDSA JWK старого формата. */
  encryptedKeyPair?: string;
  /** Значение false или undefined обозначает identity, созданную прежним способом PBKDF2. */
  isBIP39?: boolean;
  /** Публичный транспортный ключ NaCl box в base64 для сквозного шифрования сообщений. */
  transportPublicKey?: string;
}

/** Объединённый тип identity; варианты различаются по полю isBIP39 или version. */
export type IdentityType = Identity | LegacyIdentity;

export interface Contact {
  id: string; // Локальный идентификатор.
  uid: string;
  name: string;
  verified: boolean;
  /** Публичный ключ secp256k1 в hex-формате или JWK ECDSA для устаревшей identity. */
  publicKey?: string;
  /** Публичный ключ secp256k1 в hex-формате; предпочтительный вариант. */
  publicKeyHex?: string;
  keyFingerprint?: string;
  mutedUntil?: number | 'forever';
  archived?: boolean;
  /** Статус сквозного шифрования контакта. */
  e2eeStatus?: E2EEStatus;
  /** Признак, что пользователь подключён через WebSocket. */
  isOnline?: boolean;
  /** Время последней активности в формате Unix time (секунды). */
  lastSeen?: number;
}

export interface Group {
  id: string; // Идентификатор на сервере.
  name: string;
  members: string[]; // UID участников
  ownerId: string;
  type: 'public' | 'private';
  inviteToken?: string;
}

// v3.19: User preview for contact cards and search results
export interface UserPreview {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  // v3.20: Phone hash for contact sync (optional, for debugging/display)
  phoneHash?: string;
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
  type?: 'user' | 'system' | 'read' | 'voice';

  // Медиа файлы
  media?: string; // Строка Base64 для одного медиафайла старого формата.
  mediaType?: 'image' | 'video';

  // Этап 5: массив вложений для фотогалереи.
  attachments?: { id: string; dataUrl: string; name: string }[];

  // Для исчезающих сообщений
  disappearIn?: number; // В секундах (TTL при отправке)
  timerSetAt?: number; // Время установки таймера (Unix ms)
  expiresAt?: number; // Время истечения таймера (Unix ms) - вычисляется на сервере

  // Для сложных данных (заказы, обновления, подарки)
  payload?: unknown;

  // Поля сквозного шифрования RSA-OAEP.
  /** Зашифрованный текст в base64. При наличии интерфейс показывает значок 🔒. */
  encryptedPayload?: string;
  /** Признак того, что сообщение было зашифровано при отправке. */
  isEncrypted?: boolean;
  /** Этап 3: идентификатор сообщения, на которое дано это сообщение. */
  replyTo?: string;

  e2eeStatus?: E2EEStatus;

  // ============================================================
  // Зашифрованные файловые вложения.
  // ============================================================
  /** Зашифрованные файловые вложения с метаданными сквозного шифрования. */
  encryptedAttachments?: EncryptedAttachment[];

  // Данные голосового сообщения.
  /** Метаданные голосового сообщения. */
  voiceMetadata?: VoiceMessageMetadata;

  // Редактирование и удаление сообщений.
  /** Время последнего редактирования. */
  editedAt?: number;
  /** Время удаления. */
  deletedAt?: number;
  /** Признак того, что сообщение было отредактировано. */
  isEdited?: boolean;
  /** Признак подсветки сообщения в результатах поиска. */
  highlighted?: boolean;
  /** Признак того, что сообщение удалено для текущего пользователя. */
  isDeleted?: boolean;

  // Отметки о прочтении.
  /** Массив объектов {uid, timestamp} для отслеживания прочтения. */
  readBy?: { uid: string; timestamp: number }[];

  // Реакции (эмодзи).
  /** Массив реакций: { emoji: string; count: number; users: string[]; mine?: boolean }. */
  reactions?: Reaction[];

  // Пересылка сообщений.
  /** Информация об исходном сообщении, если это пересланное сообщение. */
  forwardedFrom?: {
    /** UID оригинального отправителя. */
    originalSenderUid: string;
    /** ID оригинального сообщения. */
    originalMessageId: string;
    /** Счетчик пересылок (сколько раз пересылали). */
    forwardCount: number;
    /** Имя оригинального отправителя (для отображения в UI). */
    originalSenderName?: string;
  };
}

/** Реакция на сообщение (эмодзи + количество + список пользователей). */
export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // UID пользователей, поставивших эту реакцию
  mine?: boolean; // Поставил ли текущий пользователь эту реакцию
}

/**
 * Зашифрованное файловое вложение с E2EE
 * - ciphertext: зашифрованные данные файла (ArrayBuffer в base64);
 * - iv: вектор инициализации AES-GCM;
 * - key: симметричный ключ, зашифрованный открытым ключом получателя;
 * - name: исходное имя файла;
 * - type: MIME-тип файла;
 * - size: исходный размер файла.
 */
export interface EncryptedAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  ciphertext: string; // Зашифрованные данные ArrayBuffer в base64.
  iv: string; // Вектор инициализации Uint8Array в base64.
  key: string; // Зашифрованный симметричный ключ в base64.
}

/** Вложение с данными, подготовленными для отображения в интерфейсе. */
export interface Attachment {
  id: string;
  dataUrl: string;
  name: string;
}

export interface Chat {
  contactId: string; // Может быть ID контакта или ID группы
  messages: Message[];
  disappearIn?: number; // Текущая настройка таймера для этого чата (секунды)
  /** Этап 4: время, до которого уведомления отключены (Number.MAX_SAFE_INTEGER означает навсегда). */
  mutedUntil?: number;
  /** Этап 4: чат перемещён в архив и скрыт из основного списка. */
  archived?: boolean;
  /** Этап 4 (Signal Protocol): тип шифрования — 'signal' (PFS, Double Ratchet) или 'nacl' (старый формат). */
  encryptionType?: 'signal' | 'nacl';
}

// --- E-Commerce и Доски ---

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string; // Обычно 'USDT' или 'BTC' (симуляция)
  image?: string; // Данные в формате Base64.
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
  expiresAt?: number; // Временные отметки.
  pricePerAd?: number;
  ownerWallet?: string;
  contractAddress?: string;
}

// ============================================================
// Каналы, подарки, награды и инструменты управления авторами.
// ============================================================

/** Роль участника в канале/группе/магазине. */
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';

/**
 * Канал для публикации сообщений в стиле Telegram.
 * Только владелец и назначенные админы могут публиковать посты.
 * Список подписчиков нужен серверу только для маршрутизации; содержимое ему недоступно.
 */
export interface Channel {
  id: string;
  title: string;
  description?: string;
  ownerId: string; // Создатель.
  admins: string[]; // UID администраторов, включая владельца.
  moderators: string[]; // UID модераторов
  subscribers: string[]; // UID подписчиков для маршрутизации.
  avatar?: string; // Изображение в формате base64 data URL.
  verified?: boolean;
  createdAt: number;
  postCount: number;
  inviteToken?: string;
}

/** Пост в канале. */
export interface ChannelPost {
  id: string;
  channelId: string;
  authorId: string; // UID автора: владелец или администратор.
  text: string;
  attachments?: { id: string; dataUrl: string; name: string }[];
  timestamp: string;
  encryptedPayload?: string; // Необязательное сквозное шифрование.
  views: number;
}

/**
 * Отправка подарка в стиле Telegram.
 * `giftId` ссылается на каталог Gift.
 */
export interface GiftSend {
  id: string;
  giftId: string;
  fromUid: string;
  toUid: string;
  channelId?: string; // Указывается, если подарок опубликован в канале.
  message?: string;
  sentAt: number;
}

/**
 * Награда или достижение пользователя: уровень или полученный подарок.
 */
export interface Reward {
  id: string;
  uid: string; // получатель
  type: 'achievement' | 'gift' | 'level' | 'creator';
  label: string;
  description?: string;
  icon?: string; // emoji или asset
  earnedAt: number;
}

/** Группа с ролями создателя и администраторов, расширяющая Group старого формата. */
export interface ManagedGroup extends Group {
  admins: string[];
  moderators: string[];
}

/** Публичная карточка канала (без раскрытия списка подписчиков). */
export interface PublicChannel {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  avatar?: string;
  verified?: boolean;
  subscriberCount: number;
  postCount: number;
  inviteToken?: string;
}

// ============================================================
// Поиск сообщений на клиенте без нарушения сквозного шифрования.
// ============================================================

/**
 * Результат поиска по сообщениям.
 * Поиск выполняется на клиенте — сервер не имеет доступа к содержимому.
 */
export interface SearchResult {
  message: Message;
  contactUid: string;
  contactName: string;
  snippet: string; // фрагмент текста с подсветкой
  matchPositions: Array<{ start: number; end: number }>; // позиции совпадений
}

/**
 * Опции для поиска.
 */
export interface SearchOptions {
  query: string;
  contactUid?: string; // если ищем в конкретном чате
  limit?: number; // Максимальное количество результатов (по умолчанию 50).
}

// Типы голосовых сообщений.

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

export interface VoiceMessageMetadata {
  duration: number;
  mimeType: string; // Формат аудио, например audio/webm.
  size: number;
}

export interface DecryptedVoiceMessage {
  blob: Blob; // Расшифрованные аудиоданные.
  url: string;
  duration: number;
}

// Событие изменения состояния записи.
export interface RecordingStateUpdate {
  status: RecordingStatus;
  elapsedSeconds: number;
  error?: string;
}

// Типы для редактирования и удаления сообщений.
export interface MessageEdit {
  id: string;
  messageId: string;
  oldContent: string;
  editedAt: number;
}

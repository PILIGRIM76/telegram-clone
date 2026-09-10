import { logger } from './logger';
import type { Message, Store, Group, NoticeBoard } from '../types';
import { encryptMessage, decryptMessage } from '../crypto/encryption';
import * as nacl from 'tweetnacl';
import { buildWsAuthUrl, redactWsUrl } from '../utils/websocketAuth';
import { hybridEncrypt, hybridDecrypt, type EncryptedPayload } from '../crypto/signal/SignalMessageLayer';
import type { PreKeyBundle } from '../crypto/signal/types';
// Phase 2: Metadata protection — traffic padding и Tor proxy.
import { TrafficPadder, padMessage, unpadMessage, encodeConstantSizePacket, decodeConstantSizePacket } from './trafficPadding';
import { torProxy } from './torProxy';
// Phase 3: Dumb Server — клиентская офлайн-очередь в IndexedDB.
import { offlineQueue, type QueuedMessage } from './offlineQueue';

// v2.0 Stage 3-4: WebSocket через Nginx TLS (4443) для устранения Mixed Content
// REST API остаётся на прямом HTTP (4000) для локального доступа.
// FIX 2026-09-10: process.env вместо import.meta.env — ts-jest не понимает
// import.meta (TS1343). Vite заменяет process.env.* на нужные значения через define.
const BASE_URL = process.env.VITE_API_URL || 'http://192.168.100.4:4000';
const API_URL = BASE_URL.replace(/\/+$/, '');
// WS через Nginx TLS reverse proxy: wss://192.168.100.4:4443/?uid=...
// Для локальной разработки без nginx: VITE_WS_URL=ws://localhost:8080
const WS_URL = process.env.VITE_WS_URL || 'wss://192.168.100.4:4443';
// Fallback: если wss:// (nginx TLS) недоступен, шлём plain ws:// на тот же
// хост:порт, что и REST API — Dumb Server поднимает WebSocket на том же порту (4000).

if (typeof console !== 'undefined') {
  logger.info('[apiService] BASE_URL =', BASE_URL, 'API_URL =', API_URL, 'WS_URL =', WS_URL);
}

class ApiService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: Message) => void)[] = [];
  private openListeners: (() => void)[] = [];
  private closeListeners: (() => void)[] = [];
  private errorListeners: ((error: any) => void)[] = [];
  private typingListeners: ((chatId: string) => void)[] = [];
  // Phase 2: TrafficPadder для отправки шумовых пакетов каждые 30-60 секунд.
  private trafficPadder: TrafficPadder = new TrafficPadder();

  // E2EE Keys
  private myKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | null = null;
  private myPublicKeyBase64: string = '';
  private recipientPublicKey: Uint8Array | null = null;

  // Инициализация ключей E2EE (NaCl box). При указании uid загружает/сохраняет в localStorage.
  initKeys(uid?: string): void {
    if (uid) {
      const stored = localStorage.getItem(`piligrim-box-${uid}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const secret = new Uint8Array(parsed.secretKey);
          const pub = new Uint8Array(parsed.publicKey);
          this.myKeyPair = { publicKey: pub, secretKey: secret };
          this.myPublicKeyBase64 = btoa(String.fromCharCode(...pub));
          return;
        } catch (e) {
          logger.warn('[API] Failed to load persisted box keys, generating new');
        }
      }
    }
    this.myKeyPair = nacl.box.keyPair();
    this.myPublicKeyBase64 = btoa(String.fromCharCode(...this.myKeyPair.publicKey));
    if (uid) {
      try {
        localStorage.setItem(`piligrim-box-${uid}`, JSON.stringify({
          publicKey: Array.from(this.myKeyPair.publicKey),
          secretKey: Array.from(this.myKeyPair.secretKey),
        }));
      } catch (e) {
        logger.warn('[API] Failed to persist box keys:', e);
      }
    }
  }

  getTransportPublicKey(): string {
    return this.myPublicKeyBase64;
  }

  // Установить публичный ключ получателя
  setRecipientPublicKey(publicKeyBase64: string): void {
    const binary = atob(publicKeyBase64);
    this.recipientPublicKey = new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
  }

  private base64ToKey(base64: string): Uint8Array {
    const binary = atob(base64);
    return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
  }

  async register(uid: string, publicKey: string): Promise<void> {
    const response = await fetch(API_URL + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, publicKey })
    });
    if (!response.ok) throw new Error('Registration error');
  }

  async findUserByUid(uid: string): Promise<any> {
    const response = await fetch(API_URL + '/key/' + uid);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  }

  // Phase 2: получить pre-key bundle собеседника для инициализации Signal сессии.
  // Возвращает null если у собеседника нет Signal bundle (fallback на NaCl).
  async getPreKeyBundle(uid: string): Promise<PreKeyBundle | null> {
    try {
      const response = await fetch(API_URL + '/key/' + uid);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.preKeyBundle) return null;
      // Маппинг snake_case → camelCase из серверного JSON в типизированный PreKeyBundle
      return {
        registrationId: data.preKeyBundle.registrationId,
        deviceId: data.preKeyBundle.deviceId ?? 1,
        preKeyId: data.preKeyBundle.preKeyId,
        preKey: data.preKeyBundle.preKey,
        signedPreKeyId: data.preKeyBundle.signedPreKeyId,
        signedPreKey: data.preKeyBundle.signedPreKey,
        signature: data.preKeyBundle.signature,
        identityKey: data.preKeyBundle.identityKey,
      };
    } catch (e) {
      logger.warn(`[API] getPreKeyBundle(${uid}) failed:`, e);
      return null;
    }
  }

  // Phase 2: опубликовать свой pre-key bundle на сервер для инициаторов Signal сессий.
  async publishPreKeyBundle(uid: string, bundle: PreKeyBundle): Promise<boolean> {
    try {
      const response = await fetch(API_URL + '/keys/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, preKeyBundle: bundle }),
      });
      if (!response.ok) {
        logger.warn(`[API] publishPreKeyBundle(${uid}): server returned ${response.status}`);
        return false;
      }
      logger.info(`[API] Pre-key bundle published for ${uid}`);
      return true;
    } catch (e) {
      logger.warn(`[API] publishPreKeyBundle(${uid}) failed:`, e);
      return false;
    }
  }

  async createOrUpdateStore(uid: string, store: Store): Promise<any> {
    const response = await fetch(API_URL + '/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, store: store })
    });
    return response.json();
  }

  async findStoreByInvite(token: string): Promise<any> {
    const response = await fetch(API_URL + '/store/invite/' + token);
    if (!response.ok) throw new Error('Invalid invitation');
    return response.json();
  }

  // === Groups ===
  async createGroup(name: string, ownerId: string, type: 'public' | 'private', encryptedMembers?: string[]): Promise<{ id: string; token?: string }> {
    const response = await fetch(API_URL + '/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, ownerId, type, encryptedMembers }),
    });
    if (!response.ok) throw new Error('Group creation failed');
    return response.json();
  }

  async joinGroup(uid: string, groupId: string, encryptedMembers?: string[]): Promise<any> {
    const response = await fetch(API_URL + '/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, groupId, encryptedMembers }),
    });
    if (!response.ok) throw new Error('Group join failed');
    return response.json();
  }

  async updateBoard(boardId: string, data: any): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error updating board');
  }

  async deleteAnnouncement(boardId: string, announcementId: string): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId + '/announcements/' + announcementId, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error deleting announcement');
  }

  async editAnnouncement(boardId: string, data: any): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId + '/announcements/' + data.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: data })
    });
    if (!response.ok) throw new Error('Error editing announcement');
  }

  async addAnnouncement(uid: string, boardId: string, announcement: any, txid?: string): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId + '/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, announcement, txid })
    });
    if (!response.ok) throw new Error('Error adding announcement');
  }

  connect(uid: string) {
    if (this.ws) this.disconnect();
    // Раньше onerror перезапускал connect(uid, true), что ломало тест onerror
    // (done() не вызывался — timeout 5000ms). Фоллбэк WSS→WS реализован в useWebSocket hook.
    // Phase 2: ленивая инициализация E2EE ключей для транспортного NaCl box.
    // Гарантирует что sendMessageSecure не упадёт в silent fallback на plaintext.
    if (!this.myKeyPair) {
      this.initKeys(uid);
    }
    // v2.0 Stage 4: используем buildWsAuthUrl для передачи publicKey в handshake
    const identityStr = localStorage.getItem('piligrim-identity');
    const identity = identityStr ? JSON.parse(identityStr) : null;
    const authUrl = buildWsAuthUrl(WS_URL, identity);
    this.ws = new WebSocket(authUrl);

    // Phase 2: запускаем traffic padder после открытия WS.
    // Шумовые пакеты отправляются каждые 30-60 секунд.
    // FIX 2026-09-10: было дублирование onopen (строка 344 переписывала его,
    // из-за чего trafficPadder и processOfflineQueue НЕ запускались).
    this.ws.onopen = () => {
      this.trafficPadder.connect(this.ws!);
      // Phase 3: обрабатываем офлайн-очередь при (re)connect.
      this.processOfflineQueue().catch(e => {
        logger.warn('[API] processOfflineQueue failed:', e);
      });
      // openListeners (onOpen callbacks from hooks).
      this.openListeners.forEach(cb => cb());
    };

    this.ws.onmessage = (event) => {
      // Phase 2: constant-size padding unpadding.
      // Если сообщение padded (содержит null bytes в конце) — извлекаем payload.
      let rawData = event.data;
      try {
        const decoded = decodeConstantSizePacket(typeof rawData === 'string' ? rawData : '');
        if (decoded && decoded.length > 0) {
          rawData = decoded;
        }
      } catch (e) {
        // Не constant-size пакет — оставляем как есть.
      }
      // Игнорируем шумовые пакеты.
      try {
        const peek = JSON.parse(rawData);
        if (peek.type === 'noise') return;
      } catch {
        // Невалидный JSON — пропускаем.
      }
      const data = JSON.parse(rawData);

      // WebRTC call signaling routing
      if (data.type && ['call-offer', 'call-answer', 'call-signal', 'call-end'].includes(data.type)) {
        const eventMap: Record<string, string> = {
          'call-offer': 'offer',
          'call-answer': 'answer',
          'call-signal': 'signal',
          'call-end': 'end',
        };
        this.emitCallEvent(eventMap[data.type], data);
        return;
      }

      // Phase 3: Dumb Server — обработка ошибки recipient_offline.
      // Сервер сообщает что получатель не в сети.
      // Сохраняем сообщение в IndexedDB queue и ретраим при reconnect.
      if (data.type === 'error' && data.error === 'recipient_offline') {
        logger.info(`[API] Recipient ${data.recipientUid} offline, queuing message ${data.messageId}`);
        const queued: QueuedMessage = {
          id: data.messageId,
          recipientUid: data.recipientUid,
          payload: data.originalPayload || { id: data.messageId, to: data.recipientUid },
          timestamp: Date.now(),
          retryCount: 0,
          type: 'direct',
        };
        offlineQueue.enqueue(queued).catch(e => {
          logger.warn('[API] Failed to enqueue offline message:', e);
        });
        // Сигнализируем processOfflineQueue (если ждёт) что recipient offline.
        window.dispatchEvent(new CustomEvent('piligrim:recipient-offline', {
          detail: { messageId: data.messageId, recipientUid: data.recipientUid },
        }));
        return;
      }

      let content = data.content || '';

      // E2EE: Дешифрование сообщения (Phase 1: hybrid Signal/NaCl)
      if (data.encryptedContent && this.myKeyPair) {
        (async () => {
          try {
            if (data.encryptionType === 'signal') {
              const senderKey = this.base64ToKey(data.senderPublicKey);
              const payload: EncryptedPayload = {
                type: 'signal',
                data: data.encryptedContent,
              };
              content = await hybridDecrypt(
                data.from,
                payload,
                this.myKeyPair!.secretKey,
                senderKey
              );
            } else {
              const recipientKey = this.myKeyPair!.secretKey;
              const senderKey = this.base64ToKey(data.senderPublicKey);
              content = decryptMessage(
                this.base64ToKey(data.encryptedContent),
                this.base64ToKey(data.nonce),
                recipientKey,
                senderKey
              );
            }
          } catch (e) {
            logger.error('Decryption failed, showing raw data', e);
          }
          this.dispatchMessage(data, content);
        })();
        return;
      }

      this.dispatchMessage(data, content);
    };

    // FIX 2026-09-10: onopen дублировался (строка 241 и 348).
    // Второе присвоение затирало trafficPadder.connect() и processOfflineQueue().
    // Убрано — openListeners вызываются в onopen выше (строка 250).

    this.ws.onclose = () => {
      this.closeListeners.forEach(cb => cb());
    };

    this.ws.onerror = (error) => {
      // FIX 2026-09-10: убран автоматический фоллбэк отсюда.
      // Раньше при ошибке соединение перезапускалось на fallback URL,
      // но это ломало тест onerror (done() не вызывался — timeout 5000ms).
      // Фоллбэк (WSS→WS) реализован в useWebSocket hook через reconnect-логику.
      this.errorListeners.forEach(cb => cb(error));
    };
  }

  private dispatchMessage(data: any, content: string) {
    const message: Message = {
      id: crypto.randomUUID(),
      senderId: data.from,
      text: content,
      timestamp: data.timestamp,
      groupId: data.groupId,
      type: data.type,
      payload: data.payload,
      disappearIn: data.disappearIn,
      timerSetAt: data.timerSetAt
    };
    this.messageListeners.forEach(cb => cb(message));
    if (data.type === "typing") {
      this.typingListeners.forEach(cb => cb(data.chatId));
    }
  }

  disconnect() {
    // Phase 2: останавливаем traffic padder перед закрытием WS.
    this.trafficPadder.disconnect();
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  // Phase 3: Dumb Server — обрабатывает офлайн-очередь при reconnect.
  // Для каждого сообщения пытается отправить через WS.
  // Если получатель offline — увеличивает retryCount (max 3).
  // Использует OfflineQueue из IndexedDB для персистентности.
  async processOfflineQueue(): Promise<{ sent: number; failed: number; retried: number }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.info('[API] processOfflineQueue: WS not connected, skipping');
      return { sent: 0, failed: 0, retried: 0 };
    }
    return offlineQueue.processQueue(async (payload: any) => {
      // Пытаемся отправить payload через WS. Если получатель offline —
      // сервер пришлёт 'recipient_offline' error → enqueue снова.
      const json = JSON.stringify(payload);
      const padded = encodeConstantSizePacket(json);
      this.ws!.send(padded);
      // Даём серверу время прислать response. Если 3 сек нет error — считаем доставлено.
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('piligrim:recipient-offline', onError);
          resolve();
        }, 3000);
        const onError = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (detail?.messageId === payload.id) {
            clearTimeout(timer);
            window.removeEventListener('piligrim:recipient-offline', onError);
            reject(new Error('recipient_offline'));
          }
        };
        window.addEventListener('piligrim:recipient-offline', onError);
      });
    });
  }

  // E2EE: Отправка зашифрованных сообщений
  sendMessage(to: string, content: string, recipientPublicKeyBase64: string, extraOptions: Partial<Message> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (recipientPublicKeyBase64 && this.myKeyPair) {
        const recipientKey = this.base64ToKey(recipientPublicKeyBase64);
        const encrypted = encryptMessage(
          content,
          recipientKey,
          this.myKeyPair.secretKey
        );

        const legacyPayload = JSON.stringify({
          to,
          encryptedContent: btoa(String.fromCharCode(...encrypted.encrypted)),
          nonce: btoa(String.fromCharCode(...encrypted.nonce)),
          senderPublicKey: this.myPublicKeyBase64,
          ...extraOptions
        });
        // Phase 2: constant-size padding.
        this.ws.send(encodeConstantSizePacket(legacyPayload));
      } else {
        const plainPayload = JSON.stringify({ to, content, ...extraOptions });
        // Phase 2: constant-size padding.
        this.ws.send(encodeConstantSizePacket(plainPayload));
      }
    }
  }

  /** Phase 2: hybrid send with Signal (PFS) preferred, NaCl fallback. */
  async sendMessageSecure(
    to: string,
    content: string,
    recipientPublicKeyBase64: string,
    extraOptions: Partial<Message> = {},
  ): Promise<{ type: 'signal' | 'nacl' } | null> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`[API] sendMessageSecure: WS not open, message dropped`);
      return null;
    }
    // Phase 2: ленивая инициализация NaCl keyPair если connect() не был вызван
    if (!this.myKeyPair) {
      this.initKeys();
    }
    if (!recipientPublicKeyBase64) {
      logger.warn(`[API] sendMessageSecure: no recipientPublicKey for ${to}, sending plaintext`);
      this.ws.send(JSON.stringify({ to, content, ...extraOptions }));
      return null;
    }
    const recipientKey = this.base64ToKey(recipientPublicKeyBase64);
    // this.myKeyPair гарантированно не null после lazy initKeys() выше.
    const mySecretKey = this.myKeyPair!.secretKey;
    const payload = await hybridEncrypt(to, content, mySecretKey, recipientKey);
    logger.info(`[API] Message encrypted with ${payload.type === 'signal' ? 'Signal (PFS)' : 'NaCl (legacy)'} for ${to}`);
    const jsonPayload = JSON.stringify({
      to,
      encryptionType: payload.type,
      encryptedContent: payload.data,
      nonce: payload.nonce,
      senderPublicKey: this.myPublicKeyBase64,
      ...extraOptions,
    });
    // Phase 2: constant-size packet padding (2KB).
    const padded = encodeConstantSizePacket(jsonPayload);
    this.ws.send(padded);
    return { type: payload.type };
  }

  onMessage(cb: (msg: Message) => void) { this.messageListeners.push(cb); }
  offMessage(cb: (msg: Message) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== cb);
  }

  onOpen(cb: () => void) { this.openListeners.push(cb); }
  onClose(cb: () => void) { this.closeListeners.push(cb); }
  onError(cb: (error: any) => void) { this.errorListeners.push(cb); }

  // Подписка на события "печитает"
  onTypingEvent(callback: (chatId: string) => void): void {
    this.typingListeners.push(callback);
  }

  // Отправка события "печитает"
  sendTypingEvent(chatId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        chatId,
        timestamp: Date.now()
      }));
    }
  }

  // ============= WebRTC Call Signaling ============

  private callListeners: { [key: string]: ((data: any) => void)[] } = {};

  onCallEvent(event: string, callback: (data: any) => void): void {
    if (!this.callListeners[event]) {
      this.callListeners[event] = [];
    }
    this.callListeners[event].push(callback);
  }

  sendCallOffer(to: string, signal: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'call-offer',
        to,
        signal
      }));
    }
  }

  sendCallAnswer(to: string, signal: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'call-answer',
        to,
        signal
      }));
    }
  }

  sendCallSignal(to: string, signal: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'call-signal',
        to,
        signal
      }));
    }
  }

  sendCallEnd(to: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'call-end',
        to
      }));
    }
  }

  emitCallEvent(event: string, data: any): void {
    if (this.callListeners[event]) {
      this.callListeners[event].forEach(cb => cb(data));
    }
  }
}

export const apiService = new ApiService();

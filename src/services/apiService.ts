import type { Message, Store, Group, NoticeBoard } from '../types';
import { encryptMessage, decryptMessage } from '../crypto/encryption';
import * as nacl from 'tweetnacl';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080';
const API_URL = BASE_URL.replace(/\/+$/, '');
const WS_URL = API_URL.replace(/^http/, 'ws');

class ApiService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: Message) => void)[] = [];
  private openListeners: (() => void)[] = [];
  private closeListeners: (() => void)[] = [];
  private errorListeners: ((error: any) => void)[] = [];
  private typingListeners: ((chatId: string) => void)[] = [];

  // E2EE Keys
  private myKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | null = null;
  private myPublicKeyBase64: string = '';
  private recipientPublicKey: Uint8Array | null = null;

  // Инициализация ключей E2EE
  initKeys(): void {
    this.myKeyPair = nacl.box.keyPair();
    this.myPublicKeyBase64 = btoa(String.fromCharCode(...this.myKeyPair.publicKey));
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
    this.ws = new WebSocket(WS_URL + '?uid=' + uid);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      let content = data.content || '';

      // E2EE: Дешифрование сообщения
      if (data.encryptedContent && this.myKeyPair) {
        try {
          const recipientKey = this.myKeyPair.secretKey;
          const senderKey = this.base64ToKey(data.senderPublicKey);
          content = decryptMessage(
            this.base64ToKey(data.encryptedContent),
            this.base64ToKey(data.nonce),
            recipientKey,
            senderKey
          );
        } catch (e) {
          console.error('Decryption failed, showing raw data');
        }
      }

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

      // Обработка события "печитает"
      if (data.type === 'typing') {
        this.typingListeners.forEach(cb => cb(data.chatId));
      }
    };

    this.ws.onopen = () => {
      this.openListeners.forEach(cb => cb());
    };

    this.ws.onclose = () => {
      this.closeListeners.forEach(cb => cb());
    };

    this.ws.onerror = (error) => {
      this.errorListeners.forEach(cb => cb(error));
    };
  }

  disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
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

        this.ws.send(JSON.stringify({
          to,
          encryptedContent: btoa(String.fromCharCode(...encrypted.encrypted)),
          nonce: btoa(String.fromCharCode(...encrypted.nonce)),
          senderPublicKey: this.myPublicKeyBase64,
          ...extraOptions
        }));
      } else {
        this.ws.send(JSON.stringify({ to, content, ...extraOptions }));
      }
    }
  }

  onMessage(cb: (msg: Message) => void) { this.messageListeners.push(cb); }
  offMessage(cb: (msg: Message) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== cb);
  }

  onOpen(cb: () => void) { this.openListeners.push(cb); }
  onClose(cb: () => void) { this.closeListeners.push(cb); }
  onError(cb: (error: any) => void) { this.errorListeners.push(cb); }

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

  // Подписка на события "печитает"
  onTypingEvent(callback: (chatId: string) => void): void {
    this.typingListeners.push(callback);
  }
}

export const apiService = new ApiService();

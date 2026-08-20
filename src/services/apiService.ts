import type { Message, Store, Group, NoticeBoard } from '../types';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080';
const API_URL = BASE_URL.replace(/\/+$/, '');
const WS_URL = API_URL.replace(/^http/, 'ws');

class ApiService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: Message) => void)[] = [];
  private openListeners: (() => void)[] = [];
  private closeListeners: (() => void)[] = [];
  private errorListeners: ((error: any) => void)[] = [];

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

  connect(uid: string) {
    if (this.ws) this.disconnect();
    this.ws = new WebSocket(WS_URL + '?uid=' + uid);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const message: Message = {
        id: crypto.randomUUID(),
        senderId: data.from,
        text: data.content,
        timestamp: data.timestamp,
        groupId: data.groupId,
        type: data.type,
        payload: data.payload,
        disappearIn: data.disappearIn,
        timerSetAt: data.timerSetAt
      };
      this.messageListeners.forEach(cb => cb(message));
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

  sendMessage(to: string, content: string, extraOptions: Partial<Message> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ to, content, ...extraOptions }));
    }
  }

  onMessage(cb: (msg: Message) => void) { this.messageListeners.push(cb); }
  offMessage(cb: (msg: Message) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== cb);
  }

  onOpen(cb: () => void) { this.openListeners.push(cb); }
  onClose(cb: () => void) { this.closeListeners.push(cb); }
  onError(cb: (error: any) => void) { this.errorListeners.push(cb); }
}

export const apiService = new ApiService();

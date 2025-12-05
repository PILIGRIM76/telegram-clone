
import type { Message, Store, Group, NoticeBoard, Announcement } from '../types';

// ==========================================
// НАСТРОЙКИ ПОДКЛЮЧЕНИЯ
// ==========================================
// Введите сюда IP компьютера, где запущен сервер (найдите через ipconfig)
// Например: '192.168.1.15' или '192.168.0.105'
// Если сервер на том же ПК, оставьте 'localhost'
const SERVER_HOST = '192.168.1.XX'; 
const SERVER_PORT = '8080';
// ==========================================

const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
const API_URL = `${BASE_URL}/api`;
const WS_URL = `ws://${SERVER_HOST}:${SERVER_PORT}`;

class ApiService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: Message) => void)[] = [];

  // --- HTTP Methods ---

  async register(uid: string, publicKey: string): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, publicKey }),
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Server error: ${response.status}`);
        }
    } catch (e: any) {
        console.error('Connection failed:', e);
        throw new Error(`Cannot connect to server at ${SERVER_HOST}. Check IP and Firewall.`);
    }
  }

  async findUserByUid(uid: string): Promise<{ uid: string; publicKey: string; store?: Store; boards?: NoticeBoard[] }> {
    const response = await fetch(`${API_URL}/key/${uid}`);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  }

  // --- Stores ---
  async createOrUpdateStore(uid: string, store: Store): Promise<{ inviteToken?: string }> {
      const response = await fetch(`${API_URL}/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, store })
      });
      return response.json();
  }

  async findStoreByInvite(token: string): Promise<any> {
      const response = await fetch(`${API_URL}/store/invite/${token}`);
      if (!response.ok) throw new Error('Invalid invitation');
      return response.json();
  }

  // --- Groups ---
  async createGroup(data: {name: string, ownerId: string, type: 'public'|'private'}): Promise<Group> {
      const response = await fetch(`${API_URL}/groups/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
      const res = await response.json();
      return { 
          id: res.id, 
          name: data.name, 
          ownerId: data.ownerId, 
          type: data.type, 
          members: [data.ownerId],
          inviteToken: res.token 
      };
  }

  async joinGroup(uid: string, token: string): Promise<Group> {
      const response = await fetch(`${API_URL}/groups/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, token })
      });
      if (!response.ok) throw new Error('Failed to join');
      return (await response.json()).group;
  }

  // --- Boards ---
  async createBoard(data: any): Promise<{board: NoticeBoard}> {
      const response = await fetch(`${API_URL}/boards/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
      if (response.status === 402) throw new Error('Payment not confirmed');
      return response.json();
  }

  async updateBoard(boardId: string, data: any): Promise<void> {
    const response = await fetch(`${API_URL}/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error updating board');
  }

  async addAnnouncement(uid: string, boardId: string, announcement: any, txid?: string): Promise<void> {
       const response = await fetch(`${API_URL}/boards/${boardId}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, announcement, txid })
       });
       if (!response.ok) throw new Error('Error adding announcement');
  }

  async deleteAnnouncement(boardId: string, announcementId: string): Promise<void> {
      const response = await fetch(`${API_URL}/boards/${boardId}/announcements/${announcementId}`, {
          method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error deleting announcement');
  }

  async editAnnouncement(boardId: string, announcement: any): Promise<void> {
      const response = await fetch(`${API_URL}/boards/${boardId}/announcements/${announcement.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement })
      });
      if (!response.ok) throw new Error('Error editing announcement');
  }

  // --- WebSocket ---
  connect(uid: string) {
    if (this.ws) this.disconnect();
    console.log(`Connecting WS to ${WS_URL}...`);
    
    this.ws = new WebSocket(`${WS_URL}?uid=${uid}`);
    
    this.ws.onopen = () => {
        console.log('WS Connected successfully');
    };

    this.ws.onerror = (e) => {
        console.error('WS Connection Error:', e);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const message: Message = {
        id: crypto.randomUUID(),
        senderId: data.senderId || data.from || 'system',
        text: data.text || data.content || '',
        timestamp: data.timestamp || new Date().toISOString(),
        groupId: data.groupId,
        type: data.type || 'user',
        payload: data.payload,
        disappearIn: data.disappearIn,
        timerSetAt: data.timerSetAt,
        replyTo: data.replyTo,
        media: data.media,
        mediaType: data.mediaType
      };
      this.messageListeners.forEach(cb => cb(message));
    };
  }

  disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  sendMessage(to: string, content: string, extraOptions: Partial<Message> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ 
          to: to, 
          content: content, 
          groupId: extraOptions.groupId,
          type: extraOptions.type,
          disappearIn: extraOptions.disappearIn,
          timerSetAt: extraOptions.timerSetAt,
          replyTo: extraOptions.replyTo,
          payload: extraOptions.payload,
          media: extraOptions.media,
          mediaType: extraOptions.mediaType
      }));
    } else {
        console.warn('Cannot send message: WebSocket not open');
    }
  }

  onMessage(cb: (msg: Message) => void) { this.messageListeners.push(cb); }
  offMessage(cb: (msg: Message) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== cb);
  }
}

export const apiService = new ApiService();

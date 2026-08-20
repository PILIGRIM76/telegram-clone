import type { Message, Store, Group, NoticeBoard, Announcement } from '../types';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080';
const API_URL = BASE_URL.replace(/\/+$/, '');
const WS_URL = API_URL.replace(/^http/, 'ws');

class ApiService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: Message) => void)[] = [];

  async register(uid: string, publicKey: string): Promise<void> {
    const response = await fetch(API_URL + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, publicKey })
    });
    if (!response.ok) throw new Error('Registration error');
  }

  async findUserByUid(uid: string): Promise<{ uid: string; publicKey: string; store?: Store; boards?: NoticeBoard[] }> {
    const response = await fetch(API_URL + '/key/' + uid);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  }

  async createOrUpdateStore(uid: string, store: Store): Promise<{ inviteToken?: string }> {
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

  async createGroup(data: { name: string, ownerId: string, type: 'public'|'private' }): Promise<Group> {
    const response = await fetch(API_URL + '/groups/create', {
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
    const response = await fetch(API_URL + '/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token })
    });
    if (!response.ok) throw new Error('Failed to join');
    return (await response.json()).group;
  }

  async createBoard(data: any): Promise<{board: NoticeBoard}> {
    const response = await fetch(API_URL + '/boards/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.status === 402) throw new Error('Payment not confirmed');
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

  async addAnnouncement(uid: string, boardId: string, announcement: any, txid?: string): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId + '/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, announcement, txid })
    });
    if (!response.ok) throw new Error('Error adding announcement');
  }

  async deleteAnnouncement(boardId: string, announcementId: string): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId + '/announcements/' + announcementId, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error deleting announcement');
  }

  async editAnnouncement(boardId: string, announcement: any): Promise<void> {
    const response = await fetch(API_URL + '/boards/' + boardId + '/announcements/' + announcement.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement })
    });
    if (!response.ok) throw new Error('Error editing announcement');
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
}

export const apiService = new ApiService();

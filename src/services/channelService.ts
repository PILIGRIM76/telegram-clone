// Клиентский сервис для Telegram-like фич: каналы, подарки.
// Использует REST API основного сервера (F:\AntiPiry\server.js).
// Базовый URL берётся из Vite env (с fallback на RT9 IP).
const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://192.168.100.4:4000';

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

export interface ChannelPost {
  id: string;
  channelId: string;
  authorId: string;
  text: string;
  attachments?: { id: string; dataUrl: string; name: string }[];
  timestamp: string;
  views: number;
}

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  type: 'free' | 'premium';
  price?: number;
  currency?: string;
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json() as Promise<T>;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${url} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export const channelService = {
  listChannels: () => get<{ channels: PublicChannel[] }>(`${API_BASE}/channels`).then(d => d.channels),
  getChannel: (id: string) => get<PublicChannel>(`${API_BASE}/channels/${id}`),
  getPosts: (id: string) => get<{ posts: ChannelPost[] }>(`${API_BASE}/channels/${id}/posts`).then(d => d.posts),
  createChannel: (title: string, ownerId: string, description?: string) =>
    postJSON<{ id: string; inviteToken: string }>(`${API_BASE}/channels/create`, { title, ownerId, description }),
  subscribe: (channelId: string, uid: string, inviteToken?: string) =>
    postJSON(`${API_BASE}/channels/subscribe`, { uid, channelId, inviteToken }),
  post: (channelId: string, authorId: string, text: string) =>
    postJSON<{ ok: boolean; post: ChannelPost }>(`${API_BASE}/channels/${channelId}/post`, { authorId, text }),
  giftCatalog: () => get<{ gifts: GiftItem[] }>(`${API_BASE}/gifts/catalog`).then(d => d.gifts),
  sendGift: (giftId: string, fromUid: string, toUid: string, message?: string) =>
    postJSON(`${API_BASE}/gifts/send`, { giftId, fromUid, toUid, message }),
};


export type MessageStatus = 'sent' | 'delivered' | 'read';
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
}

export interface Contact {
  id: string; // Local ID
  uid: string;
  name: string;
  verified: boolean;
  keyFingerprint?: string;
  mutedUntil?: number | 'forever';
  archived?: boolean;
}

export interface Group {
    id: string; // Server ID
    name: string;
    members: string[]; // UIDs
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

export interface Reaction {
    emoji: string;
    fromUid: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status?: MessageStatus;
  groupId?: string;
  type?: 'user' | 'system' | 'read' | 'edit' | 'reaction' | 'gift';
  
  // Context
  replyTo?: {
      id: string;
      text: string;
      senderId: string;
  };

  // Features
  isEdited?: boolean;
  isForwarded?: boolean;
  reactions?: Reaction[];

  // Media
  media?: string; // Base64
  mediaType?: 'image' | 'video' | 'audio';

  // Disappearing
  disappearIn?: number; // Seconds
  timerSetAt?: number; // Timestamp

  // Payload (orders, gifts)
  payload?: any;
}

export interface Chat {
  contactId: string;
  messages: Message[];
  disappearTimer?: number;
}

// --- E-Commerce & Boards ---

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    image?: string; // Base64
}

export interface Order {
    id: string;
    product: Product;
    buyerUid: string;
    status: OrderStatus;
    createdAt: number;
    txid?: string;
}

export interface Store {
    name: string;
    description: string;
    type: 'public' | 'private';
    products: Product[];
    sellerWallet?: string;
    paymentAddress?: string;
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
    
    // Monetization
    expiresAt?: number;
    pricePerAd?: number;
    ownerWallet?: string;
    contractAddress?: string;
}

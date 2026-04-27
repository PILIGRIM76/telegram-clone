import { create } from 'zustand';

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface Message {
  _id: string;
  chatId: string;
  sender: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

interface Chat {
  _id: string;
  name: string;
  lastMessage?: Message;
}

interface AppState {
  user: User | null;
  chats: Chat[];
  messages: Record<string, Message[]>;
  isAuthenticated: boolean;
  
  setUser: (user: User | null) => void;
  setChats: (chats: Chat[]) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  chats: [],
  messages: {},
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setChats: (chats) => set({ chats }),
  
  setMessages: (chatId, messages) => set((state) => ({
    messages: { ...state.messages, [chatId]: messages }
  })),
  
  addMessage: (chatId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [chatId]: [...(state.messages[chatId] || []), message]
    }
  })),
  
  logout: () => set({ user: null, chats: [], messages: {}, isAuthenticated: false }),
}));
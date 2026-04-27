import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  
  socket = io(url, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Подключено к Socket.IO');
  });

  socket.on('disconnect', () => {
    console.log('Отключено от Socket.IO');
  });

  socket.on('error', (error) => {
    console.error('Socket ошибка:', error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// События
export const joinChat = (chatId: string) => {
  socket?.emit('chat:join', chatId);
};

export const leaveChat = (chatId: string) => {
  socket?.emit('chat:leave', chatId);
};

export const sendMessage = (data: { chatId: string; content: string; type?: string }) => {
  socket?.emit('message:send', data);
};

export const startTyping = (chatId: string) => {
  socket?.emit('typing:start', chatId);
};

export const stopTyping = (chatId: string) => {
  socket?.emit('typing:stop', chatId);
};

export const markRead = (chatId: string) => {
  socket?.emit('message:read', chatId);
};
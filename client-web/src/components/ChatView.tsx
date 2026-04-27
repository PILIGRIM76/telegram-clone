'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { getSocket, sendMessage, startTyping, stopTyping, markRead } from '@/lib/socket';
import { Send, Paperclip, Smile, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Message {
  _id: string;
  content: string;
  type: string;
  senderId: { _id: string; displayName: string };
  createdAt: string;
  readBy: string[];
}

interface Props {
  chatId: string;
}

export default function ChatView({ chatId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Загрузка сообщений
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/api/messages/${chatId}`);
        setMessages(data.messages);
        markRead(chatId);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      }
    };

    fetchMessages();
  }, [chatId]);

  // Socket слушатели
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Новые сообщения
    socket.on('message:new', (message: Message) => {
      if (message.chatId === chatId) {
        setMessages((prev) => [...prev, message]);
        markRead(chatId);
      }
    });

    // Печатает
    socket.on('typing:start', ({ username }) => {
      setTyping(true);
    });

    socket.on('typing:stop', () => {
      setTyping(false);
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [chatId]);

  // Прокрутка вниз
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      sendMessage({ chatId, content: input, type: 'text' });
      setInput('');
      stopTyping(chatId);
    } catch (error) {
      console.error('Ошибка отправки:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    startTyping(chatId);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Чат</h2>
          {typing && <span className="text-sm text-gray-500">печатает...</span>}
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Video className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg._id} className="flex flex-col">
            <div className="bg-gray-800 rounded-lg p-3 max-w-md">
              <p>{msg.content}</p>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              {format(new Date(msg.createdAt), 'HH:mm', { locale: ru })}
            </span>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      {/* Ввод */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
          <input
            type="text"
            placeholder="Сообщение"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onChange={handleTyping}
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2"
          />
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Smile className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2 bg-primary rounded-lg disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
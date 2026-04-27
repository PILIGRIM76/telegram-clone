'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Search, Plus } from 'lucide-react';

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  participants: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  lastMessage?: { content: string };
  updatedAt: string;
}

interface Props {
  onSelectChat: (chatId: string) => void;
}

export default function ChatList({ onSelectChat }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data } = await api.get('/api/chats');
        setChats(data.chats);
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const filteredChats = chats.filter((chat) =>
    chat.participants.some((p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="w-80 bg-dark border-r border-gray-800 flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-darker border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <button className="p-2 bg-primary rounded-lg">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-500 text-center">Загрузка...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">Нет чатов</div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat._id}
              onClick={() => onSelectChat(chat._id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-800 border-b border-gray-800"
            >
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                {chat.type === 'group' ? (
                  <span className="text-lg">👥</span>
                ) : (
                  <span className="text-lg">
                    {chat.participants[0]?.displayName?.[0] || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium truncate">
                  {chat.type === 'group'
                    ? 'Группа'
                    : chat.participants.map((p) => p.displayName).join(', ')}
                </div>
                {chat.lastMessage && (
                  <div className="text-sm text-gray-500 truncate">
                    {chat.lastMessage.content}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
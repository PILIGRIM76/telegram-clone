'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import ChatList from '@/components/ChatList';
import ChatView from '@/components/ChatView';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatList onSelectChat={setSelectedChat} />
      {selectedChat ? (
        <ChatView chatId={selectedChat} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Выберите чат для начала общения
        </div>
      )}
    </div>
  );
}
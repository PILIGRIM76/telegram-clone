import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { generateIdentity } from './services/cryptoService';
import type { Identity, Contact, Message, Chat, Group } from './types';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [activeTab, setActiveTab] = useState('chats');
  const [contacts] = useState<Contact[]>([
    { id: '1', uid: 'user1', name: 'Alice Johnson', verified: true },
    { id: '2', uid: 'user2', name: 'Bob Smith', verified: false },
    { id: '3', uid: 'user3', name: 'Charlie Brown', verified: true }
  ]);
  const [groups] = useState<Group[]>([
    { id: 'g1', name: 'Family Group', members: ['user1', 'user2'], ownerId: 'user1', type: 'public' },
    { id: 'g2', name: 'Work Team', members: ['user2', 'user3'], ownerId: 'user2', type: 'private' }
  ]);
  const [chats, setChats] = useState<Record<string, Chat>>({
    '1': { contactId: '1', messages: [
      { id: '1', senderId: 'user1', text: 'Привет! Как дела?', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ]},
    '2': { contactId: '2', messages: [
      { id: '2', senderId: 'user2', text: 'Всё отлично, спасибо!', timestamp: new Date(Date.now() - 1800000).toISOString() }
    ]},
    'g1': { contactId: 'g1', messages: [
      { id: '3', senderId: 'user1', text: 'Всем привет в группе!', timestamp: new Date().toISOString() }
    ]}
  });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram-like features
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const handleQuickLogin = () => {
    const newIdentity = generateIdentity();
    newIdentity.username = 'Developer';
    setIdentity(newIdentity);
    setIsLoggedIn(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && selectedChatId) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const fileType = file.type.split('/')[0] as 'image' | 'video' | 'audio';
          
          const newMsg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            senderId: identity!.uid,
            text: fileType === 'image' ? '📷 Фото' : fileType === 'video' ? '🎥 Видео' : '🎵 Аудио',
            timestamp: new Date().toISOString(),
            status: 'sent',
            media: base64,
            mediaType: fileType
          };
          
          setChats(prev => ({
            ...prev,
            [selectedChatId]: {
              ...prev[selectedChatId],
              messages: [...prev[selectedChatId].messages, newMsg]
            }
          }));
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = () => {
    if (selectedChatId && newMessage.trim()) {
      const newMsg: Message = {
        id: Date.now().toString(),
        senderId: identity!.uid,
        text: newMessage,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      setChats(prev => ({
        ...prev,
        [selectedChatId]: {
          ...prev[selectedChatId],
          messages: [...prev[selectedChatId].messages, newMsg]
        }
      }));
      
      setNewMessage('');
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = selectedChatId ? chats[selectedChatId] : null;
  const selectedContact = selectedChatId ? contacts.find(c => c.id === selectedChatId) : null;
  const selectedGroup = selectedChatId ? groups.find(g => g.id === selectedChatId) : null;

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center p-8 bg-slate-800 rounded-lg max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-4"> AntiPiry </h1>
          <p className="text-slate-300 mb-8">Добро пожаловать! Нажмите кнопку для входа.</p>
          <button
            onClick={handleQuickLogin}
            className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-semibold"
          >
            🔧 Быстрый вход (dev)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
      />

      {/* Header with user info */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center font-bold">
            {identity?.username?.charAt(0) || 'D'}
          </div>
          <div>
            <div className="font-semibold">{identity?.username || 'Developer'}</div>
            <div className="text-xs text-slate-400">Online</div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-full hover:bg-slate-700"
          >
            ⚙️
          </button>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-slate-700"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Настройки</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Уведомления</span>
                <button 
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-12 h-6 rounded-full relative ${notificationsEnabled ? 'bg-cyan-600' : 'bg-slate-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span>Тема</span>
                <span>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
              </div>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex justify-center bg-slate-800 p-2 border-b border-slate-700">
        <motion.button
          className={`px-4 py-2 rounded-t-lg ${activeTab === "chats" ? "bg-cyan-500 text-white" : "hover:bg-slate-700"}`}
          onClick={() => setActiveTab("chats")}
          whileTap={{ scale: 0.98 }}
        >
          💬 Чаты
        </motion.button>
        <motion.button
          className={`px-4 py-2 rounded-t-lg ${activeTab === "calls" ? "bg-cyan-500 text-white" : "hover:bg-slate-700"}`}
          onClick={() => setActiveTab("calls")}
          whileTap={{ scale: 0.98 }}
        >
          📞 Звонки
        </motion.button>
        <motion.button
          className={`px-4 py-2 rounded-t-lg ${activeTab === "settings" ? "bg-cyan-500 text-white" : "hover:bg-slate-700"}`}
          onClick={() => setActiveTab("settings")}
          whileTap={{ scale: 0.98 }}
        >
          ⚙️ Настройки
        </motion.button>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar - Chats List */}
        {activeTab === "chats" && (
          <div className="md:w-1/3 bg-slate-800 p-4 border-r border-slate-700">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 p-2 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            
            {/* Archived chats button */}
            <button 
              onClick={() => setIsArchivedOpen(!isArchivedOpen)}
              className="w-full p-3 bg-slate-700 rounded-lg mb-2 flex items-center space-x-3 hover:bg-slate-600"
            >
              <span>📦</span>
              <span>Архивные чаты</span>
            </button>

            <div className="space-y-2">
              {/* Groups */}
              {groups.map((group) => {
                const chat = chats[group.id];
                const lastMessage = chat?.messages[chat.messages.length - 1];
                return (
                  <motion.div
                    key={group.id}
                    onClick={() => setSelectedChatId(group.id)}
                    className={`p-3 rounded-lg cursor-pointer flex items-center space-x-3 ${
                      selectedChatId === group.id ? "bg-cyan-900/50" : "hover:bg-slate-700"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {group.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{group.name}</div>
                      <div className="text-slate-400 text-sm truncate">
                        {lastMessage ? lastMessage.text.substring(0, 30) : 'Группа создана'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Contacts */}
              {filteredContacts.map((contact) => {
                const chat = chats[contact.id];
                const lastMessage = chat?.messages[chat.messages.length - 1];
                const unreadCount = chat?.messages.filter(m => 
                  m.senderId !== identity!.uid && new Date(m.timestamp) > new Date(Date.now() - 86400000)
                ).length || 0;
                
                return (
                  <motion.div
                    key={contact.id}
                    onClick={() => setSelectedChatId(contact.id)}
                    className={`p-3 rounded-lg cursor-pointer flex items-center space-x-3 ${
                      selectedChatId === contact.id ? "bg-cyan-900/50" : "hover:bg-slate-700"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center font-bold relative">
                      {contact.name.charAt(0)}
                      {contact.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <div className="font-bold truncate">{contact.name}</div>
                        {unreadCount > 0 && (
                          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm truncate">
                        {lastMessage ? lastMessage.text.substring(0, 30) : 'Нет сообщений'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 bg-slate-800">
          {/* Chat Window */}
          {activeTab === "chats" && selectedChatId && selectedChat && (selectedContact || selectedGroup) && (
            <div className="h-full relative">
              {/* Chat Header */}
              <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold">
                    {(selectedContact?.name || selectedGroup?.name)?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{selectedContact?.name || selectedGroup?.name}</div>
                    <div className="text-xs text-slate-400">
                      {selectedGroup ? `${selectedGroup.members.length} участников` : 'Online'}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 rounded-full hover:bg-slate-700">📞</button>
                  <button className="p-2 rounded-full hover:bg-slate-700">📹</button>
                  <button className="p-2 rounded-full hover:bg-slate-700">ℹ️</button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="p-4 pb-20 overflow-y-auto h-[calc(100vh-180px)]">
                {selectedChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-4 ${msg.senderId === identity!.uid ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-xs ${
                        msg.senderId === identity!.uid 
                          ? "bg-cyan-500 text-white rounded-br-none" 
                          : "bg-slate-700 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {msg.senderId !== identity!.uid && selectedGroup && (
                        <div className="text-xs opacity-70 mb-1">
                          {contacts.find(c => c.uid === msg.senderId)?.name || 'Unknown'}
                        </div>
                      )}
                      
                      {/* Media content */}
                      {msg.media && msg.mediaType && (
                        <div className="mb-2">
                          {msg.mediaType === 'image' ? (
                            <img 
                              src={msg.media} 
                              alt="Uploaded" 
                              className="rounded-lg max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90"
                              onClick={() => window.open(msg.media, '_blank')}
                            />
                          ) : msg.mediaType === 'video' ? (
                            <video 
                              src={msg.media} 
                              controls 
                              className="rounded-lg max-w-full max-h-64"
                            />
                          ) : (
                            <audio 
                              src={msg.media} 
                              controls 
                              className="w-full"
                            />
                          )}
                        </div>
                      )}
                      
                      <div>{msg.text}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.senderId === identity!.uid && msg.status && ` ${msg.status === 'sent' ? '✓' : '✓✓'}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-800 border-t border-slate-700">
                {/* Attachments panel */}
                {isAttachmentsOpen && (
                  <div className="mb-2 p-2 bg-slate-700 rounded-lg flex space-x-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-slate-600 rounded hover:bg-slate-500 flex flex-col items-center"
                    >
                      <span className="text-2xl">📷</span>
                      <span className="text-xs">Фото</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-slate-600 rounded hover:bg-slate-500 flex flex-col items-center"
                    >
                      <span className="text-2xl">🎥</span>
                      <span className="text-xs">Видео</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-slate-600 rounded hover:bg-slate-500 flex flex-col items-center"
                    >
                      <span className="text-2xl">🎵</span>
                      <span className="text-xs">Аудио</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-slate-600 rounded hover:bg-slate-500 flex flex-col items-center"
                    >
                      <span className="text-2xl">📎</span>
                      <span className="text-xs">Файл</span>
                    </button>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)}
                    className="p-2 rounded-full hover:bg-slate-700"
                  >
                    📎
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-700">😊</button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Введите сообщение..."
                    className="flex-1 bg-slate-700 p-2 rounded-full text-slate-200 focus:outline-none px-4"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-cyan-600 rounded-full text-white hover:bg-cyan-700"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calls Tab */}
          {activeTab === "calls" && (
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Звонки</h2>
              <div className="space-y-2">
                <div className="p-3 bg-slate-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">📞</div>
                    <div>
                      <div className="font-semibold">Исходящий звонок</div>
                      <div className="text-sm text-slate-400">Alice Johnson · Сегодня, 14:30</div>
                    </div>
                  </div>
                  <button className="p-2 bg-green-600 rounded-full">➤</button>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">📞</div>
                    <div>
                      <div className="font-semibold">Пропущенный звонок</div>
                      <div className="text-sm text-slate-400">Bob Smith · Вчера, 16:45</div>
                    </div>
                  </div>
                  <button className="p-2 bg-red-600 rounded-full">✆</button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Настройки</h2>
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Аккаунт</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Имя пользователя:</span>
                      <span className="text-cyan-400">{identity?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ID:</span>
                      <span className="font-mono text-xs">{identity?.uid.substring(0, 15)}...</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Приватность и безопасность</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Двухфакторная аутентификация</span>
                      <span className="text-green-400">Включена</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Блокировка по биометрии</span>
                      <span className="text-slate-400">Отключена</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Уведомления</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Звуковые уведомления</span>
                      <button 
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`w-12 h-6 rounded-full relative ${notificationsEnabled ? 'bg-cyan-600' : 'bg-slate-600'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Тема</h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-cyan-600' : 'bg-slate-600'} hover:bg-cyan-700`}
                    >
                      Тёмная
                    </button>
                    <button 
                      onClick={() => setTheme('light')}
                      className={`px-4 py-2 rounded ${theme === 'light' ? 'bg-cyan-600' : 'bg-slate-600'} hover:bg-cyan-700`}
                    >
                      Светлая
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Default welcome screen */}
          {activeTab === "chats" && !selectedChatId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-bold mb-2">Добро пожаловать в AntiPiry</h2>
                <p className="text-slate-400">Выберите чат, чтобы начать общение</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import type { Identity, Contact, Chat, Message, Group, Store, NoticeBoard } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTranslation } from './contexts/LanguageContext'; // Hook for translation
import LanguageSelector from './components/LanguageSelector'; // Selector component
import CreateIdentity from './components/CreateIdentity';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import { generateIdentity, encrypt } from './services/cryptoService';
import { WelcomePlaceholder } from './components/WelcomePlaceholder';
import { apiService } from './services/apiService';
import ProfileDrawer from './components/ProfileDrawer';
import StoreManagementModal from './components/StoreManagementModal';
import BoardManagementModal from './components/BoardManagementModal';
import CreateBoardModal from './components/CreateBoardModal';
import VerificationModal from './components/VerificationModal';
import QRScanningModal from './components/QRScanningModal';

const App: React.FC = () => {
  const { language, t } = useTranslation(); // Use context
  const [identity, setIdentity] = useLocalStorage<Identity | null>('cipherlink-identity', null);
  const [contacts, setContacts] = useLocalStorage<Contact[]>('cipherlink-contacts', []);
  const [groups, setGroups] = useLocalStorage<Group[]>('cipherlink-groups', []);
  const [chats, setChats] = useLocalStorage<Record<string, Chat>>('cipherlink-chats', {});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [globalMuteUntil, setGlobalMuteUntil] = useLocalStorage<number | 'forever' | null>('cipherlink-global-mute', null);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('cipherlink-theme', 'dark');

  // Новые состояния для управления досками и магазинами
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [activeBoardForManagement, setActiveBoardForManagement] = useState<NoticeBoard|null>(null);
  const [storeOrders, setStoreOrders] = useState<any[]>([]);

  // Верификация
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Применение темы
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Инициализация системного чата
  useEffect(() => {
    if (!contacts.find(c => c.uid === 'system')) {
        const systemContact: Contact = { id: 'system_chat', uid: 'system', name: 'System', verified: true };
        setContacts(prev => [systemContact, ...prev]);
        setChats(prev => ({ ...prev, 'system_chat': { contactId: 'system_chat', messages: [] } }));
    }
  }, []);

  useEffect(() => {
    if (identity) {
      apiService.connect(identity.uid);

      const handleMessage = (message: Message) => {
        let chatId = '';
        
        if (message.groupId) {
            const group = groups.find(g => g.id === message.groupId);
            if (!group) return;
            chatId = group.id;
        } else if (message.senderId === 'system' || message.type === 'system') {
            chatId = 'system_chat';
        } else {
            // Если это заказ
            if (message.payload && message.payload.type === 'order') {
                setStoreOrders(prev => [...prev, { ...message.payload, id: message.payload.orderId, buyerUid: message.senderId }]);
            }
            // Обработка статусов "прочитано"
            if (message.type === 'read') {
                 // Здесь можно найти чат и обновить статусы исходящих сообщений
                 return; 
            }
            
            const contact = contacts.find(c => c.uid === message.senderId);
            if (!contact) {
                return; 
            }
            chatId = contact.id;
        }

        setChats(prevChats => {
            const currentChat = prevChats[chatId] || { contactId: chatId, messages: [] };
            if (currentChat.messages.some(m => m.id === message.id)) return prevChats;
            const updatedChat = { ...currentChat, messages: [...currentChat.messages, message] };
            return { ...prevChats, [chatId]: updatedChat };
        });
      };

      apiService.onMessage(handleMessage);
      return () => {
        apiService.disconnect();
        apiService.offMessage(handleMessage);
      };
    }
  }, [identity, contacts, groups]);


  const handleCreateIdentity = async () => {
    const newIdentity = generateIdentity();
    try {
      await apiService.register(newIdentity.uid, newIdentity.publicKey);
      setIdentity(newIdentity);
    } catch (error) {
      console.error("Registration error:", error);
    }
  };
  
  const handleAddContact = (name: string, uid: string) => {
    if (uid.startsWith('http')) {
        const token = uid.split('/').pop();
        if (token) {
            apiService.joinGroup(identity!.uid, token).then(group => {
                setGroups(prev => [...prev, group]);
                setChats(prev => ({ ...prev, [group.id]: { contactId: group.id, messages: [] } }));
            }).catch(e => alert(e.message));
        }
        return;
    }

    if (!contacts.some(c => c.uid === uid)) {
      const newContact: Contact = { id: crypto.randomUUID(), name, uid, verified: false };
      setContacts([...contacts, newContact]);
      setChats(prevChats => ({ ...prevChats, [newContact.id]: { contactId: newContact.id, messages: [] } }));
    }
  };

  const handleCreateGroup = async (name: string, type: 'public' | 'private') => {
      if (!identity) return;
      try {
          const group = await apiService.createGroup({ name, ownerId: identity.uid, type });
          setGroups([...groups, group]);
          setChats(prev => ({ ...prev, [group.id]: { contactId: group.id, messages: [] } }));
      } catch (e) {
          console.error(e);
      }
  };

  const handleSendMessage = (text: string, media?: string, mediaType?: 'image' | 'video', payload?: any) => {
    if (!selectedChatId || !identity) return;
    const contact = contacts.find(c => c.id === selectedChatId);
    const group = groups.find(g => g.id === selectedChatId);
    
    let recipientUid = '';
    let groupId: string | undefined = undefined;

    if (group) {
        groupId = group.id;
        recipientUid = 'server'; 
    } else if (contact) {
        recipientUid = contact.uid;
    } else return;

    const chat = chats[selectedChatId];
    const disappearIn = chat?.disappearTimer;
    const timerSetAt = disappearIn ? Date.now() : undefined;

    const message: Message = {
      id: crypto.randomUUID(),
      senderId: identity.uid,
      text: encrypt(text, identity.privateKey),
      timestamp: new Date().toISOString(),
      status: 'sent',
      groupId,
      disappearIn,
      timerSetAt,
      media: media,
      mediaType: mediaType,
      payload: payload
    };
    
    apiService.sendMessage(recipientUid, message.text, { 
      groupId, 
      disappearIn, 
      timerSetAt,
      media: media,
      mediaType: mediaType,
      payload: payload
    });

    setChats(prevChats => {
      const updatedChat = { ...prevChats[selectedChatId] };
      updatedChat.messages = [...updatedChat.messages, message];
      return { ...prevChats, [selectedChatId]: updatedChat };
    });
  };

  const handleArchiveChat = (contactId: string, archive: boolean) => {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, archived: archive } : c));
  };

  const handleSetTimer = (seconds: number | undefined) => {
    if (selectedChatId) {
        setChats(prev => ({
            ...prev,
            [selectedChatId]: { ...prev[selectedChatId], disappearTimer: seconds }
        }));
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (selectedChatId) {
        setChats(prev => ({
            ...prev,
            [selectedChatId]: {
                ...prev[selectedChatId],
                messages: prev[selectedChatId].messages.filter(m => m.id !== id)
            }
        }));
    }
  };

  const handleVerify = () => {
      setIsScanModalOpen(true);
  };
  
  const onScanSuccess = (scannedUid: string) => {
      if (!selectedChatId) return;
      const contact = contacts.find(c => c.id === selectedChatId);
      if (contact && contact.uid === scannedUid) {
          setContacts(prev => prev.map(c => 
            c.id === selectedChatId ? { ...c, verified: true } : c
          ));
          alert('Contact verified successfully!');
      } else {
          alert('Error: UID mismatch.');
      }
      setIsScanModalOpen(false);
  }

  // Магазины и доски
  const saveStore = (s: Store) => {
      if(identity) setIdentity({...identity, store: s});
  }
  
  const updateOrderStatus = (id: string, newStatus: any) => {
      const order = storeOrders.find(o => o.id === id);
      if (order) {
          setStoreOrders(prev => prev.map(o => o.id === id ? {...o, status: newStatus} : o));
          
          // Отправка уведомления покупателю
          apiService.sendMessage(order.buyerUid, `Your order "${order.product.name}" status changed to: ${newStatus}`, {
              type: 'system'
          });
      }
  }

  const createBoard = async (data: any) => {
      if(!identity) return;
      try {
        const {board} = await apiService.createBoard({...data, uid: identity.uid});
        const newBoards = [...(identity.boards || []), board];
        setIdentity({...identity, boards: newBoards});
      } catch(e: any) { alert(e.message); }
  }
  
  const handleResetApp = () => {
    if (confirm('Are you sure? This will delete your identity, all contacts and chats. This action is irreversible.')) {
        localStorage.clear();
        window.location.reload();
    }
  };
  
  const handleUpdateProfile = (name: string, avatar: string) => {
      if(identity) setIdentity({...identity, username: name, avatar});
  }

  const selectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    return chats[selectedChatId] || { contactId: selectedChatId, messages: [] };
  }, [selectedChatId, chats]);

  const selectedObject = useMemo(() => {
      return contacts.find(c => c.id === selectedChatId) || groups.find(g => g.id === selectedChatId) || null;
  }, [selectedChatId, contacts, groups]);

  // 1. Language Selection Check
  if (!language) {
      return <LanguageSelector />;
  }

  // 2. Identity Check
  if (!identity) {
    return <CreateIdentity onCreateIdentity={handleCreateIdentity} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-900 font-sans overflow-hidden dark:bg-slate-900 dark:text-slate-200">
      {isProfileOpen && (
        <ProfileDrawer
          identity={identity}
          onClose={() => setIsProfileOpen(false)}
          globalMuteUntil={globalMuteUntil}
          setGlobalMuteUntil={setGlobalMuteUntil}
          onReset={handleResetApp}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
        />
      )}
      
      <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
        <ContactList
            identity={identity}
            contacts={contacts}
            groups={groups}
            onAddContact={handleAddContact}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            chats={chats}
            onOpenProfile={() => setIsProfileOpen(true)}
            onMuteChat={(id, duration) => { /* Логика заглушена */ }}
            onArchiveChat={handleArchiveChat}
            onCreateGroup={handleCreateGroup}
            onOpenStore={() => setIsStoreModalOpen(true)}
            onOpenBoards={() => setIsBoardsModalOpen(true)}
        />
      </div>

      <main className={`flex-1 flex flex-col bg-slate-800 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        {selectedObject && selectedChat ? (
            <ChatWindow
                key={selectedObject.id}
                partner={selectedObject}
                chat={selectedChat}
                onSendMessage={handleSendMessage}
                currentUserIdentity={identity}
                onBack={() => setSelectedChatId(null)}
                onSetTimer={handleSetTimer}
                onDeleteMessage={handleDeleteMessage}
                onVerify={handleVerify}
            />
        ) : (
            <WelcomePlaceholder />
        )}
      </main>

      {/* Модальные окна бизнеса */}
      {isStoreModalOpen && (
          <StoreManagementModal 
             identity={identity}
             onClose={() => setIsStoreModalOpen(false)}
             onSave={saveStore}
             orders={storeOrders}
             updateOrderStatus={updateOrderStatus}
          />
      )}
      
      {isBoardsModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md">
                  <h2 className="text-xl font-bold text-white mb-4">My Boards</h2>
                  <div className="space-y-2 mb-4">
                      {identity.boards?.map(b => (
                          <div key={b.id} className="bg-slate-700 p-3 rounded flex justify-between items-center">
                              <span className="text-white">{b.name}</span>
                              <button onClick={() => setActiveBoardForManagement(b)} className="bg-cyan-600 px-2 py-1 rounded text-xs text-white">Manage</button>
                          </div>
                      ))}
                      {(!identity.boards || identity.boards.length === 0) && <p className="text-slate-500">No boards</p>}
                  </div>
                  <div className="flex justify-between">
                       <button onClick={() => setIsCreateBoardModalOpen(true)} className="bg-green-600 px-4 py-2 rounded text-white">Create New</button>
                       <button onClick={() => setIsBoardsModalOpen(false)} className="bg-slate-600 px-4 py-2 rounded text-white">Close</button>
                  </div>
              </div>
          </div>
      )}

      {isCreateBoardModalOpen && (
          <CreateBoardModal 
             onClose={() => setIsCreateBoardModalOpen(false)}
             onCreate={createBoard}
          />
      )}

      {activeBoardForManagement && (
          <BoardManagementModal
             board={activeBoardForManagement}
             onClose={() => setActiveBoardForManagement(null)}
             onUpdate={() => {
                 alert('Updated');
                 setActiveBoardForManagement(null);
             }}
          />
      )}

      {/* Модальные окна верификации */}
      {isVerificationModalOpen && (
          <VerificationModal 
            uid={identity.uid} 
            fingerprint={identity.keyFingerprint || 'UNKNOWN'} 
            onClose={() => setIsVerificationModalOpen(false)} 
          />
      )}
      {isScanModalOpen && (
          <QRScanningModal onClose={() => setIsScanModalOpen(false)} onSuccess={onScanSuccess} />
      )}

    </div>
  );
};

export default App;

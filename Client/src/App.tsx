
import React, { useState, useMemo, useEffect } from 'react';
import type { Identity, Contact, Chat, Message, Group, Store, NoticeBoard, Order } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTranslation } from './contexts/LanguageContext';
import LanguageSelector from './components/LanguageSelector';
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
  const { language } = useTranslation();
  const [identity, setIdentity] = useLocalStorage<Identity | null>('cipherlink-identity', null);
  const [contacts, setContacts] = useLocalStorage<Contact[]>('cipherlink-contacts', []);
  const [groups, setGroups] = useLocalStorage<Group[]>('cipherlink-groups', []);
  const [chats, setChats] = useLocalStorage<Record<string, Chat>>('cipherlink-chats', {});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [globalMuteUntil, setGlobalMuteUntil] = useLocalStorage<number | 'forever' | null>('cipherlink-global-mute', null);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('cipherlink-theme', 'dark');

  // Store & Board State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [activeBoardForManagement, setActiveBoardForManagement] = useState<NoticeBoard|null>(null);
  const [storeOrders, setStoreOrders] = useState<Order[]>([]);

  // Verification State
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

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
        
        // --- Special Message Handling (Edit/Reaction) ---
        if (message.type === 'edit' && message.payload) {
            setChats(prev => {
                const next = { ...prev };
                for (const cid in next) {
                    const idx = next[cid].messages.findIndex(m => m.id === message.payload.messageId);
                    if (idx !== -1) {
                        const msgs = [...next[cid].messages];
                        msgs[idx] = { ...msgs[idx], text: message.text, isEdited: true };
                        next[cid] = { ...next[cid], messages: msgs };
                        break;
                    }
                }
                return next;
            });
            return;
        }

        if (message.type === 'reaction' && message.payload) {
            setChats(prev => {
                const next = { ...prev };
                for (const cid in next) {
                    const idx = next[cid].messages.findIndex(m => m.id === message.payload.messageId);
                    if (idx !== -1) {
                        const msgs = [...next[cid].messages];
                        const currentReactions = msgs[idx].reactions || [];
                        msgs[idx] = { 
                            ...msgs[idx], 
                            reactions: [...currentReactions, { emoji: message.payload.emoji, fromUid: message.senderId }] 
                        };
                        next[cid] = { ...next[cid], messages: msgs };
                        break;
                    }
                }
                return next;
            });
            return;
        }

        if (message.groupId) {
            const group = groups.find(g => g.id === message.groupId);
            if (!group) return;
            chatId = group.id;
        } else if (message.senderId === 'system' || message.type === 'system') {
            chatId = 'system_chat';
        } else {
            if (message.payload && message.payload.type === 'order') {
                const orderData: Order = { 
                    ...message.payload, 
                    id: message.payload.orderId, 
                    buyerUid: message.senderId 
                };
                setStoreOrders(prev => [...prev, orderData]);
            }
            if (message.type === 'read') return;
            
            const contact = contacts.find(c => c.uid === message.senderId);
            if (!contact) return; 
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


  const handleAuth = async (importedIdentity?: Identity) => {
    let currentIdentity = importedIdentity;
    
    // If not importing, generate new
    if (!currentIdentity) {
        currentIdentity = generateIdentity();
    }

    try {
      // For both new and imported, we try to register/sync with server
      // If user exists, server handles it (idempotency check or update)
      // Note: In real app, we would verify signature for login
      await apiService.register(currentIdentity.uid, currentIdentity.publicKey);
      
      // If importing, try to fetch existing data from server to sync
      if (importedIdentity) {
          try {
              const remoteData = await apiService.findUserByUid(importedIdentity.uid);
              if (remoteData.store) {
                  currentIdentity.store = remoteData.store;
              }
              if (remoteData.boards) {
                  currentIdentity.boards = remoteData.boards;
              }
          } catch (e) {
              console.warn('Could not sync remote data', e);
          }
      }

      setIdentity(currentIdentity);
    } catch (error) {
      console.error("Auth error:", error);
      alert('Authentication failed. Ensure server is running.');
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

  const _sendMessageInternal = (chatId: string, text: string, options: any = {}) => {
      if (!identity) return;
      const contact = contacts.find(c => c.id === chatId);
      const group = groups.find(g => g.id === chatId);
      
      let recipientUid = '';
      let groupId: string | undefined = undefined;

      if (group) {
          groupId = group.id;
          recipientUid = 'server'; 
      } else if (contact) {
          recipientUid = contact.uid;
      } else return;

      const chat = chats[chatId];
      const disappearIn = chat?.disappearTimer;
      const timerSetAt = disappearIn ? Date.now() : undefined;

      const replyTo = options.payload?.replyTo || options.replyTo;
      const cleanPayload = options.payload ? { ...options.payload } : undefined;
      if (cleanPayload) delete cleanPayload.replyTo;

      const message: Message = {
        id: crypto.randomUUID(),
        senderId: identity.uid,
        text: encrypt(text, identity.privateKey),
        timestamp: new Date().toISOString(),
        status: 'sent',
        groupId,
        disappearIn,
        timerSetAt,
        media: options.media,
        mediaType: options.mediaType,
        replyTo: replyTo,
        payload: cleanPayload,
        isForwarded: options.isForwarded,
        type: options.type
      };
      
      apiService.sendMessage(recipientUid, message.text, { 
        groupId, 
        disappearIn, 
        timerSetAt,
        media: options.media,
        mediaType: options.mediaType,
        replyTo: replyTo,
        payload: cleanPayload,
        type: options.type
      });

      if (options.type !== 'edit' && options.type !== 'reaction') {
          setChats(prevChats => {
            const updatedChat = { ...prevChats[chatId] };
            updatedChat.messages = [...updatedChat.messages, message];
            return { ...prevChats, [chatId]: updatedChat };
          });
      }
  };

  const handleSendMessage = (text: string, media?: string, mediaType?: 'image' | 'video' | 'audio', payload?: any) => {
      if (selectedChatId) {
          _sendMessageInternal(selectedChatId, text, { media, mediaType, payload, replyTo: payload?.replyTo });
      }
  };

  const handleEditMessage = (messageId: string, newText: string) => {
      if (!selectedChatId || !identity) return;
      
      setChats(prev => {
          const chat = prev[selectedChatId];
          const msgs = chat.messages.map(m => 
              m.id === messageId ? { ...m, text: encrypt(newText, identity.privateKey), isEdited: true } : m
          );
          return { ...prev, [selectedChatId]: { ...chat, messages: msgs } };
      });

      _sendMessageInternal(selectedChatId, newText, { 
          type: 'edit', 
          payload: { messageId } 
      });
  };

  const handleReactMessage = (messageId: string, emoji: string) => {
      if (!selectedChatId || !identity) return;

      setChats(prev => {
          const chat = prev[selectedChatId];
          const msgs = chat.messages.map(m => {
              if (m.id === messageId) {
                  const reactions = m.reactions || [];
                  return { ...m, reactions: [...reactions, { emoji, fromUid: identity.uid }] };
              }
              return m;
          });
          return { ...prev, [selectedChatId]: { ...chat, messages: msgs } };
      });

      _sendMessageInternal(selectedChatId, '', {
          type: 'reaction',
          payload: { messageId, emoji }
      });
  };

  const handleForwardMessage = (messageId: string, targetId: string, originalText: string, originalMedia?: string, originalMediaType?: any) => {
      if (!identity) return;
      _sendMessageInternal(targetId, originalText, {
          isForwarded: true,
          media: originalMedia,
          mediaType: originalMediaType
      });
  };

  const handleArchiveChat = (contactId: string, archive: boolean) => {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, archived: archive } : c));
  };

  const handleMuteChat = (contactId: string, until: number | 'forever' | null) => {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, mutedUntil: until } : c));
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

  const saveStore = (s: Store) => {
      if(identity) setIdentity({...identity, store: s});
  }
  
  const updateOrderStatus = (id: string, newStatus: any) => {
      const order = storeOrders.find(o => o.id === id);
      if (order) {
          setStoreOrders(prev => prev.map(o => o.id === id ? {...o, status: newStatus} : o));
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

  if (!language) return <LanguageSelector />;
  if (!identity) return <CreateIdentity onAuth={handleAuth} />;

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
            onMuteChat={handleMuteChat}
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
                onEditMessage={handleEditMessage}
                onReactMessage={handleReactMessage}
                onForwardMessage={handleForwardMessage}
                allContacts={contacts}
                allGroups={groups}
            />
        ) : (
            <WelcomePlaceholder />
        )}
      </main>

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

import React, { useState, useMemo, useEffect } from 'react';
import type { Identity, Contact, Chat, Message, Group, Store, NoticeBoard, AuthResult } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTranslation } from './contexts/LanguageContext';
import { useWebSocketStatus } from './hooks/useWebSocketStatus';
import LanguageSelector from './components/LanguageSelector';
import CreateIdentity from './components/CreateIdentity';
import { Register } from './components/Register';
import { Login } from './components/Login';
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
import FileUpload from './components/FileUpload/FileUpload';
import { checkForUpdates } from './services/tauriUpdater';

type AuthView = 'login' | 'register' | 'main';

const App: React.FC = () => {
  const { language, t } = useTranslation();
  const [identity, setIdentity] = useLocalStorage<Identity | null>('cipherlink-identity', null);
  const [contacts, setContacts] = useLocalStorage<Contact[]>('cipherlink-contacts', []);
  const [groups, setGroups] = useLocalStorage<Group[]>('cipherlink-groups', []);
  const [chats, setChats] = useLocalStorage<Record<string, Chat>>('cipherlink-chats', {});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [globalMuteUntil, setGlobalMuteUntil] = useLocalStorage<number | 'forever' | null>('cipherlink-global-mute', null);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('cipherlink-theme', 'dark');
  const [authView, setAuthView] = useState<AuthView>('login');

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates().then(hasUpdated => {
      if (hasUpdated) {
        alert('Приложение обновлено! Перезапустите его.');
      }
    });
  }, []);

  // Authentication handlers
  const handleLogin = (result: AuthResult) => {
    if (result.success) {
      setAuthView('main');
      localStorage.setItem('cipherlink-authenticated', 'true');
    }
  };

  const handleRegister = (result: AuthResult) => {
    if (result.success) {
      setAuthView('main');
      localStorage.setItem('cipherlink-authenticated', 'true');
    }
  };

  // === Phase 7.5.1: Identity Guard ===
  // Если пользователь залогинился, но Identity ещё нет — генерируем автоматически.
  // TODO: Phase 7.6 - Show seed phrase modal before saving identity
  useEffect(() => {
    if (authView === 'main' && !identity) {
      generateIdentity().then(newIdentity => {
        setIdentity(newIdentity);
      }).catch(err => {
        console.error('Failed to generate identity:', err);
      });
    }
  }, [authView, identity, setIdentity]);

  // === Phase 7.5.3: Safe wrappers (для useLocalStorage T | null) ===
  // Должны быть определены ДО handlers, т.к. handlers их используют.
  const safeContacts = contacts ?? [];
  const safeGroups = groups ?? [];
  const safeChats = chats ?? {};

  // === Phase 7.5.3: Handlers ===
  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    // TODO: Phase 7.6 - Загрузка истории сообщений с сервера через apiService.getMessages(chatId)
  };

  const handleAddContact = async (name: string, uid: string) => {
    // Проверка на дубликат
    if (safeContacts.some(c => c.uid === uid)) {
      alert('Контакт с таким UID уже существует');
      return;
    }

    const newContact: Contact = {
      id: crypto.randomUUID(),
      uid,
      name,
      verified: false,
      archived: false
    };

    // Используем safeContacts, т.к. useLocalStorage не поддерживает (prev) => ...
    setContacts([...safeContacts, newContact]);

    // Создаём пустой чат для этого контакта
    setChats({
      ...safeChats,
      [newContact.id]: { contactId: newContact.id, messages: [] }
    });

    // TODO: Phase 7.6 - Сохранить контакт на сервере через apiService
  };

  const handleCreateGroup = (name: string, type: 'public' | 'private') => {
    if (!identity) return;

    const groupId = `group_${crypto.randomUUID()}`;
    const newGroup: Group = {
      id: groupId,
      name,
      members: [identity.uid],
      ownerId: identity.uid,
      type
    };

    setGroups([...safeGroups, newGroup]);
    setChats({
      ...safeChats,
      [groupId]: { contactId: groupId, messages: [] }
    });
    setSelectedChatId(groupId);

    // TODO: Phase 7.6 - Создать группу на сервере
  };

  const handleMuteChat = (_id: string, _until: number | 'forever' | null) => {
    // TODO: Phase 7.5.3 (next batch) - реализовать mute
  };

  const handleArchiveChat = (_id: string, _archive: boolean) => {
    // TODO: Phase 7.5.3 (next batch) - реализовать archive
  };

  const handleOpenStore = () => {
    // TODO: Phase 7.6 - открыть StoreManagementModal
  };

  const handleOpenBoards = () => {
    // TODO: Phase 7.6 - открыть BoardManagementModal
  };

  const handleSendMessage = async (text: string, media?: string, mediaType?: 'image' | 'video', payload?: any) => {
    if (!selectedChatId || !identity) return;

    // TODO: Phase 7.6 - Integrate real E2EE encryption here using cryptoService.encrypt
    // const encryptedText = await encrypt(text, recipientPublicKey);
    const storedText = text; // Временная заглушка для проверки UI

    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: identity.uid,
      text: storedText,
      timestamp: new Date().toISOString(),
      media,
      mediaType,
      payload,
      status: 'sent'
    };

    const baseChats = safeChats;
    const updatedChats: Record<string, Chat> = { ...baseChats };
    if (!updatedChats[selectedChatId]) {
      updatedChats[selectedChatId] = { contactId: selectedChatId, messages: [] };
    }
    updatedChats[selectedChatId].messages = [...(updatedChats[selectedChatId].messages || []), newMessage];
    setChats(updatedChats);

    // TODO: Phase 7.6 - Отправить сообщение через WebSocket здесь (apiService.sendMessage)
  };

  const handleSetTimer = (seconds: number | undefined) => {
    if (!selectedChatId) return;

    const updatedChats: Record<string, Chat> = { ...safeChats };
    if (updatedChats[selectedChatId]) {
      updatedChats[selectedChatId] = {
        ...updatedChats[selectedChatId],
        disappearTimer: seconds
      };
      setChats(updatedChats);
    }

    // TODO: Phase 7.6 - Реализовать автоудаление сообщений через setTimeout
    // при установке таймера нужно запустить таймер, который будет удалять старые сообщения
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedChatId) return;

    const updatedChats: Record<string, Chat> = { ...safeChats };
    if (updatedChats[selectedChatId]) {
      updatedChats[selectedChatId] = {
        ...updatedChats[selectedChatId],
        messages: (updatedChats[selectedChatId].messages || []).filter(
          m => m.id !== messageId
        )
      };
      setChats(updatedChats);
    }

    // TODO: Phase 7.6 - Отправить команду удаления через WebSocket
    // apiService.deleteMessage(selectedChatId, messageId)
  };

  const handleVerify = () => {
    // TODO: Phase 7.6 - открыть VerificationModal
  };

  const handleUpdateProfile = (name: string, avatar: string) => {
    if (!identity) return;
    const updatedIdentity = { ...identity, username: name, avatar };
    setIdentity(updatedIdentity);
    // TODO: Phase 7.6 - Обновить профиль на сервере
  };

  const handleReset = () => {
    setIdentity(null);
    setContacts([]);
    setGroups([]);
    setChats({});
    setSelectedChatId(null);
    setIsProfileOpen(false);
    setAuthView('login');
    localStorage.removeItem('cipherlink-identity'); // Очистка
    // TODO: Phase 7.6 - Очистить сессию на сервере
  };

  // === Phase 7.5.3: Вычисляемые значения (partner и chat) ===
  const partner = useMemo(() => {
    if (!selectedChatId) return null;
    const c = safeContacts.find(ct => ct.id === selectedChatId);
    if (c) return c;
    return safeGroups.find(g => g.id === selectedChatId) || null;
  }, [selectedChatId, safeContacts, safeGroups]);

  const currentChat = selectedChatId ? safeChats[selectedChatId] : null;

  const handleLogout = () => {
    localStorage.removeItem('cipherlink-authenticated');
    setIdentity(null);
    setSelectedChatId(null);
    setAuthView('login');
  };

  // WebSocket status
  const { status, statusText } = useWebSocketStatus();

  // Auth screens - show login/register views before main app
  if (authView === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Login onLogin={handleLogin} onShowRegister={() => setAuthView('register')} />
      </div>
    );
  }

  if (authView === 'register') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Register onRegister={handleRegister} onShowLogin={() => setAuthView('login')} />
      </div>
    );
  }

  // === Phase 7.5.4: Guard — если нет Identity, показываем загрузку ===
  if (authView === 'main' && !identity) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Генерация Identity...</p>
        </div>
      </div>
    );
  }

  // Main app content (authenticated view) — Phase 7.5.2: Layout
  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Левая колонка — список контактов */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-700 flex flex-col flex-shrink-0">
        <ContactList
          identity={identity!}
          contacts={safeContacts}
          groups={safeGroups}
          chats={safeChats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onAddContact={handleAddContact}
          onCreateGroup={handleCreateGroup}
          onOpenProfile={() => setIsProfileOpen(true)}
          onMuteChat={handleMuteChat}
          onArchiveChat={handleArchiveChat}
          onOpenStore={handleOpenStore}
          onOpenBoards={handleOpenBoards}
        />
      </div>

      {/* Правая колонка — чат или welcome */}
      <div className="flex-1 flex flex-col bg-slate-800 min-w-0">
        {selectedChatId && partner && identity ? (
          <ChatWindow
            partner={partner}
            chat={currentChat || { contactId: selectedChatId, messages: [] }}
            currentUserIdentity={identity}
            onSendMessage={handleSendMessage}
            onBack={() => setSelectedChatId(null)}
            onSetTimer={handleSetTimer}
            onDeleteMessage={handleDeleteMessage}
            onVerify={handleVerify}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center max-w-md px-4">
              <h2 className="text-3xl font-bold text-slate-300 mb-2">CipherLink</h2>
              <p className="text-slate-400">Выберите чат, чтобы начать общение</p>
              <p className="text-xs text-slate-600 mt-4 font-mono">{statusText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile drawer (глобальный) */}
      {isProfileOpen && identity && (
        <ProfileDrawer
          identity={identity}
          onClose={() => setIsProfileOpen(false)}
          globalMuteUntil={globalMuteUntil}
          setGlobalMuteUntil={setGlobalMuteUntil}
          onReset={handleLogout}
          onUpdateProfile={handleUpdateProfile}
          theme={theme ?? 'dark'}
          setTheme={setTheme}
        />
      )}
    </div>
  );
};

export default App;

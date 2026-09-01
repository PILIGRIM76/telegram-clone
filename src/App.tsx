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
import { generateIdentity, encrypt, decrypt } from './services/cryptoService';
import { SplashScreen } from '@capacitor/splash-screen';
// Phase 9.5 cache buster - 2026-08-30T21:00:00Z - force esbuild to re-process all files
import { WelcomePlaceholder } from './components/WelcomePlaceholder';
import { apiService } from './services/apiService';
import ProfileDrawer from './components/ProfileDrawer';
import SeedPhraseModal from './components/SeedPhraseModal';
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
  const [identity, setIdentity] = useLocalStorage<Identity | null>('piligrim-identity', null);
  const [contacts, setContacts] = useLocalStorage<Contact[]>('piligrim-contacts', []);
  const [groups, setGroups] = useLocalStorage<Group[]>('piligrim-groups', []);
  const [chats, setChats] = useLocalStorage<Record<string, Chat>>('piligrim-chats', {});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [globalMuteUntil, setGlobalMuteUntil] = useLocalStorage<number | 'forever' | null>('piligrim-global-mute', null);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('piligrim-theme', 'dark');
  const [authView, setAuthView] = useState<AuthView>('login');

  // Phase 7.6.5: временное хранилище для сгенерированной Identity до подтверждения seed-фразы
  const [pendingIdentity, setPendingIdentity] = useState<Identity | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);

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
    console.log('[PILIGRIM] handleLogin called with:', result);
    if (result.success) {
      console.log('[PILIGRIM] handleLogin SUCCESS, switching to main view');
      setAuthView('main');
      localStorage.setItem('piligrim-authenticated', 'true');
    } else {
      console.warn('[PILIGRIM] handleLogin FAILED:', result.error || result.message);
    }
  };

  const handleRegister = (result: AuthResult) => {
    console.log('[PILIGRIM] handleRegister called with:', result);
    if (result.success) {
      console.log('[PILIGRIM] handleRegister SUCCESS, switching to main view');
      setAuthView('main');
      localStorage.setItem('piligrim-authenticated', 'true');
    } else {
      console.warn('[PILIGRIM] handleRegister FAILED:', result.error || result.message);
    }
  };

  // Phase 9.5 fix: Локальная генерация Identity, БЕЗ зависимости от бэкенда.
  // Бэкенд-вызов делается fire-and-forget для опциональной синхронизации.
  const handleCreateIdentity = async () => {
    console.log('🚀 [PILIGRIM] handleCreateIdentity START v9.5-2026-09-01');
    try {
      const newIdentity = await generateIdentity();
      console.log('[PILIGRIM] Identity сгенерирована успешно, uid =', newIdentity?.uid);
      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      SplashScreen.hide().catch(e => console.warn('SplashScreen.hide failed:', e));

      // Оповещаем бэкенд ОПЦИОНАЛЬНО (fire-and-forget) — не блокируем UI
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (apiService as any).register?.(newIdentity.uid, newIdentity.publicKey);
        console.log('[PILIGRIM] Бэкенд оповещён:', result);
      } catch (apiError: any) {
        console.warn('[PILIGRIM] Бэкенд недоступен, работаем offline:', apiError?.message || apiError);
      }
    } catch (error) {
      console.error('❌ [PILIGRIM] Ошибка генерации Identity:', error);
    }
  };

  // === Phase 7.5.3: Safe wrappers (для useLocalStorage T | null) ===
  // Должны быть определены ДО useEffect и handlers, т.к. они их используют.
  const safeContacts = contacts ?? [];
  const safeGroups = groups ?? [];
  const safeChats = chats ?? {};

  // Phase 9.5 fix: Генерация Identity теперь вызывается ЯВНО через handleCreateIdentity.
  // Автоматический useEffect убран, чтобы не зависеть от порядка рендера и не блокировать UI
  // при отсутствии/недоступности бэкенда.

  // Phase 7.6.5: обработчики для SeedPhraseModal
  const handleSeedConfirmed = () => {
    if (pendingIdentity) {
      // Пользователь подтвердил, что сохранил seed-фразу → окончательно сохраняем Identity
      setIdentity(pendingIdentity);
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  const handleSeedSkip = () => {
    // Пользователь пропустил (на свой страх и риск) → всё равно сохраняем Identity
    // (иначе приложение неработоспособно). Можно усилить: блокировать вход.
    if (pendingIdentity) {
      setIdentity(pendingIdentity);
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  // === Phase 7.6.2: WebSocket подписка на входящие сообщения ===
  // Подписываемся только если есть identity и приватный ключ для расшифровки
  useEffect(() => {
    if (!identity || !identity.privateKey) return;

    const handleIncomingMessage = async (msg: Message) => {
      try {
        // 1. Определяем ID чата: для личных сообщений это ID отправителя
        const chatId = msg.senderId || (msg.payload && (msg.payload as any).chatId);
        if (!chatId) {
          console.warn('Incoming message has no senderId/chatId, skipping');
          return;
        }

        // 2. Извлекаем зашифрованный пейлоад (если есть)
        const incomingPayload = msg.payload as any;
        const encryptedPayload: string | undefined = incomingPayload?.encryptedPayload;

        // 3. РЕАЛЬНАЯ РАСШИФРОВКА через cryptoService.decrypt (RSA-OAEP)
        let finalText = msg.text;
        if (encryptedPayload && !encryptedPayload.startsWith('PLAINTEXT_FALLBACK:')) {
          try {
            finalText = await decrypt(encryptedPayload, identity.privateKey);
            console.log('E2EE: Входящее сообщение расшифровано');
          } catch (decryptError) {
            console.error('E2EE Расшифровка входящего сообщения не удалась:', decryptError);
            // Оставляем msg.text как есть (apiService попытался расшифровать через NaCl box или это plaintext)
          }
        }

        // 4. Формируем объект сообщения для локального state
        const newMessage: Message = {
          id: msg.id || crypto.randomUUID(),
          senderId: msg.senderId,
          text: finalText, // Расшифрованный текст для UI
          timestamp: msg.timestamp || new Date().toISOString(),
          media: msg.media,
          mediaType: msg.mediaType,
          payload: msg.payload, // Сохраняем полный payload (с encryptedPayload)
          groupId: msg.groupId,
          type: msg.type,
          status: 'received' // Входящее сообщение всегда 'received'
        };

        // 5. Безопасное обновление стейта через safeChats (без функционального updater)
        const updatedChats: Record<string, Chat> = { ...safeChats };
        if (!updatedChats[chatId]) {
          updatedChats[chatId] = { contactId: chatId, messages: [] };
        }
        updatedChats[chatId].messages = [...(updatedChats[chatId].messages || []), newMessage];
        setChats(updatedChats);

      } catch (error) {
        console.error('Ошибка обработки входящего сообщения:', error);
      }
    };

    // Подписываемся через существующий метод apiService.onMessage
    apiService.onMessage(handleIncomingMessage);

    // Cleanup: отписываемся при размонтировании или смене identity
    return () => {
      apiService.offMessage(handleIncomingMessage);
    };
  }, [identity, safeChats]);

  // === Phase 7.5.3: Handlers ===
  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    // TODO: Phase 7.6 - Загрузка истории сообщений с сервера через apiService.getMessages(chatId)
  };

  const handleAddContact = async (name: string, uid: string, publicKey?: string) => {
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
      publicKey, // Phase 7.6: опционально — JWK-строка публичного ключа получателя
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

    // Phase 7.6.1: Реальное E2EE шифрование через cryptoService.encrypt (RSA-OAEP)
    // Определяем publicKey партнёра. Если это Contact без ключа или Group — fallback на свой ключ.
    const partnerPublicKey = partner && 'publicKey' in partner ? partner.publicKey : undefined;
    const targetPublicKey = partnerPublicKey ?? identity.publicKey;

    let encryptedPayload: string;
    try {
      // Реальный вызов RSA-OAEP шифрования (cryptoService.ts → encrypt)
      encryptedPayload = await encrypt(text, targetPublicKey);
    } catch (error) {
      console.error('E2EE Шифрование не удалось:', error);
      // Fallback: сохраняем как plaintext с пометкой, чтобы не потерять сообщение
      encryptedPayload = `PLAINTEXT_FALLBACK:${text}`;
    }

    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: identity.uid,
      text: text, // Для локального UI (расшифровка на лету будет в 7.6.3)
      timestamp: new Date().toISOString(),
      media,
      mediaType,
      payload: {
        ...payload,
        // Храним реальный зашифрованный пейлоад отдельно для отправки на сервер
        encryptedPayload,
        isEncrypted: encryptedPayload.startsWith('PLAINTEXT_FALLBACK:') ? false : true
      },
      status: 'sent'
    };

    const baseChats = safeChats;
    const updatedChats: Record<string, Chat> = { ...baseChats };
    if (!updatedChats[selectedChatId]) {
      updatedChats[selectedChatId] = { contactId: selectedChatId, messages: [] };
    }
    updatedChats[selectedChatId].messages = [...(updatedChats[selectedChatId].messages || []), newMessage];
    setChats(updatedChats);

    // TODO 7.6.2: apiService.sendMessage(selectedChatId, newMessage)
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
    localStorage.removeItem('piligrim-identity'); // Очистка
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
    localStorage.removeItem('piligrim-authenticated');
    setIdentity(null);
    setSelectedChatId(null);
    // Phase 9.5 fix: при logout сразу показываем CreateIdentity (без перехода на login)
    setAuthView('login');
    setPendingIdentity(null);
    setShowSeedModal(false);
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

  // === Phase 9.5 fix: если нет Identity, показываем экран создания ===
  if (!identity && !pendingIdentity) {
    return (
      <CreateIdentity onCreateIdentity={handleCreateIdentity} />
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
              <h2 className="text-3xl font-bold text-slate-300 mb-2">PILIGRIM</h2>
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

      {/* Phase 7.6.5: Seed phrase modal */}
      {showSeedModal && pendingIdentity?.seedPhrase && (
        <SeedPhraseModal
          seedPhrase={pendingIdentity.seedPhrase}
          username={pendingIdentity.username}
          onConfirm={handleSeedConfirmed}
          onSkip={handleSeedSkip}
        />
      )}
    </div>
  );
};

export default App;



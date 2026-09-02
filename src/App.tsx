// v1.5.2 Stage 1: CreateIdentity + SeedPhraseModal + ContactList (пустой)
// Цель: подключить ContactList со всеми обязательными props (offline-first, без backend)
import React, { useState, useEffect } from 'react';
import CreateIdentity from './components/CreateIdentity';
import SeedPhraseModal from './components/SeedPhraseModal';
import ContactList from './components/ContactList';
import { generateIdentity } from './services/cryptoService';
import { apiService } from './services/apiService';
import type { Contact, Group, Chat, Identity } from './types';

const App: React.FC = () => {
  const [identity, setIdentity] = useState<Identity | null>(() => {
    try {
      const saved = localStorage.getItem('piligrim-identity');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pendingIdentity, setPendingIdentity] = useState<Identity | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);

  // v1.5.2 Stage 1: локальные списки (без useLocalStorage, чтобы не нарушать правила хуков)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Загрузка контактов из localStorage после монтирования (offline-first)
  useEffect(() => {
    console.log('[PILIGRIM] App mounted (v1.5.2 Stage 1 — ContactList integration)');
    try {
      const savedContacts = localStorage.getItem('piligrim-contacts');
      if (savedContacts) setContacts(JSON.parse(savedContacts));
    } catch {}
  }, []);

  const handleCreateIdentity = async () => {
    console.log('🚀 [PILIGRIM] START: handleCreateIdentity вызван');
    try {
      console.log('🔑 [PILIGRIM] Шаг 1: generateIdentity()...');
      const startTime = Date.now();
      const newIdentity = await generateIdentity();
      console.log(`✅ [PILIGRIM] generateIdentity() завершен за ${Date.now() - startTime}ms`);

      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      console.log('🎭 [PILIGRIM] setShowSeedModal(true) выполнен');

      apiService.register(newIdentity.uid, newIdentity.publicKey)
        .then(() => console.log('✅ [PILIGRIM] register success'))
        .catch((err: any) => console.warn('⚠️ [PILIGRIM] register failed (ignored):', err?.message || err));
    } catch (error) {
      console.error('❌ [PILIGRIM] Ошибка в handleCreateIdentity:', error);
    }
  };

  const handleSeedConfirmed = () => {
    console.log('✅ [PILIGRIM] Seed phrase подтверждена, сохраняем Identity');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
        setPendingIdentity(null);
        setShowSeedModal(false);
      } catch (e) {
        console.error('❌ [PILIGRIM] Ошибка сохранения identity:', e);
      }
    }
  };

  const handleSeedSkip = () => {
    console.log('⏭️ [PILIGRIM] Seed phrase пропущена');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
      } catch {}
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  // v1.5.2 Stage 1: stub-обработчики (Этап 2 добавит реальный функционал)
  const handleAddContact = (_name: string, _uid: string) => {
    console.log('[PILIGRIM] handleAddContact stub');
  };
  const handleCreateGroup = (_name: string, _type: 'public' | 'private') => {
    console.log('[PILIGRIM] handleCreateGroup stub');
  };
  const handleMuteChat = (_contactId: string, _duration: number | 'forever' | null) => {
    console.log('[PILIGRIM] handleMuteChat stub');
  };
  const handleArchiveChat = (_contactId: string, _archive: boolean) => {
    console.log('[PILIGRIM] handleArchiveChat stub');
  };
  const handleOpenProfile = () => console.log('[PILIGRIM] handleOpenProfile stub');
  const handleOpenStore = () => console.log('[PILIGRIM] handleOpenStore stub');
  const handleOpenBoards = () => console.log('[PILIGRIM] handleOpenBoards stub');
  const handleSelectChat = (id: string) => {
    console.log('[PILIGRIM] handleSelectChat:', id);
    setSelectedChatId(id);
  };
  const handleLogout = () => {
    localStorage.removeItem('piligrim-identity');
    setIdentity(null);
  };

  // Phase 9.5 fix: сначала показываем SeedPhraseModal, потом identity
  if (showSeedModal && pendingIdentity?.seedPhrase) {
    return (
      <div>
        {identity && (
          <div className="min-h-screen bg-slate-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-4">🎉 Добро пожаловать, {identity.username}!</h1>
            <p className="text-slate-400">Identity создана успешно. Phase 9.5 minimal version.</p>
            <button
              onClick={() => {
                localStorage.removeItem('piligrim-identity');
                setIdentity(null);
              }}
              className="mt-4 px-4 py-2 bg-red-600 rounded"
            >
              Выйти
            </button>
          </div>
        )}
        <SeedPhraseModal
          seedPhrase={pendingIdentity.seedPhrase}
          username={pendingIdentity.username}
          onConfirm={handleSeedConfirmed}
          onSkip={handleSeedSkip}
        />
      </div>
    );
  }

  if (!identity) {
    return <CreateIdentity onCreateIdentity={handleCreateIdentity} />;
  }

  // v1.5.2 Stage 1: двухколоночный layout — ContactList слева, заглушка чата справа
  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Левая колонка: ContactList */}
      <div className="w-80 border-r border-slate-700 flex-shrink-0">
        <ContactList
          identity={identity}
          contacts={contacts}
          groups={groups}
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onAddContact={handleAddContact}
          onCreateGroup={handleCreateGroup}
          onMuteChat={handleMuteChat}
          onArchiveChat={handleArchiveChat}
          onOpenProfile={handleOpenProfile}
          onOpenStore={handleOpenStore}
          onOpenBoards={handleOpenBoards}
        />
      </div>

      {/* Правая колонка: заглушка чата (Этап 2 — ChatWindow) */}
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <p className="text-lg">Выберите контакт для начала общения</p>
        <button
          onClick={handleLogout}
          className="mt-6 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded text-sm"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};

export default App;

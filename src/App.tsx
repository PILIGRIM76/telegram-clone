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

  // v1.5.2 Stage 2: загрузка контактов, групп и чатов из localStorage после монтирования
  useEffect(() => {
    console.log('[PILIGRIM] App mounted (v1.5.2 Stage 2 — AddContact enabled)');
    try {
      const savedContacts = localStorage.getItem('piligrim-contacts');
      if (savedContacts) setContacts(JSON.parse(savedContacts));
    } catch {}
    try {
      const savedGroups = localStorage.getItem('piligrim-groups');
      if (savedGroups) setGroups(JSON.parse(savedGroups));
    } catch {}
    try {
      const savedChats = localStorage.getItem('piligrim-chats');
      if (savedChats) setChats(JSON.parse(savedChats));
    } catch {}
  }, []);

  // v1.5.2 Stage 2: автосохранение contacts в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-contacts', JSON.stringify(contacts));
    } catch (e) {
      console.error('[PILIGRIM] Ошибка сохранения contacts:', e);
    }
  }, [contacts]);

  // v1.5.2 Stage 2: автосохранение groups в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-groups', JSON.stringify(groups));
    } catch (e) {
      console.error('[PILIGRIM] Ошибка сохранения groups:', e);
    }
  }, [groups]);

  // v1.5.2 Stage 2: автосохранение chats в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-chats', JSON.stringify(chats));
    } catch (e) {
      console.error('[PILIGRIM] Ошибка сохранения chats:', e);
    }
  }, [chats]);

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

  // v1.5.2 Stage 2: реальный обработчик добавления контакта (offline-first)
  const handleAddContact = (name: string, uid: string, publicKey?: string) => {
    console.log('➕ [PILIGRIM] handleAddContact:', name, uid, publicKey ? '(with pubKey)' : '(no pubKey)');

    // Защита от дубликатов: если контакт с таким uid уже есть, не добавляем
    if (contacts.some(c => c.uid === uid)) {
      console.warn('⚠️ [PILIGRIM] Контакт с uid', uid, 'уже существует');
      alert(`Контакт "${name}" уже добавлен в ваш список.`);
      return;
    }

    const newContact: Contact = {
      id: uid, // используем uid как локальный id
      uid,
      name,
      verified: false,
      publicKey,
      archived: false,
      // mutedUntil не устанавливаем — чат не замьючен по умолчанию
    };

    setContacts(prev => [...prev, newContact]);

    // Создаём пустой чат для нового контакта
    setChats(prev => ({
      ...prev,
      [uid]: {
        contactId: uid,
        messages: [],
        disappearTimer: undefined,
      },
    }));

    console.log('✅ [PILIGRIM] Контакт добавлен:', newContact);
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
    <div style={{ display: 'flex', height: '100%', width: '100%', background: '#0f172a', color: '#e2e8f0', position: 'relative' }}>
      {/* Левая колонка: ContactList */}
      <div style={{ width: '320px', minWidth: '320px', borderRight: '1px solid #334155' }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        <p style={{ fontSize: '1.125rem' }}>Выберите контакт для начала общения</p>
        <button
          onClick={handleLogout}
          style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', background: 'rgba(220, 38, 38, 0.8)', color: 'white', borderRadius: '0.375rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};

export default App;

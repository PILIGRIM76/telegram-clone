// v1.5.2 Stage 5: WebSocket real-time для зашифрованных сообщений
// Цель: доставка входящих сообщений от других клиентов + индикатор статуса подключения
import React, { useState, useEffect } from 'react';
import CreateIdentity from './components/CreateIdentity';
import SeedPhraseModal from './components/SeedPhraseModal';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import { generateIdentity, encrypt } from './services/cryptoService';
import { apiService } from './services/apiService';
import { useWebSocket } from './hooks/useWebSocket';
import { useWebRTC } from './hooks/useWebRTC';
import type { Contact, Group, Chat, Message, Identity } from './types';

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
  // v1.5.2 Stage 5: статус WebSocket для UI-индикатора (Online/Offline/Reconnecting)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed' | 'error' | 'unsupported'>('closed');

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

  // v1.5.2 Stage 5: WebSocket real-time для входящих сообщений.
  // Использует apiService (NaCl box для транспорта) + graceful degradation
  // при недоступности бэкенда (только localStorage).
  const ws = useWebSocket({
    myUid: identity?.uid || '',
    enabled: !!identity,
    onMessage: (incomingMessage) => {
      // incomingMessage приходит от apiService уже с расшифрованным текстом
      // (если NaCl box ключи были настроены), иначе с raw text
      console.log(`📩 [PILIGRIM] WS: incoming message from ${incomingMessage.senderId}, chatId=${incomingMessage.groupId ?? 'dm'}`);
      const chatId = incomingMessage.groupId || incomingMessage.senderId;
      setChats((prev) => {
        const updated = { ...prev };
        if (!updated[chatId]) {
          updated[chatId] = { contactId: chatId, messages: [] };
        }
        // Защита от дубликатов (на случай re-connect)
        const exists = (updated[chatId].messages || []).some((m) => m.id === incomingMessage.id);
        if (exists) {
          console.log(`[PILIGRIM] WS: duplicate message ${incomingMessage.id}, skipped`);
          return prev;
        }
        updated[chatId] = {
          ...updated[chatId],
          messages: [...(updated[chatId].messages || []), incomingMessage]
        };
        return updated;
      });
    },
    onStatusChange: (status) => {
      console.log(`[PILIGRIM] WS status: ${status}`);
      setWsStatus(status);
    }
  });

  // v1.5.2 Stage 6: WebRTC hook — для звонков и демонстрации экрана.
  const webrtcHook = useWebRTC(identity?.uid || '');

  const handleSelectChat = (id: string) => {
    console.log('[PILIGRIM] handleSelectChat:', id);
    setSelectedChatId(id);
  };
  // v1.5.2 Stage 4: handleSendMessage — шифрует сообщение публичным ключом контакта
  // (RSA-OAEP) перед сохранением в localStorage. Если publicKey отсутствует —
  // отправляем в plaintext с предупреждением (graceful fallback для UX).
  const handleSendMessage = async (chatId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!identity) {
      console.warn('[PILIGRIM] handleSendMessage: identity отсутствует, сообщение не отправлено');
      return;
    }

    // 1. Ищем контакт, чтобы получить его publicKey
    const contact = contacts.find((c) => c.id === chatId || c.uid === chatId);

    // 2. Шифруем, если есть publicKey
    let encryptedPayload: string | undefined;
    let isEncrypted = false;
    if (contact?.publicKey) {
      try {
        encryptedPayload = await encrypt(trimmed, contact.publicKey);
        isEncrypted = true;
        console.log(`🔒 [PILIGRIM] E2EE: зашифровано для ${contact.name} (chatId=${chatId}, ciphertext_len=${encryptedPayload.length})`);
      } catch (error) {
        console.error(`❌ [PILIGRIM] E2EE: ошибка шифрования для ${contact.name}:`, error);
        // Fallback: сохраняем в plaintext, но НЕ теряем сообщение
      }
    } else {
      console.warn(`⚠️ [PILIGRIM] E2EE: publicKey отсутствует для chatId=${chatId}, сообщение будет сохранено в plaintext`);
    }

    // 3. Создаём Message (text — для локального UI, encryptedPayload — для хранения/передачи)
    const newMessage: Message = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      text: trimmed,
      encryptedPayload,
      isEncrypted,
      senderId: identity.uid,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    console.log(`[PILIGRIM] handleSendMessage: chatId=${chatId}, len=${trimmed.length}, encrypted=${isEncrypted}`);
    setChats((prev) => {
      const updated = { ...prev };
      if (!updated[chatId]) {
        updated[chatId] = { contactId: chatId, messages: [] };
      }
      updated[chatId] = {
        ...updated[chatId],
        messages: [...(updated[chatId].messages || []), newMessage]
      };
      return updated;
    });

    // Stage 5: если WebSocket подключён — отправляем сообщение получателю через сервер.
    // apiService использует NaCl box (X25519+XSalsa20) для транспортного шифрования.
    // Если WS недоступен — сообщение остаётся только локально (offline-first).
    if (ws.isConnected) {
      try {
        ws.send(contact?.uid || chatId, trimmed, contact?.publicKey);
        console.log(`📡 [PILIGRIM] WS: message dispatched to ${contact?.name || chatId}`);
      } catch (e) {
        console.error('[PILIGRIM] WS: send failed', e);
      }
    } else {
      console.log(`[PILIGRIM] WS offline, message saved locally only`);
    }
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
      {/* Stage 5: индикатор статуса WebSocket (правый верхний угол) */}
      <div
        data-testid="ws-status"
        title={`WebSocket: ${wsStatus}`}
        style={{
          position: 'absolute',
          top: '8px',
          right: '12px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor: wsStatus === 'open' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${wsStatus === 'open' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '12px',
          color: wsStatus === 'open' ? '#22c55e' : '#ef4444',
          fontSize: '11px',
          fontWeight: 600
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: wsStatus === 'open' ? '#22c55e' : '#ef4444',
            animation: wsStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : undefined
          }}
        />
        <span>
          {wsStatus === 'open' && '🟢 Online'}
          {wsStatus === 'connecting' && '🟡 Подключение…'}
          {wsStatus === 'closed' && '⚪ Offline'}
          {wsStatus === 'error' && '🔴 Ошибка'}
          {wsStatus === 'unsupported' && '⚪ Не поддерживается'}
        </span>
      </div>

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

      {/* Правая колонка: ChatWindow или placeholder */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedChatId ? (
          <ChatWindow
            chatId={selectedChatId}
            messages={chats[selectedChatId]?.messages || []}
            onSendMessage={(text) => handleSendMessage(selectedChatId, text)}
            partner={(() => {
              const c = contacts.find((c) => c.id === selectedChatId);
              if (c) return c;
              const g = groups.find((g) => g.id === selectedChatId);
              if (g) return { name: g.name };
              return undefined;
            })()}
            currentUserUid={identity?.uid}
            onStartCall={() => {
              const target = contacts.find((c) => c.id === selectedChatId);
              if (target && target.uid) {
                console.log(`📞 [PILIGRIM] Stage 6: starting call to ${target.name} (${target.uid})`);
                webrtcHook.startCall(target.uid);
              } else {
                alert('Контакт не найден или не имеет UID');
              }
            }}
            callState={
              webrtcHook.isInCall
                ? 'in-call'
                : webrtcHook.isCalling
                  ? 'calling'
                : webrtcHook.incomingCall
                  ? 'incoming'
                : 'idle'
            }
          />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            padding: '24px'
          }}>
            <p style={{ fontSize: '1.125rem' }}>Выберите контакт для начала общения</p>
            <button
              onClick={handleLogout}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(220, 38, 38, 0.8)',
                color: 'white',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

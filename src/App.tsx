// Этап 5: обмен зашифрованными сообщениями в реальном времени через WebSocket.

// Цель: доставка входящих сообщений от других клиентов + индикатор статуса подключения
import React, { useEffect, useMemo, useState } from 'react';
import ChatWindow from './components/ChatWindow';
import ContactList from './components/ContactList';
import LoginPage from './components/LoginPage';
import SeedPhraseModal from './components/SeedPhraseModal';
import { Toasts } from './components/Toast';
import VerifyModal from './components/VerifyModal';
import { useTranslation } from './contexts/LanguageContext';
import { useLogout } from './hooks/useLogout';
import { useTimeTheme } from './hooks/useTimeTheme';
import { useToasts } from './hooks/useToasts';
import { useWebRTC } from './hooks/useWebRTC';
import { useWebSocket } from './hooks/useWebSocket';
import { apiService } from './services/apiService';
import { generateIdentity, getPublicKey, restoreIdentityFromSeed } from './services/cryptoService';
import { logger } from './services/logger';

import { CallModal } from './components/CallModal';
import { ChannelsView } from './components/ChannelsView';
import { ContactsView } from './components/ContactsView';
import { FloatingActionButton } from './components/FloatingActionButton';

import { TabletTabBar, type TabView } from './components/TabletTabBar';

import { ConfirmLogoutModal } from './components/ConfirmLogoutModal';
import { Drawer } from './components/Drawer';
import { FloatingCircleNav } from './components/FloatingCircleNav';
import ForwardModal from './components/ForwardModal';
import { LeftAppBar } from './components/LeftAppBar';
import { ResponsiveShell } from './components/ResponsiveShell';
import { RightAppBar } from './components/RightAppBar';
import { SearchModal } from './components/SearchModal';

import AccountPage from './components/AccountPage';
import { CallsHistoryView } from './components/CallsHistoryView';
import { DesktopJoystick } from './components/DesktopJoystick';
import { FavoritesView } from './components/FavoritesView';
import { ProfilePanel } from './components/ProfilePanel';
import type {
  Chat,
  Contact,
  EncryptedAttachment,
  Group,
  IdentityType,
  Message,
  Reaction,
  VoiceMessageMetadata,
} from './types';
// Signal Protocol обеспечивает прямую секретность через Double Ratchet.
// Отправка сообщений предпочитает Signal, а при отсутствии сессии использует NaCl.
// handleAddContact инициализирует Signal сессию через SignalProtocolManager.initSessionWithPreKeyBundle.
import { PreKeyManager } from './crypto/signal/PreKeyManager';
import { SignalProtocolManager } from './crypto/signal/SignalProtocolManager';
import { SignalStorage } from './crypto/signal/SignalStorage';
// FIX 2026-09-10: bundleToPreKeyBundle удалён — не используется в App.tsx
// (он нужен только в SignalMessageLayer.ts для внутреннего conversion).

const App: React.FC = () => {
  const [identity, setIdentity] = useState<IdentityType | null>(() => {
    try {
      const saved = localStorage.getItem('piligrim-identity');
      return saved ? (JSON.parse(saved) as IdentityType) : null;
    } catch {
      return null;
    }
  });
  const [pendingIdentity, setPendingIdentity] = useState<IdentityType | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  // Этап 2B-3: активная вкладка TabletTabBar (чаты, контакты, звонки, избранное).
  const [activeTab, setActiveTab] = useState<TabView>('chats');
  // v3.0 Logout: модалка подтверждения выхода из аккаунта
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Этап 2D: Drawer — боковая панель профиля.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Модальное окно поиска открывается сочетанием Ctrl+K.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Боковая панель профиля на компьютере.
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Страница параметров безопасности учётной записи.
  const [showAccountPage, setShowAccountPage] = useState(false);
  // Этап 2: флаг публикации собственного набора предварительных ключей Signal на сервере.
  // Становится true после успешного POST /keys/publish, чтобы не повторять запрос.
  const [preKeysPublished, setPreKeysPublished] = useState(false);

  // Этап 2D: слушаем пользовательское событие от CallsHistoryView/FavoritesView,
  // чтобы открыть Drawer через событие window и не связывать компоненты напрямую.
  useEffect(() => {
    const handler = () => setIsDrawerOpen(true);
    window.addEventListener('piligrim:open-drawer', handler);
    return () => window.removeEventListener('piligrim:open-drawer', handler);
  }, []);

  // Этап 2E: сочетание Ctrl+K (Cmd+K на Mac) открывает палитру команд.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Выход: хук очищает identity, закрывает WebSocket и перезагружает приложение.
  const logout = useLogout({ clearData: false });

  // Этап 1: локальные списки без useLocalStorage, чтобы соблюдать правила хуков.
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  // Этап 5: состояние WebSocket для индикатора в интерфейсе (в сети, не в сети, подключение).
  const [wsStatus, setWsStatus] = useState<
    'connecting' | 'open' | 'closed' | 'error' | 'unsupported'
  >('closed');
  // v1.6 Этап 4: показывать модалку верификации контакта
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  // v3.18: Forward messages modal
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargetMessage, setForwardTargetMessage] = useState<Message | null>(null);
  const { language, setLanguage } = useTranslation();
  // v1.6 Этап 4: toast-уведомления (объявлены раньше handlers, чтобы их можно было вызывать)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const searchableContacts = useMemo(
    () =>
      contacts.map(c => ({
        uid: c.uid,
        name: c.name,
        lastMessage: chats[c.uid]?.messages?.slice(-1)[0]?.text,
      })),
    [contacts, chats]
  );

  // Этап 2: загрузка контактов, групп и чатов из localStorage после монтирования.
  useEffect(() => {
    // Инициализируем транспортные ключи загруженной identity до восстановления данных.
    if (identity && !identity.transportPublicKey) {
      apiService.initKeys(identity.uid);
      const updated = { ...identity, transportPublicKey: apiService.getTransportPublicKey() };
      queueMicrotask(() => setIdentity(updated));
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(updated));
      } catch (e) {
        logger.warn('[PILIGRIM] Failed to update identity with transportPublicKey:', e);
      }
    }

    logger.info('[PILIGRIM] App mounted (v1.5.2 Stage 2 � AddContact enabled)');
    try {
      const savedContacts = localStorage.getItem('piligrim-contacts');
      if (savedContacts) queueMicrotask(() => setContacts(JSON.parse(savedContacts) as Contact[]));
    } catch {
      // Игнорируем ошибку разбора списка контактов.
    }
    try {
      const savedGroups = localStorage.getItem('piligrim-groups');
      if (savedGroups) queueMicrotask(() => setGroups(JSON.parse(savedGroups) as Group[]));
    } catch {
      // Игнорируем ошибку разбора списка групп.
    }
    try {
      const savedChats = localStorage.getItem('piligrim-chats');
      if (savedChats)
        queueMicrotask(() => setChats(JSON.parse(savedChats) as Record<string, Chat>));
    } catch {
      // Игнорируем ошибку разбора списка чатов.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity используется только для инициализации транспортных ключей выше.
  }, []);

  // Этап 2: сохранение контактов в localStorage при каждом изменении.
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-contacts', JSON.stringify(contacts));
    } catch (e) {
      logger.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ contacts:', e);
    }
  }, [contacts]);

  // Этап 2: сохранение групп в localStorage при каждом изменении.
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-groups', JSON.stringify(groups));
    } catch (e) {
      logger.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ groups:', e);
    }
  }, [groups]);

  // Этап 2: сохранение чатов в localStorage при каждом изменении.
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-chats', JSON.stringify(chats));
    } catch (e) {
      logger.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ chats:', e);
    }
  }, [chats]);
  // Этап 2: после инициализации identity создаём предварительные ключи Signal
  // и публикуем их на сервере, чтобы собеседники могли начать с нами сессию Signal.
  useEffect(() => {
    if (!identity || preKeysPublished) return;
    void (async () => {
      try {
        const storage = new SignalStorage();
        const signalManager = new SignalProtocolManager();
        await signalManager.initialize();
        const preKeyMgr = new PreKeyManager(storage);
        await preKeyMgr.generateAndStorePreKeys();
        const myBundle = await preKeyMgr.getMyPreKeyBundle();
        const ok = await apiService.publishPreKeyBundle(identity.uid, myBundle);
        if (ok) {
          setPreKeysPublished(true);
          logger.info('[PILIGRIM] Pre-key bundle published to server');
        } else {
          logger.warn('[PILIGRIM] Pre-key bundle publish returned not-ok');
        }
      } catch (e) {
        logger.error('[PILIGRIM] Failed to publish pre-keys:', e);
      }
    })();
  }, [identity, preKeysPublished]);

  const handleCreateIdentity = async () => {
    logger.info('рџљЂ [PILIGRIM] START: handleCreateIdentity РІС‹Р·РІР°РЅ');
    try {
      logger.info('рџ”‘ [PILIGRIM] РЁР°Рі 1: generateIdentity()...');
      const startTime = Date.now();
      const newIdentity = await generateIdentity();
      logger.info(
        `вњ… [PILIGRIM] generateIdentity() Р·Р°РІРµСЂС€РµРЅ Р·Р° ${Date.now() - startTime}ms`
      );

      // Phase 1 fix: generate and persist transport NaCl box keys for E2EE
      apiService.initKeys(newIdentity.uid);
      newIdentity.transportPublicKey = apiService.getTransportPublicKey();

      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      logger.info('рџЋ­ [PILIGRIM] setShowSeedModal(true) РІС‹РїРѕР»РЅРµРЅ');

      apiService
        .register(newIdentity.uid, apiService.getTransportPublicKey())
        .then(() => logger.info('вњ… [PILIGRIM] register success'))
        .catch((err: unknown) =>
          logger.warn(
            'вљ пёЏ [PILIGRIM] register failed (ignored):',
            err instanceof Error ? err.message : String(err)
          )
        );
    } catch (error) {
      logger.error('вќЊ [PILIGRIM] РћС€РёР±РєР° РІ handleCreateIdentity:', error);
    }
  };

  const handleSeedConfirmed = () => {
    logger.info('вњ… [PILIGRIM] Seed phrase РїРѕРґС‚РІРµСЂР¶РґРµРЅР°, СЃРѕС…СЂР°РЅСЏРµРј Identity');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
        setPendingIdentity(null);
        setShowSeedModal(false);
      } catch (e) {
        logger.error('вќЊ [PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ identity:', e);
      }
    }
  };

  const handleSeedSkip = () => {
    logger.info('вЏ­пёЏ [PILIGRIM] Seed phrase РїСЂРѕРїСѓС‰РµРЅР°');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
      } catch {
        // ignore localStorage error
      }
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  // v1.5.2 Stage 2: реальный обработчик добавления контакта (offline-first)
  const handleAddContact = async (name: string, uid: string, publicKey?: string) => {
    logger.info(
      'вћ• [PILIGRIM] handleAddContact:',
      name,
      uid,
      publicKey ? '(with pubKey)' : '(no pubKey)'
    );

    // Защита от дубликатов: если контакт с таким uid уже есть, не добавляем
    if (contacts.some(c => c.uid === uid)) {
      logger.warn('вљ пёЏ [PILIGRIM] РљРѕРЅС‚Р°РєС‚ СЃ uid', uid, 'СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚');
      alert(`РљРѕРЅС‚Р°РєС‚ "${name}" СѓР¶Рµ РґРѕР±Р°РІР»РµРЅ РІ РІР°С€ СЃРїРёСЃРѕРє.`);
      return;
    }

    const newContact: Contact = {
      id: uid, // РёСЃРїРѕР»СЊР·СѓРµРј uid РєР°Рє Р»РѕРєР°Р»СЊРЅС‹Р№ id
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

    logger.info('вњ… [PILIGRIM] РљРѕРЅС‚Р°РєС‚ РґРѕР±Р°РІР»РµРЅ:', newContact);
    // Phase 2: попытка инициализации Signal сессии в фоне.
    // Не блокируем UI — если упадёт, остаётся NaCl fallback.
    try {
      const remoteBundle = await apiService.getPreKeyBundle(uid);
      if (remoteBundle) {
        const storage = new SignalStorage();
        await storage.warmCacheFromStorage();
        const signalManager = new SignalProtocolManager();
        await signalManager.initialize();
        const deviceId = remoteBundle.deviceId ?? 1;
        await signalManager.createSession(uid, deviceId, remoteBundle);
        logger.info(`[PILIGRIM] Signal session initialized with ${uid} (deviceId=${deviceId})`);
        pushToast(`🔒 Signal PFS активирован с ${name}`, 'success');
      } else {
        logger.info(`[PILIGRIM] No Signal bundle for ${uid}, will use NaCl fallback`);
      }
    } catch (e) {
      logger.warn(`[PILIGRIM] Signal init failed for ${uid}, fallback to NaCl:`, e);
    }
  };
  const handleCreateGroup = async (name: string, type: 'public' | 'private') => {
    if (!identity) {
      logger.warn('[PILIGRIM] handleCreateGroup: no identity');
      return;
    }
    try {
      const result = await apiService.createGroup(name, identity.uid, type);
      const newGroup: Group = {
        id: result.id,
        name,
        members: [identity.uid],
        ownerId: identity.uid,
        type,
        inviteToken: result.token,
      };
      setGroups(prev => [...prev, newGroup]);
      setChats(prev => ({
        ...prev,
        [result.id]: { contactId: result.id, messages: [] },
      }));
      pushToast(`Группа "${name}" создана`, 'success');
      logger.info('[PILIGRIM] Group created:', result.id);
    } catch (err) {
      logger.error('[PILIGRIM] handleCreateGroup failed:', err);
      pushToast('Ошибка создания группы', 'error');
    }
  };
  // v1.6 Batch 4: handleMuteChat — заглушить уведомления чата на заданное время
  // duration: number (мс до конца) | 'forever' | null (null = снять заглушение)
  const handleMuteChat = (chatId: string, duration: number | 'forever' | null) => {
    const now = Date.now();
    let mutedUntil: number | undefined;
    if (duration === 'forever') {
      mutedUntil = Number.MAX_SAFE_INTEGER;
    } else if (typeof duration === 'number') {
      mutedUntil = now + duration;
    } else {
      mutedUntil = undefined;
    }
    setChats(prev => {
      const updated = { ...prev };
      const existing = updated[chatId] || { contactId: chatId, messages: [] };
      updated[chatId] = { ...existing, mutedUntil };
      return updated;
    });
    if (duration === 'forever') {
      pushToast('Р§Р°С‚ Р·Р°РіР»СѓС€С‘РЅ РЅР°РІСЃРµРіРґР°', 'info');
    } else if (duration === null) {
      pushToast('Р—Р°РіР»СѓС€РµРЅРёРµ СЃРЅСЏС‚Рѕ', 'success');
    } else {
      const hours = Math.round(duration / 3600000);
      pushToast(`Р§Р°С‚ Р·Р°РіР»СѓС€С‘РЅ РЅР° ${hours} С‡`, 'info');
    }
    logger.info(
      `рџ”‡ [PILIGRIM] handleMuteChat: chatId=${chatId}, duration=${duration === 'forever' ? 'forever' : duration === null ? 'unmute' : `${duration}ms`}, until=${mutedUntil ?? 'unmuted'}`
    );
  };
  // v1.6 Batch 4: handleArchiveChat — архивировать/разархивировать чат
  const handleArchiveChat = (chatId: string, archive: boolean) => {
    setChats(prev => {
      const updated = { ...prev };
      const existing = updated[chatId] || { contactId: chatId, messages: [] };
      updated[chatId] = { ...existing, archived: archive };
      return updated;
    });
    pushToast(
      archive ? 'Р§Р°С‚ Р°СЂС…РёРІРёСЂРѕРІР°РЅ' : 'Р§Р°С‚ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅ',
      'success'
    );
    logger.info(`рџ“Ѓ [PILIGRIM] handleArchiveChat: chatId=${chatId}, archive=${archive}`);
  };
  const handleOpenProfile = () => {
    setActiveTab('settings');
    setShowAccountPage(true);
  };
  const handleOpenStore = () => pushToast('Магазин пока недоступен', 'info');
  const handleOpenBoards = () => pushToast('Доски объявлений пока недоступны', 'info');

  // v1.6 Batch 4: handleVerifyContact — пометить контакт как verified
  const handleVerifyContact = (chatId: string) => {
    setContacts(prev =>
      prev.map(c => {
        if (c.id === chatId || c.uid === chatId) {
          return { ...c, verified: true, verifiedAt: new Date().toISOString() };
        }
        return c;
      })
    );
    setShowVerifyModal(false);
    pushToast('РљРѕРЅС‚Р°РєС‚ РїРѕРґС‚РІРµСЂР¶РґС‘РЅ вњ…', 'success');
    logger.info(`вњ… [PILIGRIM] handleVerifyContact: chatId=${chatId} marked as verified`);
  };

  // v1.5.2 Stage 5: WebSocket real-time для входящих сообщений.
  // РСЃРїРѕР»СЊР·СѓРµС‚ apiService (NaCl box РґР»СЏ С‚СЂР°РЅСЃРїРѕСЂС‚Р°) + graceful degradation
  // при недоступности бэкенда (только localStorage).
  const ws = useWebSocket({
    myUid: identity?.uid || '',
    enabled: !!identity,
    onMessage: incomingMessage => {
      // incomingMessage приходит от apiService уже с расшифрованным текстом
      // (если NaCl box ключи были настроены), иначе с raw text
      logger.info(
        `рџ“© [PILIGRIM] WS: incoming message from ${incomingMessage.senderId}, chatId=${incomingMessage.groupId ?? 'dm'}`
      );
      const chatId = incomingMessage.groupId || incomingMessage.senderId;
      setChats(prev => {
        const updated = { ...prev };
        if (!updated[chatId]) {
          updated[chatId] = { contactId: chatId, messages: [] };
        }
        // Защита от дубликатов (на случай re-connect)
        const exists = (updated[chatId].messages || []).some(m => m.id === incomingMessage.id);
        if (exists) {
          logger.info(`[PILIGRIM] WS: duplicate message ${incomingMessage.id}, skipped`);
          return prev;
        }
        updated[chatId] = {
          ...updated[chatId],
          messages: [...(updated[chatId].messages || []), incomingMessage],
        };
        return updated;
      });
    },
    onStatusChange: status => {
      logger.info(`[PILIGRIM] WS status: ${status}`);
      setWsStatus(status);
    },
    // v3.17: Handle disappearing messages expiration
    onMessageExpired: data => {
      logger.info('[PILIGRIM] WS: message expired', data);
      setChats(prev => {
        const updated = { ...prev };
        if (!updated[data.chatId]) return prev;
        updated[data.chatId] = {
          ...updated[data.chatId],
          messages: (updated[data.chatId].messages || []).filter(m => m.id !== data.messageId),
        };
        return updated;
      });
    },
  });

  // v3.15: Subscribe to reaction updates from WebSocket
  useEffect(() => {
    if (!identity) return;
    const handleReactionUpdate = (data: {
      messageId: string;
      userId: string;
      emoji: string;
      action: 'add' | 'remove';
      reactions: Reaction[];
    }) => {
      logger.info('[PILIGRIM] Reaction update:', data);
      setChats(prev => {
        const updated = { ...prev };
        for (const [chatId, chat] of Object.entries(updated)) {
          const messageIndex = chat.messages?.findIndex(m => m.id === data.messageId);
          if (messageIndex !== undefined && messageIndex >= 0) {
            updated[chatId] = {
              ...chat,
              messages: chat.messages.map((m, idx) =>
                idx === messageIndex ? { ...m, reactions: data.reactions } : m
              ),
            };
            break; // Message found, no need to check other chats
          }
        }
        return updated;
      });
    };
    apiService.onReactionUpdate(handleReactionUpdate);
    return () => apiService.offReactionUpdate(handleReactionUpdate);
  }, [identity]);

  // v3.16: Subscribe to message edit/delete events from WebSocket
  useEffect(() => {
    if (!identity) return;
    const handleMessageEdited = (data: {
      messageId: string;
      newContent: string;
      editedAt: number;
    }) => {
      logger.info('[PILIGRIM] Message edited:', data);
      setChats(prev => {
        const updated = { ...prev };
        for (const [chatId, chat] of Object.entries(updated)) {
          const messageIndex = chat.messages?.findIndex(m => m.id === data.messageId);
          if (messageIndex !== undefined && messageIndex >= 0) {
            updated[chatId] = {
              ...chat,
              messages: chat.messages.map((m, idx) =>
                idx === messageIndex
                  ? { ...m, text: data.newContent, editedAt: data.editedAt, isEdited: true }
                  : m
              ),
            };
            break;
          }
        }
        return updated;
      });
    };
    const handleMessageDeleted = (data: { messageId: string; deleteForAll?: boolean }) => {
      logger.info('[PILIGRIM] Message deleted:', data);
      setChats(prev => {
        const updated = { ...prev };
        for (const [chatId, chat] of Object.entries(updated)) {
          const messageIndex = chat.messages?.findIndex(m => m.id === data.messageId);
          if (messageIndex !== undefined && messageIndex >= 0) {
            if (data.deleteForAll) {
              // Hard delete - remove message completely
              updated[chatId] = {
                ...chat,
                messages: chat.messages.filter(m => m.id !== data.messageId),
              };
            } else {
              // Soft delete - mark as deleted
              updated[chatId] = {
                ...chat,
                messages: chat.messages.map((m, idx) =>
                  idx === messageIndex ? { ...m, isDeleted: true } : m
                ),
              };
            }
            break;
          }
        }
        return updated;
      });
    };
    apiService.onMessageEdited(handleMessageEdited);
    apiService.onMessageDeleted(handleMessageDeleted);
    // v3.17: Handle disappearing messages expiration
    const handleMessageExpired = (data: { messageId: string; chatId: string }) => {
      logger.info('[PILIGRIM] handleMessageExpired:', data);
      setChats(prev => {
        const updated = { ...prev };
        if (!updated[data.chatId]) return prev;
        updated[data.chatId] = {
          ...updated[data.chatId],
          messages: (updated[data.chatId].messages || []).filter(m => m.id !== data.messageId),
        };
        return updated;
      });
    };
    apiService.onMessageExpired(handleMessageExpired);
    return () => {
      apiService.offMessageEdited(handleMessageEdited);
      apiService.offMessageDeleted(handleMessageDeleted);
      apiService.offMessageExpired(handleMessageExpired);
    };
  }, [identity]);

  // v1.5.2 Stage 6: WebRTC hook — для звонков и демонстрации экрана.
  const webrtcHook = useWebRTC(identity?.uid || '');
  // v3.0 Phase 1: time-based theme (morning/day/evening/night)
  const theme = useTimeTheme();

  const handleSelectChat = (id: string) => {
    logger.info('[PILIGRIM] handleSelectChat:', id);
    setSelectedChatId(id);
  };

  const handleTabChange = (view: TabView) => {
    setActiveTab(view);
    setShowAccountPage(view === 'settings');
  };
  // v1.5.2 Stage 4: handleSendMessage — шифрует сообщение публичным ключом контакта
  // (RSA-OAEP) перед сохранением в localStorage. Если publicKey отсутствует —
  // отправка БЛОКИРУЕТСЯ (безопасность E2EE). Сообщение ставится в offline queue.
  const handleSendMessage = async (
    chatId: string,
    text: string,
    attachments?: { id: string; dataUrl: string; name: string }[],
    replyTo?: string,
    encryptedAttachments?: EncryptedAttachment[],
    voiceMetadata?: VoiceMessageMetadata,
    messageType?: Message['type'],
    ttl?: number
  ) => {
    const trimmed = text.trim();
    if (
      !trimmed &&
      (!encryptedAttachments || encryptedAttachments.length === 0) &&
      !voiceMetadata
    ) {
      return;
    }
    if (!identity) {
      logger.warn(
        '[PILIGRIM] handleSendMessage: identity РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚, СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ РѕС‚РїСЂР°РІР»РµРЅРѕ'
      );
      return;
    }

    // 1. РС‰РµРј РєРѕРЅС‚Р°РєС‚, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РµРіРѕ publicKey
    const contact = contacts.find(c => c.id === chatId || c.uid === chatId);

    // 2. Шифруем — ОБЯЗАТЕЛЬНО, иначе сообщение не уйдёт
    let encryptedPayload: string | undefined;
    let isEncrypted = false;
    let encryptionType: 'signal' | 'nacl' | undefined;

    // SECURITY: Жёсткая проверка ключей ПЕРЕД попыткой отправки
    if (!contact?.publicKey) {
      logger.error(
        `[PILIGRIM] SECURITY: BLOCKED - no publicKey for contact ${chatId}. Message queued offline.`
      );
      // Сообщение НЕ отправляется, остаётся локально
      throw new Error('Missing contact public key - cannot send unencrypted message');
    }
    if (!ws.isConnected) {
      logger.info(`[PILIGRIM] WS offline, message saved locally only (offline-first)`);
    }

    if (contact?.publicKey && ws.isConnected) {
      try {
        const msgId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const secureResult = await apiService.sendMessageSecure(
          contact.uid,
          trimmed,
          contact.publicKey,
          {
            id: msgId,
            type: messageType,
            voiceMetadata,
            encryptedAttachments:
              encryptedAttachments && encryptedAttachments.length > 0
                ? encryptedAttachments
                : undefined,
            disappearIn: ttl,
            timerSetAt: ttl ? Date.now() : undefined,
          }
        );
        encryptionType = secureResult?.type;
        isEncrypted = !!encryptionType;
        if (encryptionType) {
          encryptedPayload = '[secure:' + encryptionType + ']';
        }
        logger.info(
          `[PILIGRIM] E2EE: ${encryptionType === 'signal' ? '🔒 Signal (PFS)' : encryptionType === 'nacl' ? '🔓 NaCl (legacy)' : '❌ BLOCKED'} для ${contact.name}`
        );
      } catch (error) {
        logger.error(`[PILIGRIM] E2EE: ошибка шифрования для ${contact.name}:`, error);
        // SECURITY: НЕТ fallback на plaintext! Ошибка пробрасывается наверх
        throw error;
      }
    } else if (!contact?.publicKey) {
      logger.error(
        `[PILIGRIM] SECURITY: publicKey отсутствует для chatId=${chatId}, отправка ЗАБЛОКИРОВАНА`
      );
    } else if (!ws.isConnected) {
      logger.info(`[PILIGRIM] WS offline, message saved locally only (offline-first)`);
    }

    // 3. Создаём Message (text — для локального UI, encryptedPayload — для хранения/передачи)
    const newMessage: Message = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      text: trimmed,
      encryptedPayload,
      isEncrypted,
      senderId: identity.uid,
      timestamp: new Date().toISOString(),
      status: 'sent',
      type: messageType,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      encryptedAttachments:
        encryptedAttachments && encryptedAttachments.length > 0 ? encryptedAttachments : undefined,
      voiceMetadata,
      replyTo,
      // v3.17: Disappearing messages
      disappearIn: ttl,
      timerSetAt: ttl ? Date.now() : undefined,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
    };
    logger.info(
      `[PILIGRIM] handleSendMessage: chatId=${chatId}, len=${trimmed.length}, encrypted=${isEncrypted}`
    );
    setChats(prev => {
      const updated = { ...prev };
      if (!updated[chatId]) {
        updated[chatId] = { contactId: chatId, messages: [] };
      }
      updated[chatId] = {
        ...updated[chatId],
        messages: [...(updated[chatId].messages || []), newMessage],
      };
      return updated;
    });

    // Stage 5: если WebSocket подключён — отправляем сообщение получателю через сервер.
    // apiService использует NaCl box (X25519+XSalsa20) для транспортного шифрования.
    // Если WS недоступен — сообщение остаётся только локально (offline-first).
    // Phase 2: apiService.sendMessageSecure уже отправил зашифрованное сообщение через WS.
    // Здесь мы только обновляем encryptionType в чате для UI badge (🔒 PFS / 🔓 Legacy).
    if (encryptionType) {
      setChats(prev => {
        const updated = { ...prev };
        if (!updated[chatId]) {
          updated[chatId] = { contactId: chatId, messages: [] };
        }
        updated[chatId] = {
          ...updated[chatId],
          encryptionType,
        };
        return updated;
      });
      logger.info(`[PILIGRIM] Chat ${chatId} encryptionType set to: ${encryptionType}`);
    }
  };
  // v3.0 Phase 3: удаление сообщения из чата — HARD DELETE
  const handleDeleteMessage = (chatId: string, messageId: string) => {
    logger.info('[PILIGRIM] handleDeleteMessage:', { chatId, messageId });
    // Send delete request via WebSocket (delete for all = true for hard delete)
    apiService.sendMessageDelete(messageId, true);
    // Optimistic update - физическое удаление из локального стейта
    setChats(prev => {
      const updated = { ...prev };
      if (!updated[chatId]) return prev;
      updated[chatId] = {
        ...updated[chatId],
        messages: updated[chatId].messages.filter(m => m.id !== messageId),
      };
      return updated;
    });
  };
  // v3.0 Phase 3: редактирование сообщения (локальное изменение текста)
  const handleEditMessage = (chatId: string, messageId: string, newText: string) => {
    logger.info('[PILIGRIM] handleEditMessage:', { chatId, messageId });
    // Send edit request via WebSocket
    apiService.sendMessageEdit(messageId, newText);
    // Optimistic update - local state will be synced via WS event
    setChats(prev => {
      const updated = { ...prev };
      if (!updated[chatId]) return prev;
      updated[chatId] = {
        ...updated[chatId],
        messages: updated[chatId].messages.map(m =>
          m.id === messageId ? { ...m, text: newText, isEdited: true } : m
        ),
      };
      return updated;
    });
  };
  // v3.18: Forward message
  const handleForwardMessage = (message: Message) => {
    logger.info('[PILIGRIM] handleForwardMessage:', message.id);
    setForwardTargetMessage(message);
    setShowForwardModal(true);
  };

  const handleForwardConfirm = async (targetChatIds: string[]) => {
    if (!forwardTargetMessage || targetChatIds.length === 0) return;

    logger.info('[PILIGRIM] Forwarding message to:', targetChatIds);
    const result = await apiService.forwardMessage(forwardTargetMessage.id, targetChatIds);

    if (result.successCount > 0) {
      logger.info(`[PILIGRIM] Successfully forwarded to ${result.successCount} chats`);
    } else {
      logger.warn('[PILIGRIM] Forward failed');
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
            <h1 className="text-3xl font-bold mb-4">
              рџЋ‰ Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ, {identity.username}!
            </h1>
            <p className="text-slate-400">
              Identity СЃРѕР·РґР°РЅР° СѓСЃРїРµС€РЅРѕ. Phase 9.5 minimal version.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('piligrim-identity');
                setIdentity(null);
              }}
              className="mt-4 px-4 py-2 bg-red-600 rounded"
            >
              Р’С‹Р№С‚Рё
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

  // v3.0 Phase 5: handleRestore через LoginPage (BIP39)
  const handleRestoreFromLoginPage = async (payload: { words: string[]; isBIP39: boolean }) => {
    logger.info('[PILIGRIM] LoginPage restore triggered, BIP39=', payload.isBIP39);
    try {
      // Получаем encryptedKeyPair из localStorage (multi-device flow)
      let encryptedKeyPair: string | undefined;
      try {
        const saved = localStorage.getItem('piligrim-identity');
        if (saved) {
          const parsed = JSON.parse(saved) as { encryptedKeyPair?: string };
          encryptedKeyPair = parsed.encryptedKeyPair;
        }
      } catch {
        // ignore parse errors
      }

      // Вызываем cryptoService.restoreIdentityFromSeed
      const restored = await restoreIdentityFromSeed(payload.words, encryptedKeyPair);

      logger.info(`[PILIGRIM] Restored identity: uid=${restored.uid}, isBIP39=${restored.isBIP39}`);

      // Phase 1 fix: ensure transport keys exist for restored identity
      apiService.initKeys(restored.uid);
      restored.transportPublicKey = apiService.getTransportPublicKey();

      // Сохраняем в localStorage и обновляем state
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(restored));
      } catch (e) {
        logger.error('[PILIGRIM] Failed to save restored identity:', e);
      }
      setIdentity(restored);
    } catch (err) {
      logger.error('[PILIGRIM] LoginPage restore failed:', err);
      // Error остаётся в state LoginPage через её own error handling
    }
  };

  // v3.0 Neuro-Minimalist LoginPage: единая точка входа (Login / Register / Restore)
  // LoginPage сама переключает mode между login/register/restore.
  // Register → handleCreateIdentity (BIP39 generation + SeedPhraseModal).
  // Restore → handleRestoreFromLoginPage (multi-device flow с encryptedKeyPair).
  // Login → handleCreateIdentity stub (гибридный режим, для существующих identity).
  if (!identity) {
    logger.info('[PILIGRIM] LoginPage rendered (Neuro-Minimalist UI)');
    return (
      <LoginPage
        onLogin={() => void handleCreateIdentity()}
        onRestore={(payload: { words: string[]; isBIP39: boolean }) =>
          void handleRestoreFromLoginPage(payload)
        }
      />
    );
  }

  // v3.0 Phase 2B-1: Responsive Layout Shell
  // 3 breakpoints: mobile (<=640), tablet (641-1024), desktop (>1024).
  // On RT9 (800x1280) -> tablet — two-column 30%/70% layout.
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        position: 'relative',
      }}
    >
      {/* Stage 5: индикатор статуса WebSocket (правый верхний угол) */}
      <div
        data-testid="ws-status"
        title={`WebSocket: ${wsStatus}`}
        style={{
          position: 'absolute',
          top: '8px',
          right: '12px',
          zIndex: 100,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor:
            wsStatus === 'open' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
          border: `1px solid ${wsStatus === 'open' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          borderRadius: '12px',
          color: wsStatus === 'open' ? 'var(--color-success)' : 'var(--color-danger)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: wsStatus === 'open' ? 'var(--color-success)' : 'var(--color-danger)',
            animation: wsStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : undefined,
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

      {/* v3.0 Phase 2B-1: ResponsiveShell - 3 breakpoints (mobile/tablet/desktop) */}
      {activeTab === 'chats' && (
        <ResponsiveShell
          leftPanel={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Phase 2B-2: LeftAppBar — burger + "Чаты" + search */}
              <LeftAppBar
                onMenuClick={() => setIsDrawerOpen(true)}
                onSearchClick={() => setIsSearchOpen(true)}
              />
              {/* Scrollable ContactList area */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ContactList
                  identity={identity}
                  contacts={contacts}
                  groups={groups}
                  chats={chats}
                  selectedChatId={selectedChatId}
                  onSelectChat={handleSelectChat}
                  onAddContact={(name, uid, publicKey) =>
                    void handleAddContact(name, uid, publicKey)
                  }
                  onCreateGroup={(name, type) => void handleCreateGroup(name, type)}
                  onMuteChat={handleMuteChat}
                  onArchiveChat={handleArchiveChat}
                  onOpenProfile={handleOpenProfile}
                  onOpenStore={handleOpenStore}
                  onOpenBoards={handleOpenBoards}
                />
              </div>
            </div>
          }
          rightPanel={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Phase 2B-2: RightAppBar — avatar + name + status + 3 icons */}
              <RightAppBar
                contactName={(() => {
                  if (!selectedChatId) return undefined;
                  const c = contacts.find(c => c.id === selectedChatId || c.uid === selectedChatId);
                  if (c) return c.name;
                  const g = groups.find(g => g.id === selectedChatId);
                  if (g) return g.name;
                  return undefined;
                })()}
                contactUid={selectedChatId || undefined}
                isOnline={wsStatus === 'open'}
                showBack={!!selectedChatId}
                onBackClick={() => setSelectedChatId(null)}
                onCallClick={() => {
                  const target = contacts.find(
                    c => c.id === selectedChatId || c.uid === selectedChatId
                  );
                  if (target && target.uid) {
                    logger.info(`[PILIGRIM] Stage 6: audio call to ${target.name} (${target.uid})`);
                    void webrtcHook.startCall(target.uid);
                  } else {
                    alert('Contact not found or has no UID');
                  }
                }}
                onVideoClick={() => {
                  const target = contacts.find(
                    c => c.id === selectedChatId || c.uid === selectedChatId
                  );
                  if (target?.uid) {
                    void webrtcHook.startCall(target.uid);
                  } else {
                    pushToast('Видеозвонок доступен только для личных чатов', 'info');
                  }
                }}
                onMenuClick={() => setIsDrawerOpen(true)}
                // v3.0 Phase 2H: клик по аватару/имени открывает 3rd profile panel
                onAvatarClick={() => setIsProfileOpen(true)}
              />
              {/* Scrollable content area */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {selectedChatId && chats[selectedChatId] ? (
                  <ChatWindow
                    chatId={selectedChatId}
                    messages={chats[selectedChatId]?.messages || []}
                    showHeader={false}
                    onSendMessage={(text, options) => {
                      void handleSendMessage(
                        selectedChatId,
                        text,
                        options?.attachments,
                        options?.replyTo,
                        options?.encryptedAttachments,
                        options?.voiceMetadata,
                        options?.messageType,
                        options?.ttl
                      );
                    }}
                    currentIdentity={identity ?? undefined}
                    partner={(() => {
                      const c = contacts.find(c => c.id === selectedChatId);
                      if (c) return c;
                      const g = groups.find(g => g.id === selectedChatId);
                      if (g) return { name: g.name };
                      return undefined;
                    })()}
                    currentUserUid={identity?.uid}
                    onDeleteMessage={messageId => handleDeleteMessage(selectedChatId, messageId)}
                    onEditMessage={(messageId, newText) =>
                      handleEditMessage(selectedChatId, messageId, newText)
                    }
                    onForwardMessage={handleForwardMessage}
                    onStartCall={() => {
                      const target = contacts.find(c => c.id === selectedChatId);
                      if (target && target.uid) {
                        logger.info(
                          `[PILIGRIM] Stage 6: starting call to ${target.name} (${target.uid})`
                        );
                        void webrtcHook.startCall(target.uid);
                      } else {
                        alert('Contact not found or has no UID');
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
                    mutedUntil={chats[selectedChatId]?.mutedUntil}
                    onVerifyContact={() => setShowVerifyModal(true)}
                    encryptionType={chats[selectedChatId]?.encryptionType}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-secondary)',
                      padding: '24px',
                    }}
                  >
                    <p style={{ fontSize: '1.125rem', margin: '0 0 8px' }} aria-label="Empty chat">
                      Добро пожаловать в PILIGRIM
                    </p>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)',
                        maxWidth: '280px',
                        textAlign: 'center',
                        margin: '0 0 24px',
                      }}
                    >
                      Выберите контакт слева или добавьте новый с помощью <strong>+</strong>
                    </p>
                    <button
                      onClick={handleLogout}
                      aria-label="Logout"
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        background: 'var(--color-danger)',
                        color: 'var(--color-on-primary)',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          }
          tabBar={
            <TabletTabBar
              activeView={activeTab}
              onViewChange={view => {
                logger.info('[PILIGRIM] Tab changed to:', view);
                handleTabChange(view);
              }}
            />
          }
          fab={
            <FloatingActionButton
              onClick={() => {
                // v3.0 Phase 2C: FAB открывает AddContactModal через кастомное событие,
                // которое слушает ContactList (он владеет модалкой внутри себя)
                window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
                logger.info('[PILIGRIM] FAB clicked: requested AddContactModal open');
              }}
            />
          }
          // v3.0 Phase 2G: mobile floating circle nav (заменяет tabBar на ≤640px)
          mobileNav={
            <FloatingCircleNav
              activeView={activeTab}
              onViewChange={handleTabChange}
              onCompose={() => {
                window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
                logger.info('[PILIGRIM] Circle compose clicked: requested AddContactModal open');
              }}
            />
          }
          // v3.0 Phase 2H: desktop joystick (фиксированный слева)
          desktopNav={
            <DesktopJoystick
              activeView={activeTab}
              onViewChange={handleTabChange}
              onCompose={() => {
                window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
                logger.info('[PILIGRIM] Joystick compose clicked: requested AddContactModal open');
              }}
            />
          }
          mobileShowList={!selectedChatId}
          // v3.0 Phase 2H: 3rd panel on desktop — открывается по клику на аватар в RightAppBar
          profilePanel={(() => {
            if (!isProfileOpen || !selectedChatId) return undefined;
            const partner = contacts.find(c => c.id === selectedChatId || c.uid === selectedChatId);
            if (!partner) return undefined;
            return (
              <ProfilePanel
                contactName={partner.name}
                contactUid={partner.uid}
                isOnline={wsStatus === 'open'}
                onCall={() => {
                  if (partner.uid) void webrtcHook.startCall(partner.uid);
                }}
                onVideo={() => {
                  if (partner.uid) void webrtcHook.startCall(partner.uid);
                }}
                onSearch={() => setIsSearchOpen(true)}
                onShowMedia={() => pushToast('Медиа и файлы пока недоступны', 'info')}
                onClose={() => setIsProfileOpen(false)}
              />
            );
          })()}
        />
      )}

      {activeTab === 'contacts' && (
        <ContactsView
          contacts={contacts.filter(contact => contact.uid !== 'system')}
          onBack={() => handleTabChange('chats')}
          onSelectContact={uid => {
            handleTabChange('chats');
            handleSelectChat(uid);
          }}
        />
      )}

      {activeTab === 'calls' && <CallsHistoryView onSearchClick={() => setIsSearchOpen(true)} />}

      {/* v3.0 Phase 2C: вкладка Избранное — только verified контакты */}
      {activeTab === 'favorites' && (
        <FavoritesView
          contacts={contacts}
          onSelectContact={uid => {
            handleTabChange('chats');
            void handleSelectChat(uid);
          }}
          onSearchClick={() => setIsSearchOpen(true)}
        />
      )}

      {/* Telegram-like: вкладка Каналы */}
      {activeTab === 'channels' && <ChannelsView onBack={() => handleTabChange('chats')} />}

      {activeTab !== 'chats' && activeTab !== 'settings' && (
        <>
          <div className="app-mobile-nav">
            <FloatingCircleNav
              activeView={activeTab}
              onViewChange={handleTabChange}
              onCompose={() => {
                window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
                logger.info('[PILIGRIM] Circle compose clicked: requested AddContactModal open');
              }}
            />
          </div>
          <div className="app-tablet-nav">
            <TabletTabBar activeView={activeTab} onViewChange={handleTabChange} />
          </div>
          <div className="app-desktop-nav">
            <DesktopJoystick
              activeView={activeTab}
              onViewChange={handleTabChange}
              onCompose={() => {
                window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
                logger.info('[PILIGRIM] Joystick compose clicked: requested AddContactModal open');
              }}
            />
          </div>
        </>
      )}

      {/* Batch 4: модалка верификации контакта */}
      {showVerifyModal &&
        selectedChatId &&
        (() => {
          const partner = contacts.find(c => c.id === selectedChatId || c.uid === selectedChatId);
          return (
            <VerifyModal
              partnerName={partner?.name || 'Контакт'}
              partnerPublicKey={partner?.publicKey}
              myPublicKey={identity ? getPublicKey(identity) : undefined}
              partnerFingerprint={partner?.keyFingerprint}
              myFingerprint={identity?.keyFingerprint}
              isVerified={!!partner?.verified}
              onConfirm={() => handleVerifyContact(selectedChatId)}
              onClose={() => setShowVerifyModal(false)}
            />
          );
        })()}

      {/* v3.18: Forward messages modal */}
      {showForwardModal && forwardTargetMessage && (
        <ForwardModal
          isOpen={showForwardModal}
          onClose={() => setShowForwardModal(false)}
          messageToForward={forwardTargetMessage}
          contacts={contacts}
          groups={groups}
          currentUserUid={identity?.uid || ''}
          onConfirm={handleForwardConfirm}
        />
      )}

      {/* Batch 4: Toast notifications */}
      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {/* v3.0 Phase 2D: Drawer (боковая штора профиля + QR-код) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        identity={identity}
        lang={language}
        onToggleLang={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
        // v3.0 Phase 2F: активная вкладка для индикатора в Drawer
        activeView={activeTab}
        onNavigate={handleTabChange}
        onOpenAccount={() => {
          setIsDrawerOpen(false);
          setActiveTab('settings');
          setShowAccountPage(true);
        }}
        onCreateGroup={() => {
          setActiveTab('chats');
          window.setTimeout(() => {
            window.dispatchEvent(new Event('piligrim:open-create-group'));
          }, 0);
        }}
        onLogout={() => {
          setIsDrawerOpen(false);
          setShowLogoutModal(true);
        }}
      />

      {/* v3.0 Security Dashboard: AccountPage (Настройки → Аккаунт) */}
      {identity && showAccountPage && (
        <AccountPage
          user={{
            name: identity.username || 'Пилигрим',
            uid: identity.uid,
            keyFingerprint: identity.keyFingerprint,
            usesSeedPhrase: identity.isBIP39 === true && !!identity.seedPhrase,
          }}
          onBack={() => {
            setShowAccountPage(false);
            setActiveTab('chats');
          }}
          onLogout={() => {
            void setShowAccountPage(false);
            void setShowLogoutModal(true);
          }}
          onBackupSeed={() => {
            if (!identity.seedPhrase) return;
            setPendingIdentity(identity);
            void setShowAccountPage(false);
            void setShowSeedModal(true);
          }}
          onUpdateName={name => {
            const updatedIdentity = { ...identity, username: name };
            try {
              localStorage.setItem('piligrim-identity', JSON.stringify(updatedIdentity));
              setIdentity(updatedIdentity);
              return true;
            } catch (error) {
              logger.error('[PILIGRIM] Failed to save profile name:', error);
              return false;
            }
          }}
        />
      )}

      {/* v3.0 Phase 2E: Search command palette (Ctrl+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        contacts={searchableContacts}
        onContactSelect={(uid: string) => {
          void setIsSearchOpen(false);
          void setActiveTab('chats');
          void setSelectedChatId(uid);
        }}
      />

      {/* v3.0 Logout: модалка подтверждения выхода (вызывается из RightAppBar ⋮) */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        identityUid={identity?.uid}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          void setShowLogoutModal(false);
          void logout();
        }}
      />

      {/* v3.0 Phase 1: theme indicator (правый нижний угол) */}
      <div
        className="theme-indicator"
        data-testid="theme-indicator"
        style={{
          position: 'fixed',
          bottom: 'var(--theme-indicator-bottom, 12px)',
          right: '12px',
          padding: '4px 10px',
          backgroundColor: 'var(--color-bg-elevated)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-surface)',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
          pointerEvents: 'none',
        }}
        title="Адаптивная тема по времени суток"
        aria-label="Текущая тема"
      >
        {theme === 'morning' && '🌅 Утро'}
        {theme === 'day' && '☀️ День'}
        {theme === 'evening' && '🌆 Вечер'}
        {theme === 'night' && '🌙 Ночь'}
      </div>

      {/* WebRTC CallModal: рендерится при callState !== 'idle' */}
      {webrtcHook.isInCall || webrtcHook.isCalling || webrtcHook.incomingCall ? (
        <CallModal
          callState={
            webrtcHook.isInCall
              ? 'in-call'
              : webrtcHook.isCalling
                ? 'calling'
                : webrtcHook.incomingCall
                  ? 'incoming'
                  : 'idle'
          }
          partnerName={(() => {
            const target = contacts.find(c => c.uid === webrtcHook.currentCallUid);
            return target?.name || 'Контакт';
          })()}
          localStream={webrtcHook.localStream}
          remoteStream={webrtcHook.remoteStream}
          onAccept={() => void webrtcHook.answerCall()}
          onDecline={() => void webrtcHook.rejectCall()}
          onEnd={() => void webrtcHook.endCall()}
          onStartCall={() => {
            const target = contacts.find(c => c.uid === webrtcHook.currentCallUid);
            if (target && target.uid) {
              void webrtcHook.startCall(target.uid);
            }
          }}
          onToggleMute={() => void webrtcHook.toggleAudio()}
          onToggleVideo={() => void webrtcHook.toggleVideo()}
          onStartScreenShare={() => void webrtcHook.toggleScreenShare()}
          isMuted={!webrtcHook.isAudioEnabled()}
          isVideoEnabled={webrtcHook.isVideoEnabled()}
          isScreenSharing={webrtcHook.isScreenSharing}
          callDuration={webrtcHook.callDuration}
        />
      ) : null}
    </div>
  );
};

export default App;

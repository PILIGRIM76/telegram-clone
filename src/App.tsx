import { logger } from './services/logger';
/* App.tsx updated for Telegram-style tablet layout */
﻿// v1.5.2 Stage 5: WebSocket real-time для зашифрованных сообщений
// Цель: доставка входящих сообщений от других клиентов + индикатор статуса подключения
import React, { useState, useEffect, useMemo } from 'react';
import LoginPage from './components/LoginPage';
import SeedPhraseModal from './components/SeedPhraseModal';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import VerifyModal from './components/VerifyModal';
import Toasts from './components/Toast';
// FIX 2026-09-10: 27 dead component imports removed (not rendered in JSX):
// These components exist but are not wired into the current UI (Phase 10 backlog).
import { useTranslation } from './contexts/LanguageContext';
import { useToasts } from './hooks/useToasts';
import { generateIdentity, restoreIdentityFromSeed, getPublicKey } from './services/cryptoService';
import { apiService } from './services/apiService';
import { useWebSocket } from './hooks/useWebSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { useTimeTheme } from './hooks/useTimeTheme';
import { ResponsiveShell } from './components/ResponsiveShell';
import { LeftAppBar } from './components/LeftAppBar';
import { RightAppBar } from './components/RightAppBar';
import { CallModal } from './components/CallModal';
import { TabletTabBar, type TabView } from './components/TabletTabBar';
import { ChannelsView } from './components/ChannelsView';
import { FloatingActionButton } from './components/FloatingActionButton';
// v3.0 Phase 2G: mobile floating circle nav
import { FloatingCircleNav } from './components/FloatingCircleNav';
// v3.0 Phase 2H: desktop joystick + profile panel
import { DesktopJoystick } from './components/DesktopJoystick';
import { ProfilePanel } from './components/ProfilePanel';
import { useLogout } from './hooks/useLogout';
import { ConfirmLogoutModal } from './components/ConfirmLogoutModal';
import { CallsHistoryView } from './components/CallsHistoryView';
import { FavoritesView } from './components/FavoritesView';
import { Drawer } from './components/Drawer';
import { SearchModal } from './components/SearchModal';
import AccountPage from './components/AccountPage';
import type { Contact, Group, Chat, Message, Identity, IdentityType } from './types';
// Phase 2: Signal Protocol — PFS via Double Ratchet.
// handleSendMessage использует apiService.sendMessageSecure (Signal preferred, NaCl fallback).
// handleAddContact инициализирует Signal сессию через SignalProtocolManager.initSessionWithPreKeyBundle.
import { SignalProtocolManager } from './crypto/signal/SignalProtocolManager';
import { PreKeyManager } from './crypto/signal/PreKeyManager';
// FIX 2026-09-10: bundleToPreKeyBundle удалён — не используется в App.tsx
// (он нужен только в SignalMessageLayer.ts для внутреннего conversion).

const App: React.FC = () => {
  const [identity, setIdentity] = useState<IdentityType | null>(() => {
    try {
      const saved = localStorage.getItem('piligrim-identity');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pendingIdentity, setPendingIdentity] = useState<IdentityType | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  // v3.0 Phase 2B-3: активная вкладка TabletTabBar (chats/contacts/calls/favorites)
  const [activeTab, setActiveTab] = useState<TabView>('chats');
  // v3.0 Logout: модалка подтверждения выхода из аккаунта
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // v3.0 Phase 2D: Drawer (боковая штора профиля)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // v3.0 Phase 2E: Search modal (Ctrl+K command palette)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // v3.0 Phase 2H: Profile panel (3rd desktop panel)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // v3.0 Security Dashboard: AccountPage (Security settings)
  const [showAccountPage, setShowAccountPage] = useState(false);
  // Phase 2: флаг публикации своего Signal pre-key bundle на сервер.
  // Выставляется в true после успешного POST /keys/publish, чтобы не делать это повторно.
  const [preKeysPublished, setPreKeysPublished] = useState(false);

  // v3.0 Phase 2D: слушаем кастомное событие от CallsHistoryView/FavoritesView
  // для открытия Drawer через window event (loose coupling)
  useEffect(() => {
    const handler = () => setIsDrawerOpen(true);
    window.addEventListener('piligrim:open-drawer', handler);
    return () => window.removeEventListener('piligrim:open-drawer', handler);
  }, []);

  // v3.0 Phase 2E: Ctrl+K (Cmd+K на Mac) hotkey для command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // v3.0 Logout: hook для очистки identity + WebSocket + reload
  const logout = useLogout({ clearData: false });

  // v1.5.2 Stage 1: локальные списки (без useLocalStorage, чтобы не нарушать правила хуков)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  // v1.5.2 Stage 5: статус WebSocket для UI-индикатора (Online/Offline/Reconnecting)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed' | 'error' | 'unsupported'>('closed');
  // v1.6 Batch 4: РїРѕРєР°Р·С‹РІР°С‚СЊ РјРѕРґР°Р»РєСѓ РІРµСЂРёС„РёРєР°С†РёРё РєРѕРЅС‚Р°РєС‚Р°
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const { language, setLanguage } = useTranslation();
  // v1.6 Batch 4: toast-СѓРІРµРґРѕРјР»РµРЅРёСЏ (РѕР±СЉСЏРІР»РµРЅС‹ СЂР°РЅСЊС€Рµ handlers, С‡С‚РѕР±С‹ РёС… РјРѕР¶РЅРѕ Р±С‹Р»Рѕ РІС‹Р·С‹РІР°С‚СЊ)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const searchableContacts = useMemo(() => contacts.map((c) => ({
    uid: c.uid,
    name: c.name,
    lastMessage: chats[c.uid]?.messages?.slice(-1)[0]?.text,
  })), [contacts, chats]);

  // v1.5.2 Stage 2: Р·Р°РіСЂСѓР·РєР° РєРѕРЅС‚Р°РєС‚РѕРІ, РіСЂСѓРїРї Рё С‡Р°С‚РѕРІ РёР· localStorage РїРѕСЃР»Рµ РјРѕРЅС‚РёСЂРѕРІР°РЅРёСЏ
  useEffect(() => {
  // Phase 1 fix: ensure transport keys exist for loaded/restored identity
  {
    if (identity && !identity.transportPublicKey) {
      apiService.initKeys(identity.uid);
      const updated = { ...identity, transportPublicKey: apiService.getTransportPublicKey() };
      setIdentity(updated);
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(updated));
      } catch (e) {
        logger.warn('[PILIGRIM] Failed to update identity with transportPublicKey:', e);
      }
    }
  }

    logger.info('[PILIGRIM] App mounted (v1.5.2 Stage 2 вЂ” AddContact enabled)');
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

  // v1.5.2 Stage 2: Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ contacts РІ localStorage РїСЂРё РєР°Р¶РґРѕРј РёР·РјРµРЅРµРЅРёРё
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-contacts', JSON.stringify(contacts));
    } catch (e) {
      logger.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ contacts:', e);
    }
  }, [contacts]);

  // v1.5.2 Stage 2: Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ groups РІ localStorage РїСЂРё РєР°Р¶РґРѕРј РёР·РјРµРЅРµРЅРёРё
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-groups', JSON.stringify(groups));
    } catch (e) {
      logger.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ groups:', e);
    }
  }, [groups]);

  // v1.5.2 Stage 2: Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ chats РІ localStorage РїСЂРё РєР°Р¶РґРѕРј РёР·РјРµРЅРµРЅРёРё
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-chats', JSON.stringify(chats));
    } catch (e) {
      logger.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ chats:', e);
    }
  }, [chats]);
// Phase 2: после инициализации identity → генерируем Signal pre-keys
  // и публикуем свой pre-key bundle на сервер для инициаторов сессий.
  // Этот шаг ОБЯЗАТЕЛЕН чтобы собеседники могли инициализировать Signal сессию с нами.
  useEffect(() => {
    if (!identity || preKeysPublished) return;
    (async () => {
      try {
        const { SignalStorage } = await import('./crypto/signal/SignalStorage');
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
      logger.info(`вњ… [PILIGRIM] generateIdentity() Р·Р°РІРµСЂС€РµРЅ Р·Р° ${Date.now() - startTime}ms`);

      // Phase 1 fix: generate and persist transport NaCl box keys for E2EE
      apiService.initKeys(newIdentity.uid);
      newIdentity.transportPublicKey = apiService.getTransportPublicKey();

      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      logger.info('рџЋ­ [PILIGRIM] setShowSeedModal(true) РІС‹РїРѕР»РЅРµРЅ');

      apiService.register(newIdentity.uid, apiService.getTransportPublicKey())
        .then(() => logger.info('вњ… [PILIGRIM] register success'))
        .catch((err: any) => logger.warn('вљ пёЏ [PILIGRIM] register failed (ignored):', err?.message || err));
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
      } catch {}
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  // v1.5.2 Stage 2: СЂРµР°Р»СЊРЅС‹Р№ РѕР±СЂР°Р±РѕС‚С‡РёРє РґРѕР±Р°РІР»РµРЅРёСЏ РєРѕРЅС‚Р°РєС‚Р° (offline-first)
  const handleAddContact = async (name: string, uid: string, publicKey?: string) => {
    logger.info('вћ• [PILIGRIM] handleAddContact:', name, uid, publicKey ? '(with pubKey)' : '(no pubKey)');

    // Р—Р°С‰РёС‚Р° РѕС‚ РґСѓР±Р»РёРєР°С‚РѕРІ: РµСЃР»Рё РєРѕРЅС‚Р°РєС‚ СЃ С‚Р°РєРёРј uid СѓР¶Рµ РµСЃС‚СЊ, РЅРµ РґРѕР±Р°РІР»СЏРµРј
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
      // mutedUntil РЅРµ СѓСЃС‚Р°РЅР°РІР»РёРІР°РµРј вЂ” С‡Р°С‚ РЅРµ Р·Р°РјСЊСЋС‡РµРЅ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
    };

    setContacts(prev => [...prev, newContact]);

    // РЎРѕР·РґР°С‘Рј РїСѓСЃС‚РѕР№ С‡Р°С‚ РґР»СЏ РЅРѕРІРѕРіРѕ РєРѕРЅС‚Р°РєС‚Р°
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
        const { SignalStorage } = await import('./crypto/signal/SignalStorage');
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
      setGroups((prev) => [...prev, newGroup]);
      setChats((prev) => ({
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
  // v1.6 Batch 4: handleMuteChat вЂ” Р·Р°РіР»СѓС€РёС‚СЊ СѓРІРµРґРѕРјР»РµРЅРёСЏ С‡Р°С‚Р° РЅР° Р·Р°РґР°РЅРЅРѕРµ РІСЂРµРјСЏ
  // duration: number (РјСЃ РґРѕ РєРѕРЅС†Р°) | 'forever' | null (null = СЃРЅСЏС‚СЊ Р·Р°РіР»СѓС€РµРЅРёРµ)
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
    setChats((prev) => {
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
    logger.info(`рџ”‡ [PILIGRIM] handleMuteChat: chatId=${chatId}, duration=${duration === 'forever' ? 'forever' : duration === null ? 'unmute' : `${duration}ms`}, until=${mutedUntil ?? 'unmuted'}`);
  };
  // v1.6 Batch 4: handleArchiveChat вЂ” Р°СЂС…РёРІРёСЂРѕРІР°С‚СЊ/СЂР°Р·Р°СЂС…РёРІРёСЂРѕРІР°С‚СЊ С‡Р°С‚
  const handleArchiveChat = (chatId: string, archive: boolean) => {
    setChats((prev) => {
      const updated = { ...prev };
      const existing = updated[chatId] || { contactId: chatId, messages: [] };
      updated[chatId] = { ...existing, archived: archive };
      return updated;
    });
    pushToast(archive ? 'Р§Р°С‚ Р°СЂС…РёРІРёСЂРѕРІР°РЅ' : 'Р§Р°С‚ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅ', 'success');
    logger.info(`рџ“Ѓ [PILIGRIM] handleArchiveChat: chatId=${chatId}, archive=${archive}`);
  };
  const handleOpenProfile = () => logger.info('[PILIGRIM] handleOpenProfile stub');
  const handleOpenStore = () => logger.info('[PILIGRIM] handleOpenStore stub');
  const handleOpenBoards = () => logger.info('[PILIGRIM] handleOpenBoards stub');

  // v1.6 Batch 4: handleVerifyContact вЂ” РїРѕРјРµС‚РёС‚СЊ РєРѕРЅС‚Р°РєС‚ РєР°Рє verified
  const handleVerifyContact = (chatId: string) => {
    setContacts((prev) =>
      prev.map((c) => {
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

  // v1.5.2 Stage 5: WebSocket real-time РґР»СЏ РІС…РѕРґСЏС‰РёС… СЃРѕРѕР±С‰РµРЅРёР№.
  // РСЃРїРѕР»СЊР·СѓРµС‚ apiService (NaCl box РґР»СЏ С‚СЂР°РЅСЃРїРѕСЂС‚Р°) + graceful degradation
  // РїСЂРё РЅРµРґРѕСЃС‚СѓРїРЅРѕСЃС‚Рё Р±СЌРєРµРЅРґР° (С‚РѕР»СЊРєРѕ localStorage).
  const ws = useWebSocket({
    myUid: identity?.uid || '',
    enabled: !!identity,
    onMessage: (incomingMessage) => {
      // incomingMessage РїСЂРёС…РѕРґРёС‚ РѕС‚ apiService СѓР¶Рµ СЃ СЂР°СЃС€РёС„СЂРѕРІР°РЅРЅС‹Рј С‚РµРєСЃС‚РѕРј
      // (РµСЃР»Рё NaCl box РєР»СЋС‡Рё Р±С‹Р»Рё РЅР°СЃС‚СЂРѕРµРЅС‹), РёРЅР°С‡Рµ СЃ raw text
      logger.info(`рџ“© [PILIGRIM] WS: incoming message from ${incomingMessage.senderId}, chatId=${incomingMessage.groupId ?? 'dm'}`);
      const chatId = incomingMessage.groupId || incomingMessage.senderId;
      setChats((prev) => {
        const updated = { ...prev };
        if (!updated[chatId]) {
          updated[chatId] = { contactId: chatId, messages: [] };
        }
        // Р—Р°С‰РёС‚Р° РѕС‚ РґСѓР±Р»РёРєР°С‚РѕРІ (РЅР° СЃР»СѓС‡Р°Р№ re-connect)
        const exists = (updated[chatId].messages || []).some((m) => m.id === incomingMessage.id);
        if (exists) {
          logger.info(`[PILIGRIM] WS: duplicate message ${incomingMessage.id}, skipped`);
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
      logger.info(`[PILIGRIM] WS status: ${status}`);
      setWsStatus(status);
    }
  });

  // v1.5.2 Stage 6: WebRTC hook вЂ” РґР»СЏ Р·РІРѕРЅРєРѕРІ Рё РґРµРјРѕРЅСЃС‚СЂР°С†РёРё СЌРєСЂР°РЅР°.
  const webrtcHook = useWebRTC(identity?.uid || '');
  // v3.0 Phase 1: time-based theme (morning/day/evening/night)
  const theme = useTimeTheme();

  const handleSelectChat = (id: string) => {
    logger.info('[PILIGRIM] handleSelectChat:', id);
    setSelectedChatId(id);
  };
  // v1.5.2 Stage 4: handleSendMessage вЂ” С€РёС„СЂСѓРµС‚ СЃРѕРѕР±С‰РµРЅРёРµ РїСѓР±Р»РёС‡РЅС‹Рј РєР»СЋС‡РѕРј РєРѕРЅС‚Р°РєС‚Р°
  // (RSA-OAEP) РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј РІ localStorage. Р•СЃР»Рё publicKey РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ вЂ”
  // РѕС‚РїСЂР°РІР»СЏРµРј РІ plaintext СЃ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµРј (graceful fallback РґР»СЏ UX).
  const handleSendMessage = async (chatId: string, text: string, attachments?: { id: string; dataUrl: string; name: string }[], replyTo?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!identity) {
      logger.warn('[PILIGRIM] handleSendMessage: identity РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚, СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ РѕС‚РїСЂР°РІР»РµРЅРѕ');
      return;
    }

    // 1. РС‰РµРј РєРѕРЅС‚Р°РєС‚, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РµРіРѕ publicKey
    const contact = contacts.find((c) => c.id === chatId || c.uid === chatId);

    // 2. РЁРёС„СЂСѓРµРј, РµСЃР»Рё РµСЃС‚СЊ publicKey
    let encryptedPayload: string | undefined;
    let isEncrypted = false;
    // Phase 2: Signal (PFS Double Ratchet) preferred, NaCl fallback.
    // apiService.sendMessageSecure returns { type: 'signal' | 'nacl' } | null.
    // Old encryptAESGCM was only at-rest AES-GCM (secp256k1 privKey), no PFS.
    let encryptionType: 'signal' | 'nacl' | undefined;
    if (contact?.publicKey && ws.isConnected) {
      try {
        const msgId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const secureResult = await apiService.sendMessageSecure(
          contact.uid,
          trimmed,
          contact.publicKey,
          { id: msgId }
        );
        encryptionType = secureResult?.type;
        isEncrypted = !!encryptionType;
        if (encryptionType) {
          encryptedPayload = '[secure:' + encryptionType + ']';
        }
        logger.info(`[PILIGRIM] E2EE: ${encryptionType === 'signal' ? '🔒 Signal (PFS)' : encryptionType === 'nacl' ? '🔓 NaCl (legacy)' : '⚠️ plaintext'} для ${contact.name}`);
      } catch (error) {
        logger.error(`[PILIGRIM] E2EE: ошибка шифрования для ${contact.name}:`, error);
        // Fallback: отправляем в plaintext, но НЕ теряем сообщение
        if (contact?.publicKey && ws.isConnected) {
          try {
            apiService.sendMessage(contact.uid, trimmed, contact.publicKey);
          } catch (e) {
            logger.error('[PILIGRIM] plaintext fallback send failed', e);
          }
        }
      }
    } else if (!contact?.publicKey) {
      logger.warn(`[PILIGRIM] E2EE: publicKey отсутствует для chatId=${chatId}, будет NaCl/plaintext fallback`);
    } else if (!ws.isConnected) {
      logger.info(`[PILIGRIM] WS offline, message saved locally only (encryptionType deferred)`);
    }

    // 3. РЎРѕР·РґР°С‘Рј Message (text вЂ” РґР»СЏ Р»РѕРєР°Р»СЊРЅРѕРіРѕ UI, encryptedPayload вЂ” РґР»СЏ С…СЂР°РЅРµРЅРёСЏ/РїРµСЂРµРґР°С‡Рё)
    const newMessage: Message = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      text: trimmed,
      encryptedPayload,
      isEncrypted,
      senderId: identity.uid,
      timestamp: new Date().toISOString(),
                  status: 'sent',
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      replyTo
    };
    logger.info(`[PILIGRIM] handleSendMessage: chatId=${chatId}, len=${trimmed.length}, encrypted=${isEncrypted}`);
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

    // Stage 5: РµСЃР»Рё WebSocket РїРѕРґРєР»СЋС‡С‘РЅ вЂ” РѕС‚РїСЂР°РІР»СЏРµРј СЃРѕРѕР±С‰РµРЅРёРµ РїРѕР»СѓС‡Р°С‚РµР»СЋ С‡РµСЂРµР· СЃРµСЂРІРµСЂ.
    // apiService РёСЃРїРѕР»СЊР·СѓРµС‚ NaCl box (X25519+XSalsa20) РґР»СЏ С‚СЂР°РЅСЃРїРѕСЂС‚РЅРѕРіРѕ С€РёС„СЂРѕРІР°РЅРёСЏ.
    // Р•СЃР»Рё WS РЅРµРґРѕСЃС‚СѓРїРµРЅ вЂ” СЃРѕРѕР±С‰РµРЅРёРµ РѕСЃС‚Р°С‘С‚СЃСЏ С‚РѕР»СЊРєРѕ Р»РѕРєР°Р»СЊРЅРѕ (offline-first).
    // Phase 2: apiService.sendMessageSecure уже отправил зашифрованное сообщение через WS.
    // Здесь мы только обновляем encryptionType в чате для UI badge (🔒 PFS / 🔓 Legacy).
    if (encryptionType) {
      setChats((prev) => {
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
  // v3.0 Phase 3: удаление сообщения из чата
  const handleDeleteMessage = (chatId: string, messageId: string) => {
    logger.info('[PILIGRIM] handleDeleteMessage:', { chatId, messageId });
    setChats((prev) => {
      const updated = { ...prev };
      if (!updated[chatId]) return prev;
      updated[chatId] = {
        ...updated[chatId],
        messages: updated[chatId].messages.filter((m) => m.id !== messageId),
      };
      return updated;
    });
  };
  // v3.0 Phase 3: редактирование сообщения (локальное изменение текста)
  const handleEditMessage = (chatId: string, messageId: string, newText: string) => {
    logger.info('[PILIGRIM] handleEditMessage:', { chatId, messageId });
    setChats((prev) => {
      const updated = { ...prev };
      if (!updated[chatId]) return prev;
      updated[chatId] = {
        ...updated[chatId],
        messages: updated[chatId].messages.map((m) =>
          m.id === messageId ? { ...m, text: newText, status: 'sent' } : m
        ),
      };
      return updated;
    });
  };
  const handleLogout = () => {
    localStorage.removeItem('piligrim-identity');
    setIdentity(null);
  };

  // Phase 9.5 fix: СЃРЅР°С‡Р°Р»Р° РїРѕРєР°Р·С‹РІР°РµРј SeedPhraseModal, РїРѕС‚РѕРј identity
  if (showSeedModal && pendingIdentity?.seedPhrase) {
    return (
      <div>
        {identity && (
          <div className="min-h-screen bg-slate-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-4">рџЋ‰ Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ, {identity.username}!</h1>
            <p className="text-slate-400">Identity СЃРѕР·РґР°РЅР° СѓСЃРїРµС€РЅРѕ. Phase 9.5 minimal version.</p>
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
          const parsed = JSON.parse(saved);
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
        onLogin={handleCreateIdentity}
        onRestore={handleRestoreFromLoginPage}
      />
    );
  }

  // v3.0 Phase 2B-1: Responsive Layout Shell
  // 3 breakpoints: mobile (<=640), tablet (641-1024), desktop (>1024).
  // On RT9 (800x1280) -> tablet — two-column 30%/70% layout.
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', position: 'relative' }}>
{/* Batch 5: language switcher (left top corner) */}
      <div
        data-testid="language-switcher"
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          zIndex: 100,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <button
          type="button"
          onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
          data-testid="lang-toggle"
          title={language === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          aria-label="Change language"
          style={{
            padding: '4px 12px',
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
        </button>
      </div>
      {/* Stage 5: РёРЅРґРёРєР°С‚РѕСЂ СЃС‚Р°С‚СѓСЃР° WebSocket (РїСЂР°РІС‹Р№ РІРµСЂС…РЅРёР№ СѓРіРѕР») */}
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
          backgroundColor: wsStatus === 'open' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
          border: `1px solid ${wsStatus === 'open' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          borderRadius: '12px',
          color: wsStatus === 'open' ? 'var(--color-success)' : 'var(--color-danger)',
          fontSize: '11px',
          fontWeight: 600
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: wsStatus === 'open' ? 'var(--color-success)' : 'var(--color-danger)',
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
                onAddContact={handleAddContact}
                onCreateGroup={handleCreateGroup}
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
                const c = contacts.find((c) => c.id === selectedChatId || c.uid === selectedChatId);
                if (c) return c.name;
                const g = groups.find((g) => g.id === selectedChatId);
                if (g) return g.name;
                return undefined;
              })()}
              contactUid={selectedChatId || undefined}
              isOnline={wsStatus === 'open'}
              showBack={!!selectedChatId}
              onBackClick={() => setSelectedChatId(null)}
              onCallClick={() => {
                const target = contacts.find((c) => c.id === selectedChatId || c.uid === selectedChatId);
                if (target && target.uid) {
                  logger.info(`[PILIGRIM] Stage 6: audio call to ${target.name} (${target.uid})`);
                  webrtcHook.startCall(target.uid);
                } else {
                  alert('Contact not found or has no UID');
                }
              }}
              onVideoClick={() => logger.info('[PILIGRIM] Video call (Phase 2F)')}
              onMenuClick={() => setShowLogoutModal(true)}
              // v3.0 Phase 2H: клик по аватару/имени открывает 3rd profile panel
              onAvatarClick={() => setIsProfileOpen(true)}
            />
            {/* Scrollable content area */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {selectedChatId && chats[selectedChatId] ? (
                <ChatWindow
                  chatId={selectedChatId}
                  messages={chats[selectedChatId]?.messages || []}
                  onSendMessage={(text, attachments, replyTo) => handleSendMessage(selectedChatId, text, attachments, replyTo)}
                  partner={(() => {
                    const c = contacts.find((c) => c.id === selectedChatId);
                    if (c) return c;
                    const g = groups.find((g) => g.id === selectedChatId);
                    if (g) return { name: g.name };
                    return undefined;
                  })()}
                  currentUserUid={identity?.uid}
                  onDeleteMessage={(messageId) => handleDeleteMessage(selectedChatId, messageId)}
                  onEditMessage={(messageId, newText) => handleEditMessage(selectedChatId, messageId, newText)}
                  onStartCall={() => {
                    const target = contacts.find((c) => c.id === selectedChatId);
                    if (target && target.uid) {
                      logger.info(`[PILIGRIM] Stage 6: starting call to ${target.name} (${target.uid})`);
                      webrtcHook.startCall(target.uid);
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
            <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-secondary)',
                  padding: '24px'
                }}>
                  <p style={{ fontSize: '1.125rem', margin: '0 0 8px' }} aria-label="Empty chat">
                    Добро пожаловать в PILIGRIM
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: '280px', textAlign: 'center', margin: '0 0 24px' }}>
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
                      cursor: 'pointer'
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
            onViewChange={(view) => {
              logger.info('[PILIGRIM] Tab changed to:', view);
              setActiveTab(view);
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
            onViewChange={setActiveTab}
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
            onViewChange={setActiveTab}
            onCompose={() => {
              window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
              logger.info('[PILIGRIM] Joystick compose clicked: requested AddContactModal open');
            }}
          />
        }
        // v3.0 Phase 2H: 3rd panel on desktop — открывается по клику на аватар в RightAppBar
        profilePanel={
          (() => {
            if (!isProfileOpen || !selectedChatId) return undefined;
            const partner = contacts.find((c) => c.id === selectedChatId || c.uid === selectedChatId);
            if (!partner) return undefined;
            return (
              <ProfilePanel
                contactName={partner.name}
                contactUid={partner.uid}
                isOnline={wsStatus === 'open'}
                onCall={() => logger.info('[PILIGRIM] Profile: Call (WebRTC Phase 6)')}
                onVideo={() => logger.info('[PILIGRIM] Profile: Video (WebRTC Phase 6)')}
                onSearch={() => setIsSearchOpen(true)}
                onClose={() => setIsProfileOpen(false)}
              />
            );
          })()
        }
      />
      )}

      {/* v3.0 Phase 2C: вкладка Звонки — CallsHistoryView с demo данными */}
      {activeTab === 'calls' && (
        <CallsHistoryView onViewChange={setActiveTab} />
      )}

      {/* v3.0 Phase 2C: вкладка Избранное — только verified контакты */}
      {activeTab === 'favorites' && (
        <FavoritesView
          contacts={contacts}
          onSelectContact={(uid) => {
            setActiveTab('chats');
            handleSelectChat(uid);
          }}
          onViewChange={setActiveTab}
        />
      )}

      {/* Telegram-like: вкладка Каналы */}
      {activeTab === 'channels' && (
        <ChannelsView />
      )}

      {/* Batch 4: РјРѕРґР°Р»РєР° РІРµСЂРёС„РёРєР°С†РёРё РєРѕРЅС‚Р°РєС‚Р° */}
      {showVerifyModal && selectedChatId && (() => {
        const partner = contacts.find((c) => c.id === selectedChatId || c.uid === selectedChatId);
        return (
          <VerifyModal
            partnerName={partner?.name || 'РљРѕРЅС‚Р°РєС‚'}
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
        onNavigate={(view) => setActiveTab(view)}
        onOpenAccount={() => {
          setIsDrawerOpen(false);
          setShowAccountPage(true);
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
            e2eeStatus: identity.isBIP39 ? 'verified' : 'pending',
          }}
          onBack={() => setShowAccountPage(false)}
          onLogout={() => {
            setShowAccountPage(false);
            setShowLogoutModal(true);
          }}
          onBackupSeed={() => {
            setShowAccountPage(false);
            setShowSeedModal(true);
          }}
        />
      )}

      {/* v3.0 Phase 2E: Search command palette (Ctrl+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        contacts={searchableContacts}
        onSelect={(uid) => {
          setIsSearchOpen(false);
          setActiveTab('chats');
          setSelectedChatId(uid);
        }}
      />

      {/* v3.0 Logout: модалка подтверждения выхода (вызывается из RightAppBar ⋮) */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        identityUid={identity?.uid}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />

      {/* v3.0 Phase 1: theme indicator (правый нижний угол) */}
      <div
        data-testid="theme-indicator"
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          padding: '4px 10px',
          backgroundColor: 'var(--color-bg-elevated)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-surface)',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)'
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
            const target = contacts.find((c) => c.uid === webrtcHook.currentCallUid);
            return target?.name || 'Контакт';
          })()}
          partnerUid={webrtcHook.currentCallUid || ''}
          localStream={webrtcHook.localStream}
          remoteStream={webrtcHook.remoteStream}
          onAccept={webrtcHook.answerCall}
          onDecline={webrtcHook.rejectCall}
          onEnd={webrtcHook.endCall}
          onStartCall={() => {
            const target = contacts.find((c) => c.uid === webrtcHook.currentCallUid);
            if (target && target.uid) {
              webrtcHook.startCall(target.uid);
            }
          }}
          onToggleMute={webrtcHook.toggleAudio}
          onToggleVideo={webrtcHook.toggleVideo}
          onStartScreenShare={webrtcHook.toggleScreenShare}
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

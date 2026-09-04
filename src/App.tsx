// v1.5.2 Stage 5: WebSocket real-time для зашифрованных сообщений
// Цель: доставка входящих сообщений от других клиентов + индикатор статуса подключения
import React, { useState, useEffect, useMemo } from 'react';
import CreateIdentity from './components/CreateIdentity';
import SeedPhraseModal from './components/SeedPhraseModal';
import { RestoreIdentity } from './components/RestoreIdentity';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import VerifyModal from './components/VerifyModal';
import Toasts from './components/Toast';
import FeaturesList from './components/FeaturesList';
import { useTranslation } from './contexts/LanguageContext';
import { useToasts } from './hooks/useToasts';
import { generateIdentity, encrypt } from './services/cryptoService';
import { apiService } from './services/apiService';
import { useWebSocket } from './hooks/useWebSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { useTimeTheme } from './hooks/useTimeTheme';
import { ResponsiveShell } from './components/ResponsiveShell';
import { LeftAppBar } from './components/LeftAppBar';
import { RightAppBar } from './components/RightAppBar';
import { TabletTabBar, type TabView } from './components/TabletTabBar';
import { FloatingActionButton } from './components/FloatingActionButton';
import { useLogout } from './hooks/useLogout';
import { ConfirmLogoutModal } from './components/ConfirmLogoutModal';
import { CallsHistoryView } from './components/CallsHistoryView';
import { FavoritesView } from './components/FavoritesView';
import { Drawer } from './components/Drawer';
import { SearchModal } from './components/SearchModal';
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
  // v3.0 Restore Identity: переключатель между Create и Restore screens
  const [authView, setAuthView] = useState<'create' | 'restore'>('create');
  // v3.0 Phase 2B-3: активная вкладка TabletTabBar (chats/contacts/calls/favorites)
  const [activeTab, setActiveTab] = useState<TabView>('chats');
  // v3.0 Logout: модалка подтверждения выхода из аккаунта
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // v3.0 Phase 2D: Drawer (боковая штора профиля)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // v3.0 Phase 2E: Search modal (Ctrl+K command palette)
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
  const [showFeatures, setShowFeatures] = useState(false);
  // v1.6 Batch 4: toast-СѓРІРµРґРѕРјР»РµРЅРёСЏ (РѕР±СЉСЏРІР»РµРЅС‹ СЂР°РЅСЊС€Рµ handlers, С‡С‚РѕР±С‹ РёС… РјРѕР¶РЅРѕ Р±С‹Р»Рѕ РІС‹Р·С‹РІР°С‚СЊ)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // v3.0 Phase 2E: search index - контакты + последние сообщения для command palette
  const searchableContacts = useMemo(() => contacts.map((c) => ({
    uid: c.uid,
    name: c.name,
    lastMessage: chats[c.uid]?.messages?.slice(-1)[0]?.text,
  })), [contacts, chats]);

  // v1.5.2 Stage 2: Р·Р°РіСЂСѓР·РєР° РєРѕРЅС‚Р°РєС‚РѕРІ, РіСЂСѓРїРї Рё С‡Р°С‚РѕРІ РёР· localStorage РїРѕСЃР»Рµ РјРѕРЅС‚РёСЂРѕРІР°РЅРёСЏ
  useEffect(() => {
    console.log('[PILIGRIM] App mounted (v1.5.2 Stage 2 вЂ” AddContact enabled)');
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
      console.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ contacts:', e);
    }
  }, [contacts]);

  // v1.5.2 Stage 2: Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ groups РІ localStorage РїСЂРё РєР°Р¶РґРѕРј РёР·РјРµРЅРµРЅРёРё
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-groups', JSON.stringify(groups));
    } catch (e) {
      console.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ groups:', e);
    }
  }, [groups]);

  // v1.5.2 Stage 2: Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ chats РІ localStorage РїСЂРё РєР°Р¶РґРѕРј РёР·РјРµРЅРµРЅРёРё
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-chats', JSON.stringify(chats));
    } catch (e) {
      console.error('[PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ chats:', e);
    }
  }, [chats]);

  const handleCreateIdentity = async () => {
    console.log('рџљЂ [PILIGRIM] START: handleCreateIdentity РІС‹Р·РІР°РЅ');
    try {
      console.log('рџ”‘ [PILIGRIM] РЁР°Рі 1: generateIdentity()...');
      const startTime = Date.now();
      const newIdentity = await generateIdentity();
      console.log(`вњ… [PILIGRIM] generateIdentity() Р·Р°РІРµСЂС€РµРЅ Р·Р° ${Date.now() - startTime}ms`);

      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      console.log('рџЋ­ [PILIGRIM] setShowSeedModal(true) РІС‹РїРѕР»РЅРµРЅ');

      apiService.register(newIdentity.uid, newIdentity.publicKey)
        .then(() => console.log('вњ… [PILIGRIM] register success'))
        .catch((err: any) => console.warn('вљ пёЏ [PILIGRIM] register failed (ignored):', err?.message || err));
    } catch (error) {
      console.error('вќЊ [PILIGRIM] РћС€РёР±РєР° РІ handleCreateIdentity:', error);
    }
  };

  const handleSeedConfirmed = () => {
    console.log('вњ… [PILIGRIM] Seed phrase РїРѕРґС‚РІРµСЂР¶РґРµРЅР°, СЃРѕС…СЂР°РЅСЏРµРј Identity');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
        setPendingIdentity(null);
        setShowSeedModal(false);
      } catch (e) {
        console.error('вќЊ [PILIGRIM] РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ identity:', e);
      }
    }
  };

  const handleSeedSkip = () => {
    console.log('вЏ­пёЏ [PILIGRIM] Seed phrase РїСЂРѕРїСѓС‰РµРЅР°');
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
  const handleAddContact = (name: string, uid: string, publicKey?: string) => {
    console.log('вћ• [PILIGRIM] handleAddContact:', name, uid, publicKey ? '(with pubKey)' : '(no pubKey)');

    // Р—Р°С‰РёС‚Р° РѕС‚ РґСѓР±Р»РёРєР°С‚РѕРІ: РµСЃР»Рё РєРѕРЅС‚Р°РєС‚ СЃ С‚Р°РєРёРј uid СѓР¶Рµ РµСЃС‚СЊ, РЅРµ РґРѕР±Р°РІР»СЏРµРј
    if (contacts.some(c => c.uid === uid)) {
      console.warn('вљ пёЏ [PILIGRIM] РљРѕРЅС‚Р°РєС‚ СЃ uid', uid, 'СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚');
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

    console.log('вњ… [PILIGRIM] РљРѕРЅС‚Р°РєС‚ РґРѕР±Р°РІР»РµРЅ:', newContact);
  };
  const handleCreateGroup = (_name: string, _type: 'public' | 'private') => {
    console.log('[PILIGRIM] handleCreateGroup stub');
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
    console.log(`рџ”‡ [PILIGRIM] handleMuteChat: chatId=${chatId}, duration=${duration === 'forever' ? 'forever' : duration === null ? 'unmute' : `${duration}ms`}, until=${mutedUntil ?? 'unmuted'}`);
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
    console.log(`рџ“Ѓ [PILIGRIM] handleArchiveChat: chatId=${chatId}, archive=${archive}`);
  };
  const handleOpenProfile = () => console.log('[PILIGRIM] handleOpenProfile stub');
  const handleOpenStore = () => console.log('[PILIGRIM] handleOpenStore stub');
  const handleOpenBoards = () => console.log('[PILIGRIM] handleOpenBoards stub');

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
    console.log(`вњ… [PILIGRIM] handleVerifyContact: chatId=${chatId} marked as verified`);
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
      console.log(`рџ“© [PILIGRIM] WS: incoming message from ${incomingMessage.senderId}, chatId=${incomingMessage.groupId ?? 'dm'}`);
      const chatId = incomingMessage.groupId || incomingMessage.senderId;
      setChats((prev) => {
        const updated = { ...prev };
        if (!updated[chatId]) {
          updated[chatId] = { contactId: chatId, messages: [] };
        }
        // Р—Р°С‰РёС‚Р° РѕС‚ РґСѓР±Р»РёРєР°С‚РѕРІ (РЅР° СЃР»СѓС‡Р°Р№ re-connect)
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

  // v1.5.2 Stage 6: WebRTC hook вЂ” РґР»СЏ Р·РІРѕРЅРєРѕРІ Рё РґРµРјРѕРЅСЃС‚СЂР°С†РёРё СЌРєСЂР°РЅР°.
  const webrtcHook = useWebRTC(identity?.uid || '');
  // v3.0 Phase 1: time-based theme (morning/day/evening/night)
  const theme = useTimeTheme();

  const handleSelectChat = (id: string) => {
    console.log('[PILIGRIM] handleSelectChat:', id);
    setSelectedChatId(id);
  };
  // v1.5.2 Stage 4: handleSendMessage вЂ” С€РёС„СЂСѓРµС‚ СЃРѕРѕР±С‰РµРЅРёРµ РїСѓР±Р»РёС‡РЅС‹Рј РєР»СЋС‡РѕРј РєРѕРЅС‚Р°РєС‚Р°
  // (RSA-OAEP) РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј РІ localStorage. Р•СЃР»Рё publicKey РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ вЂ”
  // РѕС‚РїСЂР°РІР»СЏРµРј РІ plaintext СЃ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµРј (graceful fallback РґР»СЏ UX).
  const handleSendMessage = async (chatId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!identity) {
      console.warn('[PILIGRIM] handleSendMessage: identity РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚, СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ РѕС‚РїСЂР°РІР»РµРЅРѕ');
      return;
    }

    // 1. РС‰РµРј РєРѕРЅС‚Р°РєС‚, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РµРіРѕ publicKey
    const contact = contacts.find((c) => c.id === chatId || c.uid === chatId);

    // 2. РЁРёС„СЂСѓРµРј, РµСЃР»Рё РµСЃС‚СЊ publicKey
    let encryptedPayload: string | undefined;
    let isEncrypted = false;
    if (contact?.publicKey) {
      try {
        encryptedPayload = await encrypt(trimmed, contact.publicKey);
        isEncrypted = true;
        console.log(`рџ”’ [PILIGRIM] E2EE: Р·Р°С€РёС„СЂРѕРІР°РЅРѕ РґР»СЏ ${contact.name} (chatId=${chatId}, ciphertext_len=${encryptedPayload.length})`);
      } catch (error) {
        console.error(`вќЊ [PILIGRIM] E2EE: РѕС€РёР±РєР° С€РёС„СЂРѕРІР°РЅРёСЏ РґР»СЏ ${contact.name}:`, error);
        // Fallback: СЃРѕС…СЂР°РЅСЏРµРј РІ plaintext, РЅРѕ РќР• С‚РµСЂСЏРµРј СЃРѕРѕР±С‰РµРЅРёРµ
      }
    } else {
      console.warn(`вљ пёЏ [PILIGRIM] E2EE: publicKey РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ РґР»СЏ chatId=${chatId}, СЃРѕРѕР±С‰РµРЅРёРµ Р±СѓРґРµС‚ СЃРѕС…СЂР°РЅРµРЅРѕ РІ plaintext`);
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

    // Stage 5: РµСЃР»Рё WebSocket РїРѕРґРєР»СЋС‡С‘РЅ вЂ” РѕС‚РїСЂР°РІР»СЏРµРј СЃРѕРѕР±С‰РµРЅРёРµ РїРѕР»СѓС‡Р°С‚РµР»СЋ С‡РµСЂРµР· СЃРµСЂРІРµСЂ.
    // apiService РёСЃРїРѕР»СЊР·СѓРµС‚ NaCl box (X25519+XSalsa20) РґР»СЏ С‚СЂР°РЅСЃРїРѕСЂС‚РЅРѕРіРѕ С€РёС„СЂРѕРІР°РЅРёСЏ.
    // Р•СЃР»Рё WS РЅРµРґРѕСЃС‚СѓРїРµРЅ вЂ” СЃРѕРѕР±С‰РµРЅРёРµ РѕСЃС‚Р°С‘С‚СЃСЏ С‚РѕР»СЊРєРѕ Р»РѕРєР°Р»СЊРЅРѕ (offline-first).
    if (ws.isConnected) {
      try {
        ws.send(contact?.uid || chatId, trimmed, contact?.publicKey);
        console.log(`рџ“Ў [PILIGRIM] WS: message dispatched to ${contact?.name || chatId}`);
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

  if (!identity) {
    // v3.0 Restore Identity: выбор между созданием новой личности и восстановлением
    if (authView === 'restore') {
      return (
        <RestoreIdentity
          onRestore={(restoredIdentity: Identity) => {
            console.log('[PILIGRIM] Identity restored from seed phrase, uid=', restoredIdentity.uid);
            try {
              localStorage.setItem('piligrim-identity', JSON.stringify(restoredIdentity));
            } catch (e) {
              console.error('[PILIGRIM] Failed to save restored identity to localStorage:', e);
            }
            setIdentity(restoredIdentity);
            setAuthView('create');
          }}
          onBack={() => setAuthView('create')}
        />
      );
    }
    return (
      <CreateIdentity
        onCreateIdentity={handleCreateIdentity}
        onRestore={() => setAuthView('restore')}
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
            backgroundColor: '#334155',
            color: '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
        </button>
        <button
          type="button"
          onClick={() => setShowFeatures(!showFeatures)}
          data-testid="features-toggle"
          title="Show available features"
          aria-label="Show features"
          style={{
            padding: '4px 10px',
            backgroundColor: showFeatures ? '#3b82f6' : '#334155',
            color: '#ffffff',
            border: '1px solid #475569',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ✨ {language === 'ru' ? 'Что умеет?' : 'Features'}
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
                  console.log(`[PILIGRIM] Stage 6: audio call to ${target.name} (${target.uid})`);
                  webrtcHook.startCall(target.uid);
                } else {
                  alert('Contact not found or has no UID');
                }
              }}
              onVideoClick={() => console.log('[PILIGRIM] Video call (Phase 2F)')}
              onMenuClick={() => setShowLogoutModal(true)}
            />
            {/* Scrollable content area */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {selectedChatId && chats[selectedChatId] ? (
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
                      console.log(`[PILIGRIM] Stage 6: starting call to ${target.name} (${target.uid})`);
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
                    Welcome to PILIGRIM
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: '280px', textAlign: 'center', margin: '0 0 24px' }}>
                    Select a contact on the left or add a new one with <strong>+</strong>
                  </p>
                  <button
                    onClick={handleLogout}
                    aria-label="Logout"
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(220, 38, 38, 0.8)',
                      color: 'white',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Logout
                  </button>

                  {showFeatures && (
                    <FeaturesList lang={language} />
                  )}
                </div>
              )}
            </div>
          </div>
        }
        tabBar={
          <TabletTabBar
            activeView={activeTab}
            onViewChange={(view) => {
              console.log('[PILIGRIM] Tab changed to:', view);
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
              console.log('[PILIGRIM] FAB clicked: requested AddContactModal open');
            }}
          />
        }
      />
      )}

      {/* v3.0 Phase 2C: вкладка Контакты — полноэкранный ContactList */}
      {activeTab === 'contacts' && (
        <div data-testid="contacts-tab-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-bg-primary)' } as React.CSSProperties}>
          <LeftAppBar
            title="Контакты"
            onMenuClick={() => console.log('[PILIGRIM] Drawer (Phase 2D)')}
            onSearchClick={() => setIsSearchOpen(true)}
          />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 } as React.CSSProperties}>
            <ContactList
              identity={identity}
              contacts={contacts}
              groups={groups}
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={(id) => { setActiveTab('chats'); handleSelectChat(id); }}
              onAddContact={handleAddContact}
              onCreateGroup={handleCreateGroup}
              onMuteChat={handleMuteChat}
              onArchiveChat={handleArchiveChat}
              onOpenProfile={handleOpenProfile}
              onOpenStore={handleOpenStore}
              onOpenBoards={handleOpenBoards}
            />
          </div>
          <TabletTabBar activeView={activeTab} onViewChange={setActiveTab} />
        </div>
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

      {/* Batch 4: РјРѕРґР°Р»РєР° РІРµСЂРёС„РёРєР°С†РёРё РєРѕРЅС‚Р°РєС‚Р° */}
      {showVerifyModal && selectedChatId && (() => {
        const partner = contacts.find((c) => c.id === selectedChatId || c.uid === selectedChatId);
        return (
          <VerifyModal
            partnerName={partner?.name || 'РљРѕРЅС‚Р°РєС‚'}
            partnerPublicKey={partner?.publicKey}
            myPublicKey={identity?.publicKey}
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
        onLogout={() => {
          setIsDrawerOpen(false);
          setShowLogoutModal(true);
        }}
      />

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
    </div>
  );
};

export default App;
import { logger } from './services/logger';
/* App.tsx updated for Telegram-style tablet layout */
я╗┐// v1.5.2 Stage 5: WebSocket real-time ╨┤╨╗╤П ╨╖╨░╤И╨╕╤Д╤А╨╛╨▓╨░╨╜╨╜╤Л╤Е ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╨╣
// ╨ж╨╡╨╗╤М: ╨┤╨╛╤Б╤В╨░╨▓╨║╨░ ╨▓╤Е╨╛╨┤╤П╤Й╨╕╤Е ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╨╣ ╨╛╤В ╨┤╤А╤Г╨│╨╕╤Е ╨║╨╗╨╕╨╡╨╜╤В╨╛╨▓ + ╨╕╨╜╨┤╨╕╨║╨░╤В╨╛╤А ╤Б╤В╨░╤В╤Г╤Б╨░ ╨┐╨╛╨┤╨║╨╗╤О╤З╨╡╨╜╨╕╤П
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
import { generateIdentity, restoreIdentityFromSeed, getPublicKey, encryptFile, getPrivateKey } from './services/cryptoService';
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
import type { Contact, Group, Chat, Message, Identity, IdentityType, EncryptedAttachment } from './types';
// Phase 2: Signal Protocol тАФ PFS via Double Ratchet.
// handleSendMessage ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╤В apiService.sendMessageSecure (Signal preferred, NaCl fallback).
// handleAddContact ╨╕╨╜╨╕╤Ж╨╕╨░╨╗╨╕╨╖╨╕╤А╤Г╨╡╤В Signal ╤Б╨╡╤Б╤Б╨╕╤О ╤З╨╡╤А╨╡╨╖ SignalProtocolManager.initSessionWithPreKeyBundle.
import { SignalProtocolManager } from './crypto/signal/SignalProtocolManager';
import { PreKeyManager } from './crypto/signal/PreKeyManager';
// FIX 2026-09-10: bundleToPreKeyBundle ╤Г╨┤╨░╨╗╤С╨╜ тАФ ╨╜╨╡ ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╤В╤Б╤П ╨▓ App.tsx
// (╨╛╨╜ ╨╜╤Г╨╢╨╡╨╜ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ SignalMessageLayer.ts ╨┤╨╗╤П ╨▓╨╜╤Г╤В╤А╨╡╨╜╨╜╨╡╨│╨╛ conversion).

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
  // v3.0 Phase 2B-3: ╨░╨║╤В╨╕╨▓╨╜╨░╤П ╨▓╨║╨╗╨░╨┤╨║╨░ TabletTabBar (chats/contacts/calls/favorites)
  const [activeTab, setActiveTab] = useState<TabView>('chats');
  // v3.0 Logout: ╨╝╨╛╨┤╨░╨╗╨║╨░ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╤П ╨▓╤Л╤Е╨╛╨┤╨░ ╨╕╨╖ ╨░╨║╨║╨░╤Г╨╜╤В╨░
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // v3.0 Phase 2D: Drawer (╨▒╨╛╨║╨╛╨▓╨░╤П ╤И╤В╨╛╤А╨░ ╨┐╤А╨╛╤Д╨╕╨╗╤П)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // v3.0 Phase 2E: Search modal (Ctrl+K command palette)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // v3.0 Phase 2H: Profile panel (3rd desktop panel)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // v3.0 Security Dashboard: AccountPage (Security settings)
  const [showAccountPage, setShowAccountPage] = useState(false);
  // Phase 2: ╤Д╨╗╨░╨│ ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╕ ╤Б╨▓╨╛╨╡╨│╨╛ Signal pre-key bundle ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А.
  // ╨Т╤Л╤Б╤В╨░╨▓╨╗╤П╨╡╤В╤Б╤П ╨▓ true ╨┐╨╛╤Б╨╗╨╡ ╤Г╤Б╨┐╨╡╤И╨╜╨╛╨│╨╛ POST /keys/publish, ╤З╤В╨╛╨▒╤Л ╨╜╨╡ ╨┤╨╡╨╗╨░╤В╤М ╤Н╤В╨╛ ╨┐╨╛╨▓╤В╨╛╤А╨╜╨╛.
  const [preKeysPublished, setPreKeysPublished] = useState(false);

  // v3.0 Phase 2D: ╤Б╨╗╤Г╤И╨░╨╡╨╝ ╨║╨░╤Б╤В╨╛╨╝╨╜╨╛╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╨╡ ╨╛╤В CallsHistoryView/FavoritesView
  // ╨┤╨╗╤П ╨╛╤В╨║╤А╤Л╤В╨╕╤П Drawer ╤З╨╡╤А╨╡╨╖ window event (loose coupling)
  useEffect(() => {
    const handler = () => setIsDrawerOpen(true);
    window.addEventListener('piligrim:open-drawer', handler);
    return () => window.removeEventListener('piligrim:open-drawer', handler);
  }, []);

  // v3.0 Phase 2E: Ctrl+K (Cmd+K ╨╜╨░ Mac) hotkey ╨┤╨╗╤П command palette
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
  // v3.0 Logout: hook ╨┤╨╗╤П ╨╛╤З╨╕╤Б╤В╨║╨╕ identity + WebSocket + reload
  const logout = useLogout({ clearData: false });

  // v1.5.2 Stage 1: ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╡ ╤Б╨┐╨╕╤Б╨║╨╕ (╨▒╨╡╨╖ useLocalStorage, ╤З╤В╨╛╨▒╤Л ╨╜╨╡ ╨╜╨░╤А╤Г╤И╨░╤В╤М ╨┐╤А╨░╨▓╨╕╨╗╨░ ╤Е╤Г╨║╨╛╨▓)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  // v1.5.2 Stage 5: ╤Б╤В╨░╤В╤Г╤Б WebSocket ╨┤╨╗╤П UI-╨╕╨╜╨┤╨╕╨║╨░╤В╨╛╤А╨░ (Online/Offline/Reconnecting)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed' | 'error' | 'unsupported'>('closed');
  // v1.6 Batch 4: ╨а╤Ч╨а╤Х╨а╤Ф╨а┬░╨а┬╖╨бтА╣╨а╨Ж╨а┬░╨бтАЪ╨б╨К ╨а╤Ш╨а╤Х╨а╥С╨а┬░╨а┬╗╨а╤Ф╨б╤У ╨а╨Ж╨а┬╡╨б╨В╨а╤С╨бтАЮ╨а╤С╨а╤Ф╨а┬░╨бтАа╨а╤С╨а╤С ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ╨а┬░
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const { language, setLanguage } = useTranslation();
  // v1.6 Batch 4: toast-╨б╤У╨а╨Ж╨а┬╡╨а╥С╨а╤Х╨а╤Ш╨а┬╗╨а┬╡╨а╨Е╨а╤С╨б╨П (╨а╤Х╨а┬▒╨б╨Й╨б╨П╨а╨Ж╨а┬╗╨а┬╡╨а╨Е╨бтА╣ ╨б╨В╨а┬░╨а╨Е╨б╨К╨бтВм╨а┬╡ handlers, ╨бтАб╨бтАЪ╨а╤Х╨а┬▒╨бтА╣ ╨а╤С╨бтАж ╨а╤Ш╨а╤Х╨а┬╢╨а╨Е╨а╤Х ╨а┬▒╨бтА╣╨а┬╗╨а╤Х ╨а╨Ж╨бтА╣╨а┬╖╨бтА╣╨а╨Ж╨а┬░╨бтАЪ╨б╨К)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const searchableContacts = useMemo(() => contacts.map((c) => ({
    uid: c.uid,
    name: c.name,
    lastMessage: chats[c.uid]?.messages?.slice(-1)[0]?.text,
  })), [contacts, chats]);

  // v1.5.2 Stage 2: ╨а┬╖╨а┬░╨а╤Ц╨б╨В╨б╤У╨а┬╖╨а╤Ф╨а┬░ ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ╨а╤Х╨а╨Ж, ╨а╤Ц╨б╨В╨б╤У╨а╤Ч╨а╤Ч ╨а╤С ╨бтАб╨а┬░╨бтАЪ╨а╤Х╨а╨Ж ╨а╤С╨а┬╖ localStorage ╨а╤Ч╨а╤Х╨б╨Г╨а┬╗╨а┬╡ ╨а╤Ш╨а╤Х╨а╨Е╨бтАЪ╨а╤С╨б╨В╨а╤Х╨а╨Ж╨а┬░╨а╨Е╨а╤С╨б╨П
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

    logger.info('[PILIGRIM] App mounted (v1.5.2 Stage 2 ╨▓╨ВтАЭ AddContact enabled)');
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

  // v1.5.2 Stage 2: ╨а┬░╨а╨Ж╨бтАЪ╨а╤Х╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а┬╡ contacts ╨а╨Ж localStorage ╨а╤Ч╨б╨В╨а╤С ╨а╤Ф╨а┬░╨а┬╢╨а╥С╨а╤Х╨а╤Ш ╨а╤С╨а┬╖╨а╤Ш╨а┬╡╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а╤С
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-contacts', JSON.stringify(contacts));
    } catch (e) {
      logger.error('[PILIGRIM] ╨а╤Ы╨бтВм╨а╤С╨а┬▒╨а╤Ф╨а┬░ ╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨б╨П contacts:', e);
    }
  }, [contacts]);

  // v1.5.2 Stage 2: ╨а┬░╨а╨Ж╨бтАЪ╨а╤Х╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а┬╡ groups ╨а╨Ж localStorage ╨а╤Ч╨б╨В╨а╤С ╨а╤Ф╨а┬░╨а┬╢╨а╥С╨а╤Х╨а╤Ш ╨а╤С╨а┬╖╨а╤Ш╨а┬╡╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а╤С
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-groups', JSON.stringify(groups));
    } catch (e) {
      logger.error('[PILIGRIM] ╨а╤Ы╨бтВм╨а╤С╨а┬▒╨а╤Ф╨а┬░ ╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨б╨П groups:', e);
    }
  }, [groups]);

  // v1.5.2 Stage 2: ╨а┬░╨а╨Ж╨бтАЪ╨а╤Х╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а┬╡ chats ╨а╨Ж localStorage ╨а╤Ч╨б╨В╨а╤С ╨а╤Ф╨а┬░╨а┬╢╨а╥С╨а╤Х╨а╤Ш ╨а╤С╨а┬╖╨а╤Ш╨а┬╡╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а╤С
  useEffect(() => {
    try {
      localStorage.setItem('piligrim-chats', JSON.stringify(chats));
    } catch (e) {
      logger.error('[PILIGRIM] ╨а╤Ы╨бтВм╨а╤С╨а┬▒╨а╤Ф╨а┬░ ╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨б╨П chats:', e);
    }
  }, [chats]);
// Phase 2: ╨┐╨╛╤Б╨╗╨╡ ╨╕╨╜╨╕╤Ж╨╕╨░╨╗╨╕╨╖╨░╤Ж╨╕╨╕ identity тЖТ ╨│╨╡╨╜╨╡╤А╨╕╤А╤Г╨╡╨╝ Signal pre-keys
  // ╨╕ ╨┐╤Г╨▒╨╗╨╕╨║╤Г╨╡╨╝ ╤Б╨▓╨╛╨╣ pre-key bundle ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А ╨┤╨╗╤П ╨╕╨╜╨╕╤Ж╨╕╨░╤В╨╛╤А╨╛╨▓ ╤Б╨╡╤Б╤Б╨╕╨╣.
  // ╨н╤В╨╛╤В ╤И╨░╨│ ╨Ю╨С╨п╨Ч╨Р╨в╨Х╨Ы╨Х╨Э ╤З╤В╨╛╨▒╤Л ╤Б╨╛╨▒╨╡╤Б╨╡╨┤╨╜╨╕╨║╨╕ ╨╝╨╛╨│╨╗╨╕ ╨╕╨╜╨╕╤Ж╨╕╨░╨╗╨╕╨╖╨╕╤А╨╛╨▓╨░╤В╤М Signal ╤Б╨╡╤Б╤Б╨╕╤О ╤Б ╨╜╨░╨╝╨╕.
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
    logger.info('╤А╤Я╤Щ╨В [PILIGRIM] START: handleCreateIdentity ╨а╨Ж╨бтА╣╨а┬╖╨а╨Ж╨а┬░╨а╨Е');
    try {
      logger.info('╤А╤ЯтАЭтАШ [PILIGRIM] ╨а╨Б╨а┬░╨а╤Ц 1: generateIdentity()...');
      const startTime = Date.now();
      const newIdentity = await generateIdentity();
      logger.info(`╨▓╤ЪтАж [PILIGRIM] generateIdentity() ╨а┬╖╨а┬░╨а╨Ж╨а┬╡╨б╨В╨бтВм╨а┬╡╨а╨Е ╨а┬╖╨а┬░ ${Date.now() - startTime}ms`);

      // Phase 1 fix: generate and persist transport NaCl box keys for E2EE
      apiService.initKeys(newIdentity.uid);
      newIdentity.transportPublicKey = apiService.getTransportPublicKey();

      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      logger.info('╤А╤Я╨Л┬н [PILIGRIM] setShowSeedModal(true) ╨а╨Ж╨бтА╣╨а╤Ч╨а╤Х╨а┬╗╨а╨Е╨а┬╡╨а╨Е');

      apiService.register(newIdentity.uid, apiService.getTransportPublicKey())
        .then(() => logger.info('╨▓╤ЪтАж [PILIGRIM] register success'))
        .catch((err: any) => logger.warn('╨▓╤Щ┬а╨┐╤С╨П [PILIGRIM] register failed (ignored):', err?.message || err));
    } catch (error) {
      logger.error('╨▓╤Ь╨К [PILIGRIM] ╨а╤Ы╨бтВм╨а╤С╨а┬▒╨а╤Ф╨а┬░ ╨а╨Ж handleCreateIdentity:', error);
    }
  };

  const handleSeedConfirmed = () => {
    logger.info('╨▓╤ЪтАж [PILIGRIM] Seed phrase ╨а╤Ч╨а╤Х╨а╥С╨бтАЪ╨а╨Ж╨а┬╡╨б╨В╨а┬╢╨а╥С╨а┬╡╨а╨Е╨а┬░, ╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨б╨П╨а┬╡╨а╤Ш Identity');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
        setPendingIdentity(null);
        setShowSeedModal(false);
      } catch (e) {
        logger.error('╨▓╤Ь╨К [PILIGRIM] ╨а╤Ы╨бтВм╨а╤С╨а┬▒╨а╤Ф╨а┬░ ╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨б╨П identity:', e);
      }
    }
  };

  const handleSeedSkip = () => {
    logger.info('╨▓╨П┬н╨┐╤С╨П [PILIGRIM] Seed phrase ╨а╤Ч╨б╨В╨а╤Х╨а╤Ч╨б╤У╨бтА░╨а┬╡╨а╨Е╨а┬░');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
      } catch {}
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  // v1.5.2 Stage 2: ╨б╨В╨а┬╡╨а┬░╨а┬╗╨б╨К╨а╨Е╨бтА╣╨атДЦ ╨а╤Х╨а┬▒╨б╨В╨а┬░╨а┬▒╨а╤Х╨бтАЪ╨бтАб╨а╤С╨а╤Ф ╨а╥С╨а╤Х╨а┬▒╨а┬░╨а╨Ж╨а┬╗╨а┬╡╨а╨Е╨а╤С╨б╨П ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ╨а┬░ (offline-first)
  const handleAddContact = async (name: string, uid: string, publicKey?: string) => {
    logger.info('╨▓╤ЫтАв [PILIGRIM] handleAddContact:', name, uid, publicKey ? '(with pubKey)' : '(no pubKey)');

    // ╨атАФ╨а┬░╨бтА░╨а╤С╨бтАЪ╨а┬░ ╨а╤Х╨бтАЪ ╨а╥С╨б╤У╨а┬▒╨а┬╗╨а╤С╨а╤Ф╨а┬░╨бтАЪ╨а╤Х╨а╨Ж: ╨а┬╡╨б╨Г╨а┬╗╨а╤С ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ ╨б╨Г ╨бтАЪ╨а┬░╨а╤Ф╨а╤С╨а╤Ш uid ╨б╤У╨а┬╢╨а┬╡ ╨а┬╡╨б╨Г╨бтАЪ╨б╨К, ╨а╨Е╨а┬╡ ╨а╥С╨а╤Х╨а┬▒╨а┬░╨а╨Ж╨а┬╗╨б╨П╨а┬╡╨а╤Ш
    if (contacts.some(c => c.uid === uid)) {
      logger.warn('╨▓╤Щ┬а╨┐╤С╨П [PILIGRIM] ╨а╤Щ╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ ╨б╨Г uid', uid, '╨б╤У╨а┬╢╨а┬╡ ╨б╨Г╨б╤У╨бтА░╨а┬╡╨б╨Г╨бтАЪ╨а╨Ж╨б╤У╨а┬╡╨бтАЪ');
      alert(`╨а╤Щ╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ "${name}" ╨б╤У╨а┬╢╨а┬╡ ╨а╥С╨а╤Х╨а┬▒╨а┬░╨а╨Ж╨а┬╗╨а┬╡╨а╨Е ╨а╨Ж ╨а╨Ж╨а┬░╨бтВм ╨б╨Г╨а╤Ч╨а╤С╨б╨Г╨а╤Х╨а╤Ф.`);
      return;
    }

    const newContact: Contact = {
      id: uid, // ╨а╤С╨б╨Г╨а╤Ч╨а╤Х╨а┬╗╨б╨К╨а┬╖╨б╤У╨а┬╡╨а╤Ш uid ╨а╤Ф╨а┬░╨а╤Ф ╨а┬╗╨а╤Х╨а╤Ф╨а┬░╨а┬╗╨б╨К╨а╨Е╨бтА╣╨атДЦ id
      uid,
      name,
      verified: false,
      publicKey,
      archived: false,
      // mutedUntil ╨а╨Е╨а┬╡ ╨б╤У╨б╨Г╨бтАЪ╨а┬░╨а╨Е╨а┬░╨а╨Ж╨а┬╗╨а╤С╨а╨Ж╨а┬░╨а┬╡╨а╤Ш ╨▓╨ВтАЭ ╨бтАб╨а┬░╨бтАЪ ╨а╨Е╨а┬╡ ╨а┬╖╨а┬░╨а╤Ш╨б╨К╨б╨Л╨бтАб╨а┬╡╨а╨Е ╨а╤Ч╨а╤Х ╨б╤У╨а╤Ш╨а╤Х╨а┬╗╨бтАб╨а┬░╨а╨Е╨а╤С╨б╨Л
    };

    setContacts(prev => [...prev, newContact]);

    // ╨а╨О╨а╤Х╨а┬╖╨а╥С╨а┬░╨бтАШ╨а╤Ш ╨а╤Ч╨б╤У╨б╨Г╨бтАЪ╨а╤Х╨атДЦ ╨бтАб╨а┬░╨бтАЪ ╨а╥С╨а┬╗╨б╨П ╨а╨Е╨а╤Х╨а╨Ж╨а╤Х╨а╤Ц╨а╤Х ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ╨а┬░
    setChats(prev => ({
      ...prev,
      [uid]: {
        contactId: uid,
        messages: [],
        disappearTimer: undefined,
      },
    }));

    logger.info('╨▓╤ЪтАж [PILIGRIM] ╨а╤Щ╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ ╨а╥С╨а╤Х╨а┬▒╨а┬░╨а╨Ж╨а┬╗╨а┬╡╨а╨Е:', newContact);
// Phase 2: ╨┐╨╛╨┐╤Л╤В╨║╨░ ╨╕╨╜╨╕╤Ж╨╕╨░╨╗╨╕╨╖╨░╤Ж╨╕╨╕ Signal ╤Б╨╡╤Б╤Б╨╕╨╕ ╨▓ ╤Д╨╛╨╜╨╡.
    // ╨Э╨╡ ╨▒╨╗╨╛╨║╨╕╤А╤Г╨╡╨╝ UI тАФ ╨╡╤Б╨╗╨╕ ╤Г╨┐╨░╨┤╤С╤В, ╨╛╤Б╤В╨░╤С╤В╤Б╤П NaCl fallback.
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
        pushToast(`ЁЯФТ Signal PFS ╨░╨║╤В╨╕╨▓╨╕╤А╨╛╨▓╨░╨╜ ╤Б ${name}`, 'success');
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
      pushToast(`╨У╤А╤Г╨┐╨┐╨░ "${name}" ╤Б╨╛╨╖╨┤╨░╨╜╨░`, 'success');
      logger.info('[PILIGRIM] Group created:', result.id);
    } catch (err) {
      logger.error('[PILIGRIM] handleCreateGroup failed:', err);
      pushToast('╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╛╨╖╨┤╨░╨╜╨╕╤П ╨│╤А╤Г╨┐╨┐╤Л', 'error');
    }
  };
  // v1.6 Batch 4: handleMuteChat ╨▓╨ВтАЭ ╨а┬╖╨а┬░╨а╤Ц╨а┬╗╨б╤У╨бтВм╨а╤С╨бтАЪ╨б╨К ╨б╤У╨а╨Ж╨а┬╡╨а╥С╨а╤Х╨а╤Ш╨а┬╗╨а┬╡╨а╨Е╨а╤С╨б╨П ╨бтАб╨а┬░╨бтАЪ╨а┬░ ╨а╨Е╨а┬░ ╨а┬╖╨а┬░╨а╥С╨а┬░╨а╨Е╨а╨Е╨а╤Х╨а┬╡ ╨а╨Ж╨б╨В╨а┬╡╨а╤Ш╨б╨П
  // duration: number (╨а╤Ш╨б╨Г ╨а╥С╨а╤Х ╨а╤Ф╨а╤Х╨а╨Е╨бтАа╨а┬░) | 'forever' | null (null = ╨б╨Г╨а╨Е╨б╨П╨бтАЪ╨б╨К ╨а┬╖╨а┬░╨а╤Ц╨а┬╗╨б╤У╨бтВм╨а┬╡╨а╨Е╨а╤С╨а┬╡)
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
      pushToast('╨а┬з╨а┬░╨бтАЪ ╨а┬╖╨а┬░╨а╤Ц╨а┬╗╨б╤У╨бтВм╨бтАШ╨а╨Е ╨а╨Е╨а┬░╨а╨Ж╨б╨Г╨а┬╡╨а╤Ц╨а╥С╨а┬░', 'info');
    } else if (duration === null) {
      pushToast('╨атАФ╨а┬░╨а╤Ц╨а┬╗╨б╤У╨бтВм╨а┬╡╨а╨Е╨а╤С╨а┬╡ ╨б╨Г╨а╨Е╨б╨П╨бтАЪ╨а╤Х', 'success');
    } else {
      const hours = Math.round(duration / 3600000);
      pushToast(`╨а┬з╨а┬░╨бтАЪ ╨а┬╖╨а┬░╨а╤Ц╨а┬╗╨б╤У╨бтВм╨бтАШ╨а╨Е ╨а╨Е╨а┬░ ${hours} ╨бтАб`, 'info');
    }
    logger.info(`╤А╤ЯтАЭтАб [PILIGRIM] handleMuteChat: chatId=${chatId}, duration=${duration === 'forever' ? 'forever' : duration === null ? 'unmute' : `${duration}ms`}, until=${mutedUntil ?? 'unmuted'}`);
  };
  // v1.6 Batch 4: handleArchiveChat ╨▓╨ВтАЭ ╨а┬░╨б╨В╨бтАж╨а╤С╨а╨Ж╨а╤С╨б╨В╨а╤Х╨а╨Ж╨а┬░╨бтАЪ╨б╨К/╨б╨В╨а┬░╨а┬╖╨а┬░╨б╨В╨бтАж╨а╤С╨а╨Ж╨а╤С╨б╨В╨а╤Х╨а╨Ж╨а┬░╨бтАЪ╨б╨К ╨бтАб╨а┬░╨бтАЪ
  const handleArchiveChat = (chatId: string, archive: boolean) => {
    setChats((prev) => {
      const updated = { ...prev };
      const existing = updated[chatId] || { contactId: chatId, messages: [] };
      updated[chatId] = { ...existing, archived: archive };
      return updated;
    });
    pushToast(archive ? '╨а┬з╨а┬░╨бтАЪ ╨а┬░╨б╨В╨бтАж╨а╤С╨а╨Ж╨а╤С╨б╨В╨а╤Х╨а╨Ж╨а┬░╨а╨Е' : '╨а┬з╨а┬░╨бтАЪ ╨а╨Ж╨а╤Х╨б╨Г╨б╨Г╨бтАЪ╨а┬░╨а╨Е╨а╤Х╨а╨Ж╨а┬╗╨а┬╡╨а╨Е', 'success');
    logger.info(`╤А╤ЯтАЬ╨Г [PILIGRIM] handleArchiveChat: chatId=${chatId}, archive=${archive}`);
  };
  const handleOpenProfile = () => logger.info('[PILIGRIM] handleOpenProfile stub');
  const handleOpenStore = () => logger.info('[PILIGRIM] handleOpenStore stub');
  const handleOpenBoards = () => logger.info('[PILIGRIM] handleOpenBoards stub');

  // v1.6 Batch 4: handleVerifyContact ╨▓╨ВтАЭ ╨а╤Ч╨а╤Х╨а╤Ш╨а┬╡╨бтАЪ╨а╤С╨бтАЪ╨б╨К ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ ╨а╤Ф╨а┬░╨а╤Ф verified
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
    pushToast('╨а╤Щ╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ ╨а╤Ч╨а╤Х╨а╥С╨бтАЪ╨а╨Ж╨а┬╡╨б╨В╨а┬╢╨а╥С╨бтАШ╨а╨Е ╨▓╤ЪтАж', 'success');
    logger.info(`╨▓╤ЪтАж [PILIGRIM] handleVerifyContact: chatId=${chatId} marked as verified`);
  };

  // v1.5.2 Stage 5: WebSocket real-time ╨а╥С╨а┬╗╨б╨П ╨а╨Ж╨бтАж╨а╤Х╨а╥С╨б╨П╨бтА░╨а╤С╨бтАж ╨б╨Г╨а╤Х╨а╤Х╨а┬▒╨бтА░╨а┬╡╨а╨Е╨а╤С╨атДЦ.
  // ╨а┬Ш╨б╨Г╨а╤Ч╨а╤Х╨а┬╗╨б╨К╨а┬╖╨б╤У╨а┬╡╨бтАЪ apiService (NaCl box ╨а╥С╨а┬╗╨б╨П ╨бтАЪ╨б╨В╨а┬░╨а╨Е╨б╨Г╨а╤Ч╨а╤Х╨б╨В╨бтАЪ╨а┬░) + graceful degradation
  // ╨а╤Ч╨б╨В╨а╤С ╨а╨Е╨а┬╡╨а╥С╨а╤Х╨б╨Г╨бтАЪ╨б╤У╨а╤Ч╨а╨Е╨а╤Х╨б╨Г╨бтАЪ╨а╤С ╨а┬▒╨б╨М╨а╤Ф╨а┬╡╨а╨Е╨а╥С╨а┬░ (╨бтАЪ╨а╤Х╨а┬╗╨б╨К╨а╤Ф╨а╤Х localStorage).
  const ws = useWebSocket({
    myUid: identity?.uid || '',
    enabled: !!identity,
    onMessage: (incomingMessage) => {
      // incomingMessage ╨а╤Ч╨б╨В╨а╤С╨бтАж╨а╤Х╨а╥С╨а╤С╨бтАЪ ╨а╤Х╨бтАЪ apiService ╨б╤У╨а┬╢╨а┬╡ ╨б╨Г ╨б╨В╨а┬░╨б╨Г╨бтВм╨а╤С╨бтАЮ╨б╨В╨а╤Х╨а╨Ж╨а┬░╨а╨Е╨а╨Е╨бтА╣╨а╤Ш ╨бтАЪ╨а┬╡╨а╤Ф╨б╨Г╨бтАЪ╨а╤Х╨а╤Ш
      // (╨а┬╡╨б╨Г╨а┬╗╨а╤С NaCl box ╨а╤Ф╨а┬╗╨б╨Л╨бтАб╨а╤С ╨а┬▒╨бтА╣╨а┬╗╨а╤С ╨а╨Е╨а┬░╨б╨Г╨бтАЪ╨б╨В╨а╤Х╨а┬╡╨а╨Е╨бтА╣), ╨а╤С╨а╨Е╨а┬░╨бтАб╨а┬╡ ╨б╨Г raw text
      logger.info(`╤А╤ЯтАЬ┬й [PILIGRIM] WS: incoming message from ${incomingMessage.senderId}, chatId=${incomingMessage.groupId ?? 'dm'}`);
      const chatId = incomingMessage.groupId || incomingMessage.senderId;
      setChats((prev) => {
        const updated = { ...prev };
        if (!updated[chatId]) {
          updated[chatId] = { contactId: chatId, messages: [] };
        }
        // ╨атАФ╨а┬░╨бтА░╨а╤С╨бтАЪ╨а┬░ ╨а╤Х╨бтАЪ ╨а╥С╨б╤У╨а┬▒╨а┬╗╨а╤С╨а╤Ф╨а┬░╨бтАЪ╨а╤Х╨а╨Ж (╨а╨Е╨а┬░ ╨б╨Г╨а┬╗╨б╤У╨бтАб╨а┬░╨атДЦ re-connect)
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

  // v1.5.2 Stage 6: WebRTC hook ╨▓╨ВтАЭ ╨а╥С╨а┬╗╨б╨П ╨а┬╖╨а╨Ж╨а╤Х╨а╨Е╨а╤Ф╨а╤Х╨а╨Ж ╨а╤С ╨а╥С╨а┬╡╨а╤Ш╨а╤Х╨а╨Е╨б╨Г╨бтАЪ╨б╨В╨а┬░╨бтАа╨а╤С╨а╤С ╨б╨М╨а╤Ф╨б╨В╨а┬░╨а╨Е╨а┬░.
  const webrtcHook = useWebRTC(identity?.uid || '');
  // v3.0 Phase 1: time-based theme (morning/day/evening/night)
  const theme = useTimeTheme();

  const handleSelectChat = (id: string) => {
    logger.info('[PILIGRIM] handleSelectChat:', id);
    setSelectedChatId(id);
  };
  // v1.5.2 Stage 4: handleSendMessage ╨▓╨ВтАЭ ╨бтВм╨а╤С╨бтАЮ╨б╨В╨б╤У╨а┬╡╨бтАЪ ╨б╨Г╨а╤Х╨а╤Х╨а┬▒╨бтА░╨а┬╡╨а╨Е╨а╤С╨а┬╡ ╨а╤Ч╨б╤У╨а┬▒╨а┬╗╨а╤С╨бтАб╨а╨Е╨бтА╣╨а╤Ш ╨а╤Ф╨а┬╗╨б╨Л╨бтАб╨а╤Х╨а╤Ш ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ╨а┬░
  // (RSA-OAEP) ╨а╤Ч╨а┬╡╨б╨В╨а┬╡╨а╥С ╨б╨Г╨а╤Х╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨а┬╡╨а╤Ш ╨а╨Ж localStorage. ╨атАв╨б╨Г╨а┬╗╨а╤С publicKey ╨а╤Х╨бтАЪ╨б╨Г╨б╤У╨бтАЪ╨б╨Г╨бтАЪ╨а╨Ж╨б╤У╨а┬╡╨бтАЪ ╨▓╨ВтАЭ
  // ╨а╤Х╨бтАЪ╨а╤Ч╨б╨В╨а┬░╨а╨Ж╨а┬╗╨б╨П╨а┬╡╨а╤Ш ╨а╨Ж plaintext ╨б╨Г ╨а╤Ч╨б╨В╨а┬╡╨а╥С╨б╤У╨а╤Ч╨б╨В╨а┬╡╨а┬╢╨а╥С╨а┬╡╨а╨Е╨а╤С╨а┬╡╨а╤Ш (graceful fallback ╨а╥С╨а┬╗╨б╨П UX).
  const handleSendMessage = async (chatId: string, text: string, attachments?: { id: string; dataUrl: string; name: string }[], replyTo?: string, encryptedAttachments?: EncryptedAttachment[]) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!identity) {
      logger.warn('[PILIGRIM] handleSendMessage: identity ╨а╤Х╨бтАЪ╨б╨Г╨б╤У╨бтАЪ╨б╨Г╨бтАЪ╨а╨Ж╨б╤У╨а┬╡╨бтАЪ, ╨б╨Г╨а╤Х╨а╤Х╨а┬▒╨бтА░╨а┬╡╨а╨Е╨а╤С╨а┬╡ ╨а╨Е╨а┬╡ ╨а╤Х╨бтАЪ╨а╤Ч╨б╨В╨а┬░╨а╨Ж╨а┬╗╨а┬╡╨а╨Е╨а╤Х');
      return;
    }

    // 1. ╨а┬Ш╨бтА░╨а┬╡╨а╤Ш ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ, ╨бтАб╨бтАЪ╨а╤Х╨а┬▒╨бтА╣ ╨а╤Ч╨а╤Х╨а┬╗╨б╤У╨бтАб╨а╤С╨бтАЪ╨б╨К ╨а┬╡╨а╤Ц╨а╤Х publicKey
    const contact = contacts.find((c) => c.id === chatId || c.uid === chatId);

    // 2. ╨а╨Б╨а╤С╨бтАЮ╨б╨В╨б╤У╨а┬╡╨а╤Ш, ╨а┬╡╨б╨Г╨а┬╗╨а╤С ╨а┬╡╨б╨Г╨бтАЪ╨б╨К publicKey
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
          { id: msgId, encryptedAttachments: encryptedAttachments && encryptedAttachments.length > 0 ? encryptedAttachments : undefined }
        );
        encryptionType = secureResult?.type;
        isEncrypted = !!encryptionType;
        if (encryptionType) {
          encryptedPayload = '[secure:' + encryptionType + ']';
        }
        logger.info(`[PILIGRIM] E2EE: ${encryptionType === 'signal' ? 'ЁЯФТ Signal (PFS)' : encryptionType === 'nacl' ? 'ЁЯФУ NaCl (legacy)' : 'тЪая╕П plaintext'} ╨┤╨╗╤П ${contact.name}`);
      } catch (error) {
        logger.error(`[PILIGRIM] E2EE: ╨╛╤И╨╕╨▒╨║╨░ ╤И╨╕╤Д╤А╨╛╨▓╨░╨╜╨╕╤П ╨┤╨╗╤П ${contact.name}:`, error);
        // Fallback: ╨╛╤В╨┐╤А╨░╨▓╨╗╤П╨╡╨╝ ╨▓ plaintext, ╨╜╨╛ ╨Э╨Х ╤В╨╡╤А╤П╨╡╨╝ ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╨╡
        if (contact?.publicKey && ws.isConnected) {
          try {
            apiService.sendMessage(
              contact.uid,
              trimmed,
              contact.publicKey,
              { encryptedAttachments: encryptedAttachments && encryptedAttachments.length > 0 ? encryptedAttachments : undefined }
            );
          } catch (e) {
            logger.error('[PILIGRIM] plaintext fallback send failed', e);
          }
        }
      }
    } else if (!contact?.publicKey) {
      logger.warn(`[PILIGRIM] E2EE: publicKey ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╨╡╤В ╨┤╨╗╤П chatId=${chatId}, ╨▒╤Г╨┤╨╡╤В NaCl/plaintext fallback`);
    } else if (!ws.isConnected) {
      logger.info(`[PILIGRIM] WS offline, message saved locally only (encryptionType deferred)`);
    }

    // 3. ╨а╨О╨а╤Х╨а┬╖╨а╥С╨а┬░╨бтАШ╨а╤Ш Message (text ╨▓╨ВтАЭ ╨а╥С╨а┬╗╨б╨П ╨а┬╗╨а╤Х╨а╤Ф╨а┬░╨а┬╗╨б╨К╨а╨Е╨а╤Х╨а╤Ц╨а╤Х UI, encryptedPayload ╨▓╨ВтАЭ ╨а╥С╨а┬╗╨б╨П ╨бтАж╨б╨В╨а┬░╨а╨Е╨а┬╡╨а╨Е╨а╤С╨б╨П/╨а╤Ч╨а┬╡╨б╨В╨а┬╡╨а╥С╨а┬░╨бтАб╨а╤С)
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
      encryptedAttachments: encryptedAttachments && encryptedAttachments.length > 0 ? encryptedAttachments : undefined,
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

    // Stage 5: ╨а┬╡╨б╨Г╨а┬╗╨а╤С WebSocket ╨а╤Ч╨а╤Х╨а╥С╨а╤Ф╨а┬╗╨б╨Л╨бтАб╨бтАШ╨а╨Е ╨▓╨ВтАЭ ╨а╤Х╨бтАЪ╨а╤Ч╨б╨В╨а┬░╨а╨Ж╨а┬╗╨б╨П╨а┬╡╨а╤Ш ╨б╨Г╨а╤Х╨а╤Х╨а┬▒╨бтА░╨а┬╡╨а╨Е╨а╤С╨а┬╡ ╨а╤Ч╨а╤Х╨а┬╗╨б╤У╨бтАб╨а┬░╨бтАЪ╨а┬╡╨а┬╗╨б╨Л ╨бтАб╨а┬╡╨б╨В╨а┬╡╨а┬╖ ╨б╨Г╨а┬╡╨б╨В╨а╨Ж╨а┬╡╨б╨В.
    // apiService ╨а╤С╨б╨Г╨а╤Ч╨а╤Х╨а┬╗╨б╨К╨а┬╖╨б╤У╨а┬╡╨бтАЪ NaCl box (X25519+XSalsa20) ╨а╥С╨а┬╗╨б╨П ╨бтАЪ╨б╨В╨а┬░╨а╨Е╨б╨Г╨а╤Ч╨а╤Х╨б╨В╨бтАЪ╨а╨Е╨а╤Х╨а╤Ц╨а╤Х ╨бтВм╨а╤С╨бтАЮ╨б╨В╨а╤Х╨а╨Ж╨а┬░╨а╨Е╨а╤С╨б╨П.
    // ╨атАв╨б╨Г╨а┬╗╨а╤С WS ╨а╨Е╨а┬╡╨а╥С╨а╤Х╨б╨Г╨бтАЪ╨б╤У╨а╤Ч╨а┬╡╨а╨Е ╨▓╨ВтАЭ ╨б╨Г╨а╤Х╨а╤Х╨а┬▒╨бтА░╨а┬╡╨а╨Е╨а╤С╨а┬╡ ╨а╤Х╨б╨Г╨бтАЪ╨а┬░╨бтАШ╨бтАЪ╨б╨Г╨б╨П ╨бтАЪ╨а╤Х╨а┬╗╨б╨К╨а╤Ф╨а╤Х ╨а┬╗╨а╤Х╨а╤Ф╨а┬░╨а┬╗╨б╨К╨а╨Е╨а╤Х (offline-first).
    // Phase 2: apiService.sendMessageSecure ╤Г╨╢╨╡ ╨╛╤В╨┐╤А╨░╨▓╨╕╨╗ ╨╖╨░╤И╨╕╤Д╤А╨╛╨▓╨░╨╜╨╜╨╛╨╡ ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╨╡ ╤З╨╡╤А╨╡╨╖ WS.
    // ╨Ч╨┤╨╡╤Б╤М ╨╝╤Л ╤В╨╛╨╗╤М╨║╨╛ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╡╨╝ encryptionType ╨▓ ╤З╨░╤В╨╡ ╨┤╨╗╤П UI badge (ЁЯФТ PFS / ЁЯФУ Legacy).
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
  // v3.0 Phase 3: ╤Г╨┤╨░╨╗╨╡╨╜╨╕╨╡ ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╤П ╨╕╨╖ ╤З╨░╤В╨░
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
  // v3.0 Phase 3: ╤А╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╤П (╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨╡ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╡ ╤В╨╡╨║╤Б╤В╨░)
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

  // Phase 9.5 fix: ╨б╨Г╨а╨Е╨а┬░╨бтАб╨а┬░╨а┬╗╨а┬░ ╨а╤Ч╨а╤Х╨а╤Ф╨а┬░╨а┬╖╨бтА╣╨а╨Ж╨а┬░╨а┬╡╨а╤Ш SeedPhraseModal, ╨а╤Ч╨а╤Х╨бтАЪ╨а╤Х╨а╤Ш identity
  if (showSeedModal && pendingIdentity?.seedPhrase) {
    return (
      <div>
        {identity && (
          <div className="min-h-screen bg-slate-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-4">╤А╤Я╨ЛтА░ ╨атАЭ╨а╤Х╨а┬▒╨б╨В╨а╤Х ╨а╤Ч╨а╤Х╨а┬╢╨а┬░╨а┬╗╨а╤Х╨а╨Ж╨а┬░╨бтАЪ╨б╨К, {identity.username}!</h1>
            <p className="text-slate-400">Identity ╨б╨Г╨а╤Х╨а┬╖╨а╥С╨а┬░╨а╨Е╨а┬░ ╨б╤У╨б╨Г╨а╤Ч╨а┬╡╨бтВм╨а╨Е╨а╤Х. Phase 9.5 minimal version.</p>
            <button
              onClick={() => {
                localStorage.removeItem('piligrim-identity');
                setIdentity(null);
              }}
              className="mt-4 px-4 py-2 bg-red-600 rounded"
            >
              ╨атАЩ╨бтА╣╨атДЦ╨бтАЪ╨а╤С
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

    
  // v3.0 Phase 5: handleRestore ╤З╨╡╤А╨╡╨╖ LoginPage (BIP39)
  const handleRestoreFromLoginPage = async (payload: { words: string[]; isBIP39: boolean }) => {
    logger.info('[PILIGRIM] LoginPage restore triggered, BIP39=', payload.isBIP39);
    try {
      // ╨Я╨╛╨╗╤Г╤З╨░╨╡╨╝ encryptedKeyPair ╨╕╨╖ localStorage (multi-device flow)
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

      // ╨Т╤Л╨╖╤Л╨▓╨░╨╡╨╝ cryptoService.restoreIdentityFromSeed
      const restored = await restoreIdentityFromSeed(payload.words, encryptedKeyPair);

      logger.info(`[PILIGRIM] Restored identity: uid=${restored.uid}, isBIP39=${restored.isBIP39}`);

      // Phase 1 fix: ensure transport keys exist for restored identity
      apiService.initKeys(restored.uid);
      restored.transportPublicKey = apiService.getTransportPublicKey();

      // ╨б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╨▓ localStorage ╨╕ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╡╨╝ state
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(restored));
      } catch (e) {
        logger.error('[PILIGRIM] Failed to save restored identity:', e);
      }
      setIdentity(restored);
    } catch (err) {
      logger.error('[PILIGRIM] LoginPage restore failed:', err);
      // Error ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨▓ state LoginPage ╤З╨╡╤А╨╡╨╖ ╨╡╤С own error handling
    }
  };

  // v3.0 Neuro-Minimalist LoginPage: ╨╡╨┤╨╕╨╜╨░╤П ╤В╨╛╤З╨║╨░ ╨▓╤Е╨╛╨┤╨░ (Login / Register / Restore)
  // LoginPage ╤Б╨░╨╝╨░ ╨┐╨╡╤А╨╡╨║╨╗╤О╤З╨░╨╡╤В mode ╨╝╨╡╨╢╨┤╤Г login/register/restore.
  // Register тЖТ handleCreateIdentity (BIP39 generation + SeedPhraseModal).
  // Restore тЖТ handleRestoreFromLoginPage (multi-device flow ╤Б encryptedKeyPair).
  // Login тЖТ handleCreateIdentity stub (╨│╨╕╨▒╤А╨╕╨┤╨╜╤Л╨╣ ╤А╨╡╨╢╨╕╨╝, ╨┤╨╗╤П ╤Б╤Г╤Й╨╡╤Б╤В╨▓╤Г╤О╤Й╨╕╤Е identity).
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
  // On RT9 (800x1280) -> tablet тАФ two-column 30%/70% layout.
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
          title={language === 'ru' ? 'Switch to English' : '╨Я╨╡╤А╨╡╨║╨╗╤О╤З╨╕╤В╤М ╨╜╨░ ╤А╤Г╤Б╤Б╨║╨╕╨╣'}
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
          {language === 'ru' ? 'ЁЯЗ╖ЁЯЗ║ RU' : 'ЁЯЗмЁЯЗз EN'}
        </button>
      </div>
      {/* Stage 5: ╨а╤С╨а╨Е╨а╥С╨а╤С╨а╤Ф╨а┬░╨бтАЪ╨а╤Х╨б╨В ╨б╨Г╨бтАЪ╨а┬░╨бтАЪ╨б╤У╨б╨Г╨а┬░ WebSocket (╨а╤Ч╨б╨В╨а┬░╨а╨Ж╨бтА╣╨атДЦ ╨а╨Ж╨а┬╡╨б╨В╨бтАж╨а╨Е╨а╤С╨атДЦ ╨б╤У╨а╤Ц╨а╤Х╨а┬╗) */}
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
          {wsStatus === 'open' && 'ЁЯЯв Online'}
          {wsStatus === 'connecting' && 'ЁЯЯб ╨Я╨╛╨┤╨║╨╗╤О╤З╨╡╨╜╨╕╨╡тАж'}
          {wsStatus === 'closed' && 'тЪк Offline'}
          {wsStatus === 'error' && 'ЁЯФ┤ ╨Ю╤И╨╕╨▒╨║╨░'}
          {wsStatus === 'unsupported' && 'тЪк ╨Э╨╡ ╨┐╨╛╨┤╨┤╨╡╤А╨╢╨╕╨▓╨░╨╡╤В╤Б╤П'}
        </span>
      </div>

      {/* v3.0 Phase 2B-1: ResponsiveShell - 3 breakpoints (mobile/tablet/desktop) */}
      {activeTab === 'chats' && (
      <ResponsiveShell
        leftPanel={
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Phase 2B-2: LeftAppBar тАФ burger + "╨з╨░╤В╤Л" + search */}
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
            {/* Phase 2B-2: RightAppBar тАФ avatar + name + status + 3 icons */}
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
              // v3.0 Phase 2H: ╨║╨╗╨╕╨║ ╨┐╨╛ ╨░╨▓╨░╤В╨░╤А╤Г/╨╕╨╝╨╡╨╜╨╕ ╨╛╤В╨║╤А╤Л╨▓╨░╨╡╤В 3rd profile panel
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
                    ╨Ф╨╛╨▒╤А╨╛ ╨┐╨╛╨╢╨░╨╗╨╛╨▓╨░╤В╤М ╨▓ PILIGRIM
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: '280px', textAlign: 'center', margin: '0 0 24px' }}>
                    ╨Т╤Л╨▒╨╡╤А╨╕╤В╨╡ ╨║╨╛╨╜╤В╨░╨║╤В ╤Б╨╗╨╡╨▓╨░ ╨╕╨╗╨╕ ╨┤╨╛╨▒╨░╨▓╤М╤В╨╡ ╨╜╨╛╨▓╤Л╨╣ ╤Б ╨┐╨╛╨╝╨╛╤Й╤М╤О <strong>+</strong>
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
              // v3.0 Phase 2C: FAB ╨╛╤В╨║╤А╤Л╨▓╨░╨╡╤В AddContactModal ╤З╨╡╤А╨╡╨╖ ╨║╨░╤Б╤В╨╛╨╝╨╜╨╛╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╨╡,
              // ╨║╨╛╤В╨╛╤А╨╛╨╡ ╤Б╨╗╤Г╤И╨░╨╡╤В ContactList (╨╛╨╜ ╨▓╨╗╨░╨┤╨╡╨╡╤В ╨╝╨╛╨┤╨░╨╗╨║╨╛╨╣ ╨▓╨╜╤Г╤В╤А╨╕ ╤Б╨╡╨▒╤П)
              window.dispatchEvent(new CustomEvent('piligrim:open-add-contact'));
              logger.info('[PILIGRIM] FAB clicked: requested AddContactModal open');
            }}
          />
        }
        // v3.0 Phase 2G: mobile floating circle nav (╨╖╨░╨╝╨╡╨╜╤П╨╡╤В tabBar ╨╜╨░ тЙд640px)
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
        // v3.0 Phase 2H: desktop joystick (╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ ╤Б╨╗╨╡╨▓╨░)
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
        // v3.0 Phase 2H: 3rd panel on desktop тАФ ╨╛╤В╨║╤А╤Л╨▓╨░╨╡╤В╤Б╤П ╨┐╨╛ ╨║╨╗╨╕╨║╤Г ╨╜╨░ ╨░╨▓╨░╤В╨░╤А ╨▓ RightAppBar
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

      {/* v3.0 Phase 2C: ╨▓╨║╨╗╨░╨┤╨║╨░ ╨Ч╨▓╨╛╨╜╨║╨╕ тАФ CallsHistoryView ╤Б demo ╨┤╨░╨╜╨╜╤Л╨╝╨╕ */}
      {activeTab === 'calls' && (
        <CallsHistoryView onViewChange={setActiveTab} />
      )}

      {/* v3.0 Phase 2C: ╨▓╨║╨╗╨░╨┤╨║╨░ ╨Ш╨╖╨▒╤А╨░╨╜╨╜╨╛╨╡ тАФ ╤В╨╛╨╗╤М╨║╨╛ verified ╨║╨╛╨╜╤В╨░╨║╤В╤Л */}
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

      {/* Telegram-like: ╨▓╨║╨╗╨░╨┤╨║╨░ ╨Ъ╨░╨╜╨░╨╗╤Л */}
      {activeTab === 'channels' && (
        <ChannelsView />
      )}

      {/* Batch 4: ╨а╤Ш╨а╤Х╨а╥С╨а┬░╨а┬╗╨а╤Ф╨а┬░ ╨а╨Ж╨а┬╡╨б╨В╨а╤С╨бтАЮ╨а╤С╨а╤Ф╨а┬░╨бтАа╨а╤С╨а╤С ╨а╤Ф╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ╨а┬░ */}
      {showVerifyModal && selectedChatId && (() => {
        const partner = contacts.find((c) => c.id === selectedChatId || c.uid === selectedChatId);
        return (
          <VerifyModal
            partnerName={partner?.name || '╨а╤Щ╨а╤Х╨а╨Е╨бтАЪ╨а┬░╨а╤Ф╨бтАЪ'}
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

      {/* v3.0 Phase 2D: Drawer (╨▒╨╛╨║╨╛╨▓╨░╤П ╤И╤В╨╛╤А╨░ ╨┐╤А╨╛╤Д╨╕╨╗╤П + QR-╨║╨╛╨┤) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        identity={identity}
        lang={language}
        onToggleLang={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
        // v3.0 Phase 2F: ╨░╨║╤В╨╕╨▓╨╜╨░╤П ╨▓╨║╨╗╨░╨┤╨║╨░ ╨┤╨╗╤П ╨╕╨╜╨┤╨╕╨║╨░╤В╨╛╤А╨░ ╨▓ Drawer
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

      {/* v3.0 Security Dashboard: AccountPage (╨Э╨░╤Б╤В╤А╨╛╨╣╨║╨╕ тЖТ ╨Р╨║╨║╨░╤Г╨╜╤В) */}
      {identity && showAccountPage && (
        <AccountPage
          user={{
            name: identity.username || '╨Я╨╕╨╗╨╕╨│╤А╨╕╨╝',
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
        onContactSelect={(uid: string) => {
          setIsSearchOpen(false);
          setActiveTab('chats');
          setSelectedChatId(uid);
        }}
      />

      {/* v3.0 Logout: ╨╝╨╛╨┤╨░╨╗╨║╨░ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╤П ╨▓╤Л╤Е╨╛╨┤╨░ (╨▓╤Л╨╖╤Л╨▓╨░╨╡╤В╤Б╤П ╨╕╨╖ RightAppBar тЛо) */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        identityUid={identity?.uid}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />

      {/* v3.0 Phase 1: theme indicator (╨┐╤А╨░╨▓╤Л╨╣ ╨╜╨╕╨╢╨╜╨╕╨╣ ╤Г╨│╨╛╨╗) */}
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
        title="╨Р╨┤╨░╨┐╤В╨╕╨▓╨╜╨░╤П ╤В╨╡╨╝╨░ ╨┐╨╛ ╨▓╤А╨╡╨╝╨╡╨╜╨╕ ╤Б╤Г╤В╨╛╨║"
        aria-label="╨в╨╡╨║╤Г╤Й╨░╤П ╤В╨╡╨╝╨░"
      >
        {theme === 'morning' && 'ЁЯМЕ ╨г╤В╤А╨╛'}
        {theme === 'day' && 'тШАя╕П ╨Ф╨╡╨╜╤М'}
        {theme === 'evening' && 'ЁЯМЖ ╨Т╨╡╤З╨╡╤А'}
        {theme === 'night' && 'ЁЯМЩ ╨Э╨╛╤З╤М'}
      </div>

      {/* WebRTC CallModal: ╤А╨╡╨╜╨┤╨╡╤А╨╕╤В╤Б╤П ╨┐╤А╨╕ callState !== 'idle' */}
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
            return target?.name || '╨Ъ╨╛╨╜╤В╨░╨║╤В';
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

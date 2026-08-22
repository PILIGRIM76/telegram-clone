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

  // Main app content (authenticated view)
  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <div className="flex justify-between items-center p-4 bg-slate-800">
        <h1 className="text-2xl">AntiPiry - Telegram Clone Secure</h1>
        <div className="flex items-center space-x-2 text-sm">
          <span className="font-mono">{statusText}</span>
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-blue-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
        </div>
      </div>
      <button onClick={handleLogout} className="m-4 p-2 bg-red-500 rounded">Logout</button>
    </div>
  );
};

export default App;

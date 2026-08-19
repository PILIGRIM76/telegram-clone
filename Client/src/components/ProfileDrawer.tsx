
import React, { useState, useEffect } from 'react';
import type { Identity } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { BellIcon } from './icons/BellIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { useTranslation } from '../contexts/LanguageContext';
import { apiService } from '../services/apiService';

interface ProfileDrawerProps {
  identity: Identity;
  onClose: () => void;
  globalMuteUntil: number | 'forever' | null;
  setGlobalMuteUntil: (until: number | 'forever' | null) => void;
  onReset: () => void;
  onUpdateProfile: (name: string, avatar: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ 
    identity, 
    onClose, 
    globalMuteUntil, 
    setGlobalMuteUntil,
    onReset,
    onUpdateProfile,
    theme,
    setTheme
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(identity.username || '');
  
  // Update Logic
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [appVersion, setAppVersion] = useState('...');

  useEffect(() => {
      // Check for updates when drawer opens
      apiService.checkSystemUpdate()
        .then(res => {
            setUpdateAvailable(res.hasUpdate);
            setAppVersion(res.version);
        })
        .catch(() => setAppVersion('Unknown'));
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const setMute = (duration: number | 'forever' | null) => {
    let until: number | 'forever' | null = null;
    if (duration) {
      until = duration === 'forever' ? 'forever' : Date.now() + duration;
    }
    setGlobalMuteUntil(until);
  };
  
  const saveProfile = () => {
      onUpdateProfile(name, identity.avatar || '');
      alert('Profile updated');
  }

  const handleUpdate = async () => {
      if (!confirm('Download latest version from GitHub? Application will refresh.')) return;
      setIsUpdating(true);
      try {
          const res = await apiService.triggerSystemUpdate();
          alert(res.message);
          window.location.reload();
      } catch (e: any) {
          alert('Update failed: ' + e.message);
      } finally {
          setIsUpdating(false);
      }
  };

  const now = Date.now();
  const isMuted = globalMuteUntil === 'forever' || (typeof globalMuteUntil === 'number' && globalMuteUntil > now);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40" onClick={onClose}></div>
      <div className="fixed top-0 left-0 right-0 bg-slate-800 shadow-2xl rounded-b-2xl z-50 animate-slide-down border-b border-slate-700">
        <div className="p-4 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center text-4xl font-bold text-cyan-400">
              {identity.avatar || identity.uid.charAt(4).toUpperCase()}
            </div>
          </div>
          
          <div className="flex justify-between border-b border-slate-700 mb-4 overflow-x-auto">
            <button onClick={() => setActiveTab('profile')} className={`px-3 py-2 text-xs font-medium ${activeTab === 'profile' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
                <UserCircleIcon className="w-4 h-4 mx-auto mb-1"/> Profile
            </button>
            <button onClick={() => setActiveTab('appearance')} className={`px-3 py-2 text-xs font-medium ${activeTab === 'appearance' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'} relative`}>
                <PaintBrushIcon className="w-4 h-4 mx-auto mb-1"/> 
                System
                {updateAvailable && <span className="absolute top-1 right-2 w-2 h-2 bg-green-500 rounded-full"></span>}
            </button>
            <button onClick={() => setActiveTab('notifications')} className={`px-3 py-2 text-xs font-medium ${activeTab === 'notifications' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
                <BellIcon className="w-4 h-4 mx-auto mb-1"/> Notifications
            </button>
            <button onClick={() => setActiveTab('security')} className={`px-3 py-2 text-xs font-medium ${activeTab === 'security' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
                <ExclamationTriangleIcon className="w-4 h-4 mx-auto mb-1"/> Security
            </button>
          </div>

          {activeTab === 'profile' && (
             <div className="space-y-4 text-sm">
                <div>
                    <label className="text-slate-500">Your Name (visible to you)</label>
                    <div className="flex space-x-2 mt-1">
                        <input className="flex-1 bg-slate-700 p-2 rounded text-white" value={name} onChange={e => setName(e.target.value)} placeholder="Anonymous"/>
                        <button onClick={saveProfile} className="bg-cyan-600 px-3 rounded text-white">OK</button>
                    </div>
                </div>
                <div>
                  <label className="text-slate-500">Your UID</label>
                   <div className="relative flex items-center bg-slate-700 p-2 rounded-md mt-1">
                      <p className="text-xs text-cyan-300 truncate font-mono flex-1 pr-10">{identity.uid}</p>
                      <button onClick={() => handleCopy(identity.uid)} className="absolute right-1 p-2 rounded-md hover:bg-slate-600">
                        {copied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5 text-slate-400" />}
                      </button>
                   </div>
                </div>
            </div>
          )}

          {activeTab === 'appearance' && (
              <div className="space-y-6">
                  <div>
                      <p className="text-slate-400 text-sm text-center mb-2">Theme</p>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setTheme('light')} className={`p-3 rounded border flex flex-col items-center ${theme === 'light' ? 'bg-slate-200 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
                              <SunIcon className={`w-6 h-6 mb-1 ${theme === 'light' ? 'text-orange-500' : 'text-slate-400'}`} />
                              <span className={`text-xs ${theme === 'light' ? 'text-slate-900' : 'text-slate-300'}`}>Light</span>
                          </button>
                          <button onClick={() => setTheme('dark')} className={`p-3 rounded border flex flex-col items-center ${theme === 'dark' ? 'bg-slate-900 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
                              <MoonIcon className={`w-6 h-6 mb-1 ${theme === 'dark' ? 'text-cyan-400' : 'text-slate-400'}`} />
                              <span className="text-white">Dark</span>
                          </button>
                      </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                      <div className="flex justify-between items-center mb-2">
                          <p className="text-slate-400 text-sm">System Update (v{appVersion})</p>
                          {updateAvailable && <span className="text-green-400 text-xs font-bold animate-pulse">Update Available</span>}
                      </div>
                      <p className="text-slate-500 text-xs mb-3">{t('update_desc')}</p>
                      <button 
                        onClick={handleUpdate} 
                        disabled={isUpdating}
                        className={`w-full p-3 border rounded flex items-center justify-center transition-colors ${
                            updateAvailable 
                                ? 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/40' 
                                : 'bg-indigo-900/50 border-indigo-500 text-indigo-200 hover:bg-indigo-900'
                        }`}
                      >
                          {isUpdating ? t('updating') : (updateAvailable ? 'Update Now' : 'Check for Updates')}
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3 text-sm">
               {isMuted ? (
                 <div className="text-center p-3 bg-slate-700 rounded-md">
                   <p className="text-yellow-300">Notifications muted</p>
                   <button onClick={() => setMute(null)} className="mt-2 text-cyan-400 font-semibold hover:underline">Unmute</button>
                 </div>
               ) : (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMute(3600 * 1000)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-200">1 hour</button>
                    <button onClick={() => setMute(8 * 3600 * 1000)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-200">8 hours</button>
                    <button onClick={() => setMute('forever')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-200">Forever</button>
                </div>
               )}
            </div>
          )}

          {activeTab === 'security' && (
             <div className="space-y-4 text-sm">
                 <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-200">
                    Keep your recovery key safe.
                 </div>
                 <div className="relative flex items-center bg-slate-700 p-2 rounded-md">
                      <p className="text-xs text-red-400 truncate font-mono flex-1">********************</p>
                      <button onClick={() => handleCopy(identity.privateKey)} className="ml-2">
                        <ClipboardIcon className="w-5 h-5 text-slate-400" />
                      </button>
                 </div>
                 <button onClick={onReset} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-bold">
                     Reset App (Delete Everything)
                 </button>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default ProfileDrawer;

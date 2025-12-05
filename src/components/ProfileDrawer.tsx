
import React, { useState } from 'react';
import type { Identity } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { BellIcon } from './icons/BellIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

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
  const [activeTab, setActiveTab] = useState('profile');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(identity.username || '');

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
            <button onClick={() => setActiveTab('appearance')} className={`px-3 py-2 text-xs font-medium ${activeTab === 'appearance' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
                <PaintBrushIcon className="w-4 h-4 mx-auto mb-1"/> Appearance
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
              <div className="space-y-4">
                  <p className="text-slate-400 text-sm text-center">Select theme</p>
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setTheme('light')} className={`p-4 rounded border flex flex-col items-center ${theme === 'light' ? 'bg-slate-200 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
                          <SunIcon className={`w-8 h-8 mb-2 ${theme === 'light' ? 'text-orange-500' : 'text-slate-400'}`} />
                          <span className={theme === 'light' ? 'text-slate-900' : 'text-slate-300'}>Light</span>
                      </button>
                      <button onClick={() => setTheme('dark')} className={`p-4 rounded border flex flex-col items-center ${theme === 'dark' ? 'bg-slate-900 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
                          <MoonIcon className={`w-8 h-8 mb-2 ${theme === 'dark' ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span className="text-white">Dark</span>
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

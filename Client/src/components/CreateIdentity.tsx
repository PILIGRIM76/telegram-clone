
import React, { useState } from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { useTranslation } from '../contexts/LanguageContext';
import type { Identity } from '../types';
import { apiService } from '../services/apiService';

interface CreateIdentityProps {
  onAuth: (identity?: Identity) => void;
}

const CreateIdentity: React.FC<CreateIdentityProps> = ({ onAuth }) => {
  const { t } = useTranslation();
  const [isImportMode, setIsImportMode] = useState(false);
  const [importString, setImportString] = useState('');
  const [error, setError] = useState('');
  
  // Server Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [serverIp, setServerIp] = useState(apiService.getBaseUrl().replace('http://', '').replace(':8080', ''));

  const handleCreate = () => {
      onAuth(); // No argument means create new
  };

  const handleImport = () => {
      try {
          const identity = JSON.parse(importString) as Identity;
          if (!identity.uid || !identity.privateKey || !identity.publicKey) {
              throw new Error('Missing fields');
          }
          setError('');
          onAuth(identity); // Pass imported identity
      } catch (e) {
          setError(t('invalid_key'));
      }
  };

  const saveServerSettings = () => {
      if (serverIp) {
          apiService.setServerUrl(serverIp);
          window.location.reload();
      }
  };

  if (isSettingsOpen) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="max-w-md w-full p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg text-center border border-slate-700">
                <h2 className="text-2xl font-bold text-white">{t('server_settings')}</h2>
                <div className="text-left">
                    <label className="text-sm text-slate-400 mb-1 block">{t('server_ip_label')}</label>
                    <input 
                        value={serverIp}
                        onChange={e => setServerIp(e.target.value)}
                        placeholder={t('server_ip_placeholder')}
                        className="w-full bg-slate-900 p-3 rounded text-white border border-slate-600 focus:border-cyan-500 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">Current default: 192.168.100.3</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="flex-1 py-3 bg-slate-700 text-white rounded hover:bg-slate-600"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={saveServerSettings}
                        className="flex-1 py-3 bg-cyan-600 text-white rounded hover:bg-cyan-700"
                    >
                        {t('save_reload')}
                    </button>
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 relative">
      
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
        title="Server Settings"
      >
          <SettingsIcon className="w-6 h-6" />
      </button>

      <div className="max-w-md w-full p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg text-center border border-slate-700">
        <div className="flex justify-center">
          <ShieldCheckIcon className="w-16 h-16 text-cyan-400" />
        </div>
        
        {!isImportMode ? (
            <>
                <h1 className="text-3xl font-bold text-white">{t('welcome_title')}</h1>
                <p className="text-slate-400">
                  {t('welcome_desc')}
                </p>
                <div className="p-4 bg-yellow-900/50 border border-yellow-600 rounded-md text-yellow-200 text-sm">
                    {t('backup_warning')}
                </div>
                <div className="space-y-3 pt-4">
                    <button
                      onClick={handleCreate}
                      className="w-full px-4 py-3 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-900/50"
                    >
                      {t('create_identity_btn')}
                    </button>
                    <button
                      onClick={() => setIsImportMode(true)}
                      className="w-full px-4 py-3 font-semibold text-slate-300 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors border border-slate-600"
                    >
                      {t('login_btn')}
                    </button>
                    
                    {/* Development Mode - Free Entry */}
                    <div className="pt-4 border-t border-slate-700">
                        <p className="text-xs text-slate-500 mb-2">Режим разработки</p>
                        <div className="space-y-2">
                            <button
                              onClick={() => {
                                  console.log('Simple dev login clicked');
                                  onAuth();
                              }}
                              className="w-full px-4 py-2 text-sm font-semibold text-yellow-300 bg-yellow-900/30 rounded-md hover:bg-yellow-900/50 transition-colors border border-yellow-700/50"
                            >
                              🔧 Быстрый вход (dev)
                            </button>
                            
                            <button
                              onClick={() => {
                                  // Pre-filled import for testing
                                  setImportString('{"uid":"test_user_123","publicKey":"pub_test_key","privateKey":"priv_test_key","username":"Test User","keyFingerprint":"TEST1234"}');
                                  setIsImportMode(true);
                              }}
                              className="w-full px-4 py-2 text-sm font-semibold text-blue-300 bg-blue-900/30 rounded-md hover:bg-blue-900/50 transition-colors border border-blue-700/50"
                            >
                              🧪 Тестовая личность
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Только для тестирования</p>
                    </div>
                </div>
            </>
        ) : (
            <>
                <h1 className="text-2xl font-bold text-white">{t('import_title')}</h1>
                <p className="text-slate-400 text-sm">
                  {t('import_desc')}
                </p>
                
                <textarea 
                    value={importString}
                    onChange={(e) => setImportString(e.target.value)}
                    placeholder={t('import_placeholder')}
                    className="w-full h-32 bg-slate-900 p-3 rounded-md text-cyan-300 font-mono text-xs border border-slate-600 focus:border-cyan-500 outline-none resize-none"
                />
                
                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="space-y-3 pt-2">
                    <button
                      onClick={handleImport}
                      className="w-full px-4 py-3 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-lg"
                    >
                      {t('import_submit')}
                    </button>
                    <button
                      onClick={() => { setIsImportMode(false); setError(''); setImportString(''); }}
                      className="w-full px-4 py-3 font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      {t('back_to_create')}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default CreateIdentity;
